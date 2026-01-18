import os
from typing import List
import google.generativeai as genai
import fitz  # PyMuPDF
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize embedding model (free and runs locally!)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file using PyMuPDF (fitz)"""
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error extracting text from PDF {file_path}: {e}")
        return ""
    return text

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    doc = docx.Document(file_path)
    text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    return text

def extract_text_from_txt(file_path: str) -> str:
    """Extract text from TXT file"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text based on file type"""
    if file_type == 'application/pdf':
        return extract_text_from_pdf(file_path)
    elif 'wordprocessingml' in file_type:
        return extract_text_from_docx(file_path)
    elif 'text/plain' in file_type:
        return extract_text_from_txt(file_path)
    else:
        # Return empty string for unsupported types instead of crashing
        return ""

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """Split text into chunks using LangChain's text splitter"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_text(text)

def create_embedding(text: str) -> List[float]:
    """Create embedding using sentence-transformers"""
    embedding = embedding_model.encode(text)
    return embedding.tolist()

def cosine_similarity_search(query_embedding: List[float], db, limit: int = 5):
    """
    Search for similar chunks using cosine similarity.
    CRITICAL: This performs a JOIN to exclude chunks from deleted documents.
    """
    from sqlalchemy import text
    
    # Convert list to string format for pgvector
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
    
    # Query joins document_chunks with documents to check is_deleted status
    query = text(f"""
        SELECT dc.id, dc.document_id, dc.chunk_text, dc.chunk_index,
               1 - (dc.embedding <=> '{embedding_str}'::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE (d.is_deleted IS FALSE OR d.is_deleted IS NULL)
        ORDER BY dc.embedding <=> '{embedding_str}'::vector
        LIMIT {limit}
    """)
    
    results = db.execute(query).fetchall()
    return results

def generate_response_with_gemini(prompt: str) -> str:
    """Generate response using Google Gemini"""
    # Use gemini-2.5-flash (free and fast)
    model = genai.GenerativeModel('models/gemini-2.5-flash')
    response = model.generate_content(prompt)
    return response.text