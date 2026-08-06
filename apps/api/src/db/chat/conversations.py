from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlmodel import Column, Field, Integer, SQLModel


class ConversationBase(SQLModel):
    org_id: int = Field(foreign_key="organization.id", ondelete="CASCADE")
    participant_one_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    participant_two_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    last_message_at: datetime | None = None
    is_archived: bool = False


class Conversation(ConversationBase, table=True):
    __tablename__ = "conversation"

    id: int | None = Field(default=None, primary_key=True)
    conversation_uuid: str = Field(unique=True, index=True)
    archived_by_user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    archived_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "org_id",
            "participant_one_id",
            "participant_two_id",
            name="unique_conversation_pair",
        ),
    )


class ConversationCreate(BaseModel):
    participant_two_id: int  # participant_one is current user


class ConversationRead(ConversationBase):
    id: int
    conversation_uuid: str
    created_at: datetime
    updated_at: datetime
    unread_count: int = 0  # Computed field
    other_participant: dict  # Computed field with user details


class ConversationWithLastMessage(ConversationRead):
    last_message: dict | None = None


class ConversationParticipantState(SQLModel, table=True):
    __tablename__ = "conversation_participant_state"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    is_muted: bool = False
    last_read_message_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("message.id", ondelete="SET NULL")),
    )
    last_read_at: datetime | None = None
    is_typing: bool = False
    typing_updated_at: datetime | None = None
    notification_enabled: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="unique_participant_state"),
    )
