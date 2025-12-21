from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db, engine
from app.db.models import Base, Edge, User, Graph, Node
from app.schemas import (
    UserCreate, UserRead,
    GraphCreate, GraphRead,
    NodeCreate, NodeRead,
    EdgeCreate, EdgeRead
)

app = FastAPI(title="MatsLogic API", version="0.1")
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"app": "MatsLogic API", "status": "ok"}

@app.post("/users/", response_model=UserRead)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(name=user.name, email=user.email)
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

@app.delete("/nodes/{node_id}", status_code=204)
def delete_node(node_id: int, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")

    #delete connected edges first
    db.query(Edge).filter(
        (Edge.from_node_id == node_id) | (Edge.to_node_id == node_id)
    ).delete(synchronize_session=False)

    db.delete(node)
    db.commit()
    return Response(status_code=204)

@app.post("/edges/", response_model=EdgeRead)
def create_edge(edge: EdgeCreate, db: Session = Depends(get_db)):
    #edge creation logic - from one node to another
    #first checking origin and destination nodes exist
    from_node = db.query(Node).filter(Node.id == edge.from_node_id).first()
    if from_node is None:
        raise HTTPException(status_code=404, detail="Origin node not found")
    to_node = db.query(Node).filter(Node.id == edge.to_node_id).first()
    if to_node is None:
        raise HTTPException(status_code=404, detail="Destination node not found")

    #then check both nodes belong on the same graph
    if from_node.graph_id != to_node.graph_id:
        raise HTTPException(status_code=400, detail="Nodes do not belong to the same graph")
    
    #prevent duplicate edges
    existing_edge = db.query(Edge).filter(
        Edge.from_node_id == edge.from_node_id,
        Edge.to_node_id == edge.to_node_id
    ).first()
    if existing_edge:
        raise HTTPException(status_code=409, detail="Edge already exists")

    db_edge = Edge(
        from_node_id=edge.from_node_id,
        to_node_id=edge.to_node_id
    )
    db.add(db_edge)
    db.commit()
    db.refresh(db_edge)

    return db_edge

@app.get("/edges/{edge_id}", response_model=EdgeRead)
def read_edge(edge_id: int, db: Session = Depends(get_db)):
    #get edge by id, return 404 if not found
    db_edge = db.query(Edge).filter(Edge.id == edge_id).first()

    if db_edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    return db_edge

@app.get("/nodes/{node_id}/next", response_model=list[NodeRead])
def get_next_nodes(node_id: int, db: Session = Depends(get_db)):

    #return all nodes directly reachablae (1 step)
    node = db.query(Node).filter(Node.id == node_id).first()
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")

    #outgoing edges
    edges = db.query(Edge).filter(Edge.from_node_id == node_id).all()

    #get destination node ids
    to_node_ids = [edge.to_node_id for edge in edges]
    if not to_node_ids:
        return []
    next_nodes = db.query(Node).filter(Node.id.in_(to_node_ids)).all()

    return next_nodes

@app.delete("/edges/{edge_id}", status_code=204)
def delete_edge(edge_id: int, db: Session = Depends(get_db)):
    edge = db.query(Edge).filter(Edge.id == edge_id).first()
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    db.delete(edge)
    db.commit()
    return Response(status_code=204)

#LIST ENDPOINTS
@app.get("/users/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return db.query(User).order_by(User.id).offset(offset).limit(limit).all()

@app.get("/graphs/", response_model=list[GraphRead])
def list_graphs(
    db: Session = Depends(get_db),
    user_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Graph)
    if user_id is not None:
        q = q.filter(Graph.user_id == user_id)
    return q.order_by(Graph.id).offset(offset).limit(limit).all()

@app.get("/nodes/", response_model=list[NodeRead])
def list_nodes(
    db: Session = Depends(get_db),
    graph_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(Node)
    if graph_id is not None:
        q = q.filter(Node.graph_id == graph_id)
    return q.order_by(Node.id).offset(offset).limit(limit).all()

@app.get("/edges/", response_model=list[EdgeRead]) #edges do not have a direct graph_id, so we filter via nodes
def list_edges(
    db: Session = Depends(get_db),
    graph_id: int | None = Query(None),
    from_node_id: int | None = Query(None),
    to_node_id: int | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    q = db.query(Edge)

    if from_node_id is not None:
        q = q.filter(Edge.from_node_id == from_node_id)
    if to_node_id is not None:
        q = q.filter(Edge.to_node_id == to_node_id)

    if graph_id is not None:
        q = q.join(Node, Edge.from_node_id == Node.id).filter(Node.graph_id == graph_id)

    return q.order_by(Edge.id).offset(offset).limit(limit).all()


