from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, ARRAY,Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector
from .database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(255))
    file_size = Column(Integer)
    upload_date = Column(DateTime, default=datetime.utcnow)
    content = Column(Text)
    
    # NEW FIELDS
    is_starred = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768))  # sentence-transformers dimension
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="chunks")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_message = Column(Text, nullable=False)
    assistant_message = Column(Text, nullable=False)
    sources = Column(ARRAY(String))
    created_at = Column(DateTime, default=datetime.utcnow)