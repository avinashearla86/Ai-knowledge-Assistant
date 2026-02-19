import os
from typing import List
from google import genai
import fitz
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fastembed import TextEmbedding
from dotenv import load_dotenv

load_dotenv()

# 1. Chat Client (Google is still fine for text generation)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 2. Local Embedding Model (Bypasses Google's broken 404 API)
# This uses ONNX, so it WILL NOT crash Render's memory!
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])

def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def extract_text_from_file(file_path: str, file_type: str) -> str:
    if file_type == 'application/pdf':
        return extract_text_from_pdf(file_path)
    elif 'wordprocessingml' in file_type:
        return extract_text_from_docx(file_path)
    elif 'text/plain' in file_type:
        return extract_text_from_txt(file_path)
    return ""

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_text(text)

def create_embedding(text: str) -> List[float]:
    """Generates 384-dimension vectors locally, avoiding Google 404 errors"""
    try:
        # FastEmbed requires a list of strings and returns a generator
        embeddings_generator = embedding_model.embed([text])
        embedding_list = list(embeddings_generator)[0].tolist()
        print(f"✅ Local Embedding success: {len(embedding_list)} dims")
        return embedding_list
    except Exception as e:
        print(f"❌ Local Embedding failed: {e}")
        raise Exception(f"Embedding failed: {str(e)}")

def cosine_similarity_search(query_embedding: List[float], db, limit: int = 5):
    from sqlalchemy import text
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
    query = text(f"""
        SELECT dc.id, dc.document_id, dc.chunk_text, dc.chunk_index,
               1 - (dc.embedding <=> '{embedding_str}'::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE (d.is_deleted IS FALSE OR d.is_deleted IS NULL)
        ORDER BY dc.embedding <=> '{embedding_str}'::vector
        LIMIT {limit}
    """)
    return db.execute(query).fetchall()

def generate_response_with_gemini(prompt: str) -> str:
    """Chat requests still go to Google, which works fine."""
    models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"Quota exhausted for {model_name}, trying next...")
                continue
            if "404" in str(e):
                continue
            raise e
    return "I am currently at my free tier capacity. Please wait a few minutes before trying again."