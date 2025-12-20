from pydantic import BaseModel

class UserCreate(BaseModel):
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