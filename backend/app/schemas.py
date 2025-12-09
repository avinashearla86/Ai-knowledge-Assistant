from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None

class DocumentCreate(DocumentBase):
    content: str

class DocumentResponse(DocumentBase):
    id: int
    upload_date: datetime
    chunk_count: int = 0
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    user_message: str
    assistant_message: str
    sources: List[str] = []
    
class ChatHistoryResponse(BaseModel):
    id: int
    user_message: str
    assistant_message: str
    sources: List[str]
    created_at: datetime
    
    class Config:
        from_attributes = True