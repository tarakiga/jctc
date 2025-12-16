from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.intelligence import IntelCategory, IntelPriority, IntelStatus

# --- Shared Base Models ---

class IntelTagBase(BaseModel):
    tag: str

class IntelTagCreate(IntelTagBase):
    pass

class IntelTag(IntelTagBase):
    id: UUID
    record_id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class IntelCaseLinkBase(BaseModel):
    case_id: UUID

class IntelCaseLinkCreate(IntelCaseLinkBase):
    pass

class IntelCaseLink(IntelCaseLinkBase):
    id: UUID
    record_id: UUID
    created_at: datetime
    
    # We might want deeper case info later, but for now ID is base
    
    model_config = ConfigDict(from_attributes=True)


class IntelAttachmentBase(BaseModel):
    file_name: str
    file_size: Optional[str] = None
    file_type: Optional[str] = None
    s3_key: Optional[str] = None

class IntelAttachmentCreate(IntelAttachmentBase):
    pass

class IntelAttachment(IntelAttachmentBase):
    id: UUID
    record_id: UUID
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# --- Intelligence Record Models ---

class IntelRecordBase(BaseModel):
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    category: IntelCategory = IntelCategory.OTHER
    priority: IntelPriority = IntelPriority.MEDIUM
    status: IntelStatus = IntelStatus.RAW
    is_confidential: bool = False

class IntelRecordCreate(IntelRecordBase):
    tags: List[str] = [] # List of tag strings to create
    # Attachments usually handled separately via upload, or could be initial metadata

class IntelRecordUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    category: Optional[IntelCategory] = None
    priority: Optional[IntelPriority] = None
    status: Optional[IntelStatus] = None
    is_confidential: Optional[bool] = None
    tags: Optional[List[str]] = None # If provided, replaces all tags? Or add/remove logic? simple replace is easiest for now.

class IntelRecord(IntelRecordBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_id: Optional[UUID] = None
    
    # Nested relations
    tags: List[IntelTag] = []
    attachments: List[IntelAttachment] = []
    case_links: List[IntelCaseLink] = []
    
    author_name: Optional[str] = None # Helper if we want to resolve it

    model_config = ConfigDict(from_attributes=True)


class IntelRecordList(BaseModel):
    total: int
    items: List[IntelRecord]
