from pydantic import BaseModel

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

class EdgeRead(BaseModel):
    id: int
    from_node_id: int
    to_node_id: int
    
    class Config:
        orm_mode = True