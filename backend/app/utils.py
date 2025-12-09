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
        doc = fitz.open(file_path)  # Open the document
        for page in doc:  # Iterate through each page
            text += page.get_text()  # Get text from the page
        doc.close()
    except Exception as e:
        print(f"Error extracting text from PDF {file_path}: {e}")
        return ""  # Return empty string on failure
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
    elif file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return extract_text_from_docx(file_path)
    elif file_type == 'text/plain':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """Split text into chunks using LangChain's text splitter"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_text(text)
    return chunks

def create_embedding(text: str) -> List[float]:
    """Create embedding using sentence-transformers (FREE & LOCAL!)"""
    embedding = embedding_model.encode(text)
    return embedding.tolist()

def cosine_similarity_search(query_embedding: List[float], db, limit: int = 5):
    """Search for similar chunks using cosine similarity"""
    from sqlalchemy import text
    from .models import DocumentChunk
    
    # Convert list to string format for pgvector
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
    
    query = text(f"""
        SELECT id, document_id, chunk_text, chunk_index,
               1 - (embedding <=> '{embedding_str}'::vector) as similarity
        FROM document_chunks
        ORDER BY embedding <=> '{embedding_str}'::vector
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