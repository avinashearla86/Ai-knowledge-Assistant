from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
from typing import List
import google.generativeai as genai
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

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
    try:
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
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
                content=text[:1000]  # Store preview
            )
        )
        
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
            chunk_count=len(chunks)
        )
        
    except Exception as e:
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
            chunk_count=len(doc.chunks)
        )
        for doc in documents
    ]

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document"""
    success = crud.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """Handle chat with RAG using Google Gemini - ONLY uses uploaded documents"""
    try:
        # Check if there are any documents
        all_documents = crud.get_documents(db)
        if not all_documents:
            return {
                "user_message": request.message,
                "assistant_message": "Please upload documents first. I can only answer questions based on your uploaded documents.",
                "sources": []
            }
        
        # Create embedding for query
        query_embedding = utils.create_embedding(request.message)
        
        # Search similar chunks - increased limit for better coverage
        similar_chunks = utils.cosine_similarity_search(query_embedding, db, limit=15)
        
        # Build context with very low similarity threshold to catch more results
        context = ""
        sources = []
        
        if similar_chunks:
            # Use even lower threshold (0.01) to include more chunks
            relevant_chunks = [chunk for chunk in similar_chunks if chunk.similarity > 0.01]
            
            if relevant_chunks:
                context = "Context from your uploaded documents:\n\n"
                # Use top 8 most relevant chunks for better coverage
                for chunk in relevant_chunks[:8]:
                    doc = crud.get_document(db, chunk.document_id)
                    context += f"From '{doc.filename}':\n{chunk.chunk_text}\n\n"
                    if doc.filename not in sources:
                        sources.append(doc.filename)
        
        # If still no relevant chunks found, use ALL document content
        if not context:
            context = "Since no specific match was found, here is content from all your uploaded documents:\n\n"
            for doc in all_documents[:3]:  # Use first 3 documents
                context += f"From '{doc.filename}':\n{doc.content}\n\n"
                if doc.filename not in sources:
                    sources.append(doc.filename)
        
        # Create strict prompt for Gemini - MUST use only provided context
        prompt = f"""You are a helpful AI assistant that MUST answer questions ONLY based on the user's uploaded documents.

IMPORTANT RULES:
- You can ONLY use information from the context provided below
- Do NOT use any external knowledge or general information
- If the context doesn't contain enough information to answer the question, say: "I cannot find specific information about that in your uploaded documents. Please upload more relevant documents or rephrase your question."
- Always cite which documents you're referencing

{context}

User Question: {request.message}

Answer based ONLY on the context above:"""
        
        # Get response from Gemini
        assistant_message = utils.generate_response_with_gemini(prompt)
        
        # Save to chat history
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