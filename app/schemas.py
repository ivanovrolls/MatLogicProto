from pydantic import BaseModel
from app.db.models import EdgeType

class UserCreate(BaseModel):
    name: str
    email: str

class UserRead(BaseModel):
    id: int
    email: str
    
    class Config:
        orm_mode = True

class GraphCreate(BaseModel):
    title: str
    user_id: int

class GraphRead(BaseModel):
    id: int
    title: str
    user_id: int
    
    class Config:
        orm_mode = True

class NodeCreate(BaseModel):
    name: str
    graph_id: int

class NodeRead(BaseModel):
    id: int
    name: str
    graph_id: int
    
    class Config:
        orm_mode = True

class EdgeCreate(BaseModel):
    from_node_id: int
    to_node_id: int
    edge_type: EdgeType = EdgeType.POSITIVE
    note: str | None = None   #new optional field

class EdgeRead(BaseModel):
    id: int
    from_node_id: int
    to_node_id: int
    edge_type: EdgeType
    note: str | None          #new optional field

    class Config:
        orm_mode = True

class EdgeUpdate(BaseModel):
    edge_type: EdgeType | None = None
    note: str | None = None
    color: str | None = None
    label: str | None = None

class TechniqueCreate(BaseModel):
    video_url: str | None = None
    steps: str | None = None

class TechniqueUpdate(BaseModel):
    video_url: str | None = None
    steps: str | None = None

class TechniqueRead(BaseModel):
    id: int
    node_id: int
    video_url: str | None
    steps: str | None
    
    class Config:
        orm_mode = True