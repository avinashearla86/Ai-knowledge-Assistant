import os
from typing import List
from google import genai
from google.genai import types  # REQUIRED for API versioning and truncation
import fitz
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

# 1. THE FIX: Force the SDK to use 'v1' instead of the buggy 'v1beta'
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options=types.HttpOptions(api_version="v1")
)

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"Error extracting text from PDF {file_path}: {e}")
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
    try:
        # 2. THE FIX: The ACTUAL correct model name this time
        response = client.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        embedding = response.embeddings[0].values
        print(f"✅ Embedding success: {len(embedding)} dims")
        return embedding
    except Exception as e:
        print(f"❌ Embedding failed: {e}")
        raise Exception(f"Embedding API failed: {str(e)}")

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
                print(f"Model {model_name} not found, skipping...")
                continue
            raise e
    return "I am currently at my free tier capacity. Please wait a few minutes before trying again."