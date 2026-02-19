from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
from typing import List
from dotenv import load_dotenv

from . import models, schemas, crud, utils
from .database import engine, get_db

load_dotenv()

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Knowledge Assistant API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "AI Knowledge Assistant API is running with Google Gemini"}

@app.post("/api/upload", response_model=schemas.DocumentResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a file"""
    document_id = None # Track ID so we can clean it up if it crashes
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text
        text = utils.extract_text_from_file(file_path, file.content_type)
        
        # Create document record
        document = crud.create_document(
            db,
            schemas.DocumentCreate(
                filename=file.filename,
                file_type=file.content_type,
                file_size=os.path.getsize(file_path),
                content=text[:1000]
            )
        )
        document_id = document.id # Document successfully in DB
        
        # Chunk text
        chunks = utils.chunk_text(text)
        
        # Create embeddings and store chunks
        for idx, chunk in enumerate(chunks):
            embedding = utils.create_embedding(chunk)
            crud.create_document_chunk(
                db,
                document_id=document.id,
                chunk_text=chunk,
                chunk_index=idx,
                embedding=embedding
            )
        
        # Clean up file
        os.remove(file_path)
        
        return schemas.DocumentResponse(
            id=document.id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            upload_date=document.upload_date,
            chunk_count=len(chunks),
            is_starred=document.is_starred,
            is_deleted=document.is_deleted
        )
        
    except Exception as e:
        # 🚨 THE FIX: Delete the zombie document if chunks fail to generate
        if document_id:
            crud.delete_document(db, document_id)
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents", response_model=List[schemas.DocumentResponse])
async def get_documents(db: Session = Depends(get_db)):
    """Get all documents"""
    documents = crud.get_documents(db)
    return [
        schemas.DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            upload_date=doc.upload_date,
            chunk_count=len(doc.chunks),
            is_starred=doc.is_starred,
            is_deleted=doc.is_deleted
        )
        for doc in documents
    ]

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document permanently"""
    success = crud.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@app.patch("/api/documents/{document_id}", response_model=schemas.DocumentResponse)
async def update_document(
    document_id: int, 
    updates: schemas.DocumentUpdate, 
    db: Session = Depends(get_db)
):
    """Rename, Star, or Soft Delete/Restore a document"""
    document = crud.update_document(db, document_id, updates)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return schemas.DocumentResponse(
        id=document.id,
        filename=document.filename,
        file_type=document.file_type,
        file_size=document.file_size,
        upload_date=document.upload_date,
        chunk_count=len(document.chunks),
        is_starred=document.is_starred,
        is_deleted=document.is_deleted
    )

@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """Handle chat with RAG - ONLY uses ACTIVE uploaded documents"""
    try:
        raw_documents = crud.get_documents(db)
        active_documents = [doc for doc in raw_documents if not doc.is_deleted]
        
        if not active_documents:
            return {
                "user_message": request.message,
                "assistant_message": "You have no active documents. Please upload or restore documents to chat.",
                "sources": []
            }
        
        query_embedding = utils.create_embedding(request.message)
        similar_chunks = utils.cosine_similarity_search(query_embedding, db, limit=20)
        
        context = ""
        sources = []
        
        if similar_chunks:
            relevant_chunks = [chunk for chunk in similar_chunks if chunk.similarity > 0.005]
            if relevant_chunks:
                context = f"You have exactly {len(active_documents)} active documents available.\n"
                context += "Context from your active documents:\n\n"
                for chunk in relevant_chunks[:10]:
                    doc = crud.get_document(db, chunk.document_id)
                    if doc and not doc.is_deleted:
                        context += f"From '{doc.filename}':\n{chunk.chunk_text}\n\n"
                        if doc.filename not in sources:
                            sources.append(doc.filename)
        
        if not context:
            context = f"You have exactly {len(active_documents)} active documents:\n"
            for i, doc in enumerate(active_documents):
                context += f"{i+1}. {doc.filename}\n"
            context += "\nHere is a preview of their content:\n"
            for doc in active_documents:
                if doc.chunks:
                    chunk_preview = doc.chunks[0].chunk_text[:300]
                    context += f"File '{doc.filename}': {chunk_preview}...\n"
                if doc.filename not in sources:
                    sources.append(doc.filename)
        
        prompt = f"""You are a helpful AI assistant. Answer questions ONLY based on the user's ACTIVE documents.

RULES:
- The user currently has exactly {len(active_documents)} active documents.
- Use ONLY the provided context below.
- Do NOT mention or count documents that are not in this list.
- If asked to list documents, list ONLY the {len(active_documents)} active ones.

CONTEXT:
{context}

User Question: {request.message}

Answer:"""
        
        assistant_message = utils.generate_response_with_gemini(prompt)
        
        crud.save_chat_history(
            db,
            user_message=request.message,
            assistant_message=assistant_message,
            sources=sources
        )
        
        return {
            "user_message": request.message,
            "assistant_message": assistant_message,
            "sources": sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history", response_model=List[schemas.ChatHistoryResponse])
async def get_chat_history(db: Session = Depends(get_db)):
    """Get chat history"""
    return crud.get_chat_history(db)

@app.delete("/api/chat/history")
async def clear_chat_history(db: Session = Depends(get_db)):
    """Clear all chat history"""
    try:
        db.query(models.ChatHistory).delete()
        db.commit()
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)