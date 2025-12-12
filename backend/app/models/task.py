from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, CheckConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class TaskStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    BLOCKED = "BLOCKED"


class Task(BaseModel):
    __tablename__ = "tasks"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    task_template_id = Column(String(255))
    title = Column(String(255))
    description = Column(Text)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_at = Column(DateTime(timezone=True))
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.OPEN)
    priority = Column(Integer, CheckConstraint("priority >= 1 AND priority <= 5"))
    
    # Relationships
    case = relationship("Case", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")


class ActionLog(BaseModel):
    __tablename__ = "actions_log"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(255))
    details = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="actions")
    user = relationship("User", back_populates="actions")