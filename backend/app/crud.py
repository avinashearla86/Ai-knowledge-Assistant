from sqlalchemy.orm import Session
from . import models, schemas
from typing import List

def create_document(db: Session, document: schemas.DocumentCreate) -> models.Document:
    db_document = models.Document(**document.dict())
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

def get_documents(db: Session, skip: int = 0, limit: int = 100) -> List[models.Document]:
    return db.query(models.Document).offset(skip).limit(limit).all()

def get_document(db: Session, document_id: int) -> models.Document:
    return db.query(models.Document).filter(models.Document.id == document_id).first()

def delete_document(db: Session, document_id: int) -> bool:
    document = get_document(db, document_id)
    if document:
        db.delete(document)
        db.commit()
        return True
    return False

def create_document_chunk(
    db: Session,
    document_id: int,
    chunk_text: str,
    chunk_index: int,
    embedding: List[float]
) -> models.DocumentChunk:
    db_chunk = models.DocumentChunk(
        document_id=document_id,
        chunk_text=chunk_text,
        chunk_index=chunk_index,
        embedding=embedding
    )
    db.add(db_chunk)
    db.commit()
    db.refresh(db_chunk)
    return db_chunk

def save_chat_history(
    db: Session,
    user_message: str,
    assistant_message: str,
    sources: List[str]
) -> models.ChatHistory:
    db_chat = models.ChatHistory(
        user_message=user_message,
        assistant_message=assistant_message,
        sources=sources
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

def get_chat_history(db: Session, limit: int = 50) -> List[models.ChatHistory]:
    return db.query(models.ChatHistory).order_by(
        models.ChatHistory.created_at.desc()
    ).limit(limit).all()