from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.db.models import User, Graph, Node
from app.schemas import (
    UserCreate, UserRead,
    GraphCreate, GraphRead,
    NodeCreate, NodeRead,
)

app = FastAPI(title="MatsLogic API", version="0.1")

@app.get("/")
def root():
    return {"app": "MatsLogic API", "status": "ok"}

@app.post("/users/", response_model=UserRead)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserRead)
def read_user(user_id: int, db: Session = Depends(get_db)):
    #get user using user id, return 404 if not found
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/graphs/", response_model=GraphRead)
def create_graph(graph: GraphCreate, db: Session = Depends(get_db)):
    #graph creation logic
    db_graph = Graph(title=graph.title, user_id=graph.user_id)
    db.add(db_graph)
    db.commit()
    db.refresh(db_graph)
    return db_graph

@app.get("/graphs/{graph_id}", response_model=GraphRead)
def read_graph(graph_id: int, db: Session = Depends(get_db)):
    #get graph using graph id, return 404 if not found
    db_graph = db.query(Graph).filter(Graph.id == graph_id).first()
    if not db_graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    return db_graph

@app.post("/nodes/", response_model=NodeRead)
def create_node(node: NodeCreate, db: Session = Depends(get_db)):
    #node creation logic
    db_node = Node(name=node.name, graph_id=node.graph_id)
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@app.get("/nodes/{node_id}", response_model=NodeRead)
def read_node(node_id: int, db: Session = Depends(get_db)):
    #get node using node id, return 404 if not found
    db_node = db.query(Node).filter(Node.id == node_id).first()
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    return db_node