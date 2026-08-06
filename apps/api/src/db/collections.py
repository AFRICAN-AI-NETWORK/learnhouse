
from sqlalchemy import BigInteger, Column, ForeignKey
from sqlmodel import Field, SQLModel


class CollectionBase(SQLModel):
    name: str
    public: bool
    description: str | None = ""


class Collection(CollectionBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    collection_uuid: str = ""
    creation_date: str = ""
    update_date: str = ""


class CollectionCreate(CollectionBase):
    courses: list[int]
    org_id: int = Field(default=None, foreign_key="organization.id")



class CollectionUpdate(CollectionBase):
    courses: list | None
    name: str | None
    public: bool | None
    description: str | None = ""


class CollectionRead(CollectionBase):
    id: int
    courses: list
    collection_uuid: str
    creation_date: str
    update_date: str
