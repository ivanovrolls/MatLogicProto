from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db, engine
from app.db.models import Base, Edge, User, Graph, Node, Technique, EdgeType
from app.schemas import (
    UserCreate, UserRead,
    Token, LoginRequest,
    GraphCreate, GraphRead,
    NodeCreate, NodeRead,
    EdgeCreate, EdgeRead, EdgeUpdate, EdgeType,
    TechniqueCreate, TechniqueRead, TechniqueUpdate
)
from app.security import (
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user,
)

app = FastAPI(title="MatsLogic API", version="0.1")
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"app": "MatsLogic API", "status": "ok"}

@app.post("/users/", response_model=UserRead, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserRead)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #get user using user id, return 404 if not found
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/auth/register", response_model=UserRead, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/auth/token", response_model=Token)
def login_for_token(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/graphs/", response_model=GraphRead)
def create_graph(graph: GraphCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #graph creation logic
    db_graph = Graph(title=graph.title, user_id=current_user.id)
    db.add(db_graph)
    db.commit()
    db.refresh(db_graph)
    return db_graph

@app.get("/graphs/{graph_id}", response_model=GraphRead)
def read_graph(graph_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #get graph using graph id, return 404 if not found
    db_graph = db.query(Graph).filter(Graph.id == graph_id, Graph.user_id == current_user.id).first()
    if not db_graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    return db_graph

@app.post("/nodes/", response_model=NodeRead)
def create_node(node: NodeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #node creation logic
    graph = db.query(Graph).filter(Graph.id == node.graph_id, Graph.user_id == current_user.id).first()
    if graph is None:
        raise HTTPException(status_code=404, detail="Graph not found")
    db_node = Node(name=node.name, graph_id=node.graph_id)
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@app.get("/nodes/{node_id}", response_model=NodeRead)
def read_node(node_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #get node using node id, return 404 if not found
    db_node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    return db_node

@app.delete("/nodes/{node_id}", status_code=204)
def delete_node(node_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")

    #delete technique data associated with this node
    db.query(Technique).filter(Technique.node_id == node_id).delete(synchronize_session=False)

    #delete connected edges first
    db.query(Edge).filter(
        (Edge.from_node_id == node_id) | (Edge.to_node_id == node_id)
    ).delete(synchronize_session=False)

    db.delete(node)
    db.commit()
    return Response(status_code=204)

@app.post("/edges/", response_model=EdgeRead)
def create_edge(edge: EdgeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #edge creation logic - from one node to another
    #first checking origin and destination nodes exist
    from_node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == edge.from_node_id, Graph.user_id == current_user.id)
        .first()
    )
    if from_node is None:
        raise HTTPException(status_code=404, detail="Origin node not found")
    to_node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == edge.to_node_id, Graph.user_id == current_user.id)
        .first()
    )
    if to_node is None:
        raise HTTPException(status_code=404, detail="Destination node not found")

    #then check both nodes belong on the same graph
    if from_node.graph_id != to_node.graph_id:
        raise HTTPException(status_code=400, detail="Nodes do not belong to the same graph")
    
    #prevent duplicate edges with same type
    existing_edge = db.query(Edge).filter(
        Edge.from_node_id == edge.from_node_id,
        Edge.to_node_id == edge.to_node_id,
        Edge.edge_type == edge.edge_type
    ).first()
    if existing_edge:
        raise HTTPException(status_code=409, detail="Edge with this type already exists")

    db_edge = Edge(
        from_node_id=edge.from_node_id,
        to_node_id=edge.to_node_id,
        edge_type=edge.edge_type,
        note=edge.note
    )
    db.add(db_edge)
    db.commit()
    db.refresh(db_edge)

    return db_edge

@app.get("/edges/{edge_id}", response_model=EdgeRead)
def read_edge(edge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #get edge by id, return 404 if not found
    db_edge = (
        db.query(Edge)
        .join(Node, Edge.from_node_id == Node.id)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Edge.id == edge_id, Graph.user_id == current_user.id)
        .first()
    )

    if db_edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    return db_edge

@app.get("/nodes/{node_id}/next", response_model=list[NodeRead])
def get_next_nodes(
    node_id: int, 
    db: Session = Depends(get_db),
    edge_type: EdgeType | None = Query(None, description="filter by edge type"),
    current_user: User = Depends(get_current_user),
):
    #return all nodes directly reachable (1 step)
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")

    #outgoing edges with optional type filter
    q = (
        db.query(Edge)
        .join(Node, Edge.from_node_id == Node.id)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Edge.from_node_id == node_id, Graph.user_id == current_user.id)
    )
    if edge_type is not None:
        q = q.filter(Edge.edge_type == edge_type)
    
    edges = q.all()

    #get destination node ids
    to_node_ids = [edge.to_node_id for edge in edges]
    if not to_node_ids:
        return []
    next_nodes = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id.in_(to_node_ids), Graph.user_id == current_user.id)
        .all()
    )

    return next_nodes

@app.delete("/edges/{edge_id}", status_code=204)
def delete_edge(edge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edge = (
        db.query(Edge)
        .join(Node, Edge.from_node_id == Node.id)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Edge.id == edge_id, Graph.user_id == current_user.id)
        .first()
    )
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    db.delete(edge)
    db.commit()
    return Response(status_code=204)

#TECHNIQUE ENDPOINTS
@app.get("/nodes/{node_id}/technique", response_model=TechniqueRead)
def get_technique(node_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #get technique data for a node
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    
    technique = db.query(Technique).filter(Technique.node_id == node_id).first()
    if technique is None:
        raise HTTPException(status_code=404, detail="Technique not found")
    
    return technique

@app.post("/nodes/{node_id}/technique", response_model=TechniqueRead)
def create_technique(node_id: int, technique: TechniqueCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #create technique data for a node
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    
    #check if technique already exists
    existing = db.query(Technique).filter(Technique.node_id == node_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Technique already exists for this node")
    
    db_technique = Technique(
        node_id=node_id,
        video_url=technique.video_url,
        steps=technique.steps
    )
    db.add(db_technique)
    db.commit()
    db.refresh(db_technique)
    return db_technique

@app.put("/nodes/{node_id}/technique", response_model=TechniqueRead)
def update_technique(node_id: int, technique: TechniqueUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #update technique data for a node
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    
    db_technique = db.query(Technique).filter(Technique.node_id == node_id).first()
    if db_technique is None:
        raise HTTPException(status_code=404, detail="Technique not found")
    
    if technique.video_url is not None:
        db_technique.video_url = technique.video_url
    if technique.steps is not None:
        db_technique.steps = technique.steps
    
    db.commit()
    db.refresh(db_technique)
    return db_technique

@app.delete("/nodes/{node_id}/technique", status_code=204)
def delete_technique(node_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    #delete technique data for a node
    node = (
        db.query(Node)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Node.id == node_id, Graph.user_id == current_user.id)
        .first()
    )
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    technique = db.query(Technique).filter(Technique.node_id == node_id).first()
    if technique is None:
        raise HTTPException(status_code=404, detail="Technique not found")
    
    db.delete(technique)
    db.commit()
    return Response(status_code=204)

#LIST ENDPOINTS
@app.get("/users/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    return [current_user]

@app.get("/graphs/", response_model=list[GraphRead])
def list_graphs(
    db: Session = Depends(get_db),
    user_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Graph).filter(Graph.user_id == current_user.id)
    return q.order_by(Graph.id).offset(offset).limit(limit).all()

@app.get("/nodes/", response_model=list[NodeRead])
def list_nodes(
    db: Session = Depends(get_db),
    graph_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Node).join(Graph, Node.graph_id == Graph.id).filter(Graph.user_id == current_user.id)
    if graph_id is not None:
        q = q.filter(Node.graph_id == graph_id)
    return q.order_by(Node.id).offset(offset).limit(limit).all()

@app.put("/edges/{edge_id}", response_model=EdgeRead)
def update_edge(edge_id: int, patch: EdgeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_edge = (
        db.query(Edge)
        .join(Node, Edge.from_node_id == Node.id)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Edge.id == edge_id, Graph.user_id == current_user.id)
        .first()
    )
    if db_edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    if patch.edge_type is not None:
        db_edge.edge_type = patch.edge_type

    if patch.color is not None:
        db_edge.color = patch.color

    if patch.label is not None:
        db_edge.label = patch.label

    if patch.note is not None:
        db_edge.note = patch.note

    db.commit()
    db.refresh(db_edge)
    return db_edge

@app.get("/edges/", response_model=list[EdgeRead])
def list_edges(
    db: Session = Depends(get_db),
    graph_id: int | None = Query(None),
    from_node_id: int | None = Query(None),
    to_node_id: int | None = Query(None),
    edge_type: EdgeType | None = Query(None, description="filter by edge type"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Edge)
        .join(Node, Edge.from_node_id == Node.id)
        .join(Graph, Node.graph_id == Graph.id)
        .filter(Graph.user_id == current_user.id)
    )

    if from_node_id is not None:
        q = q.filter(Edge.from_node_id == from_node_id)
    if to_node_id is not None:
        q = q.filter(Edge.to_node_id == to_node_id)
    if edge_type is not None:
        q = q.filter(Edge.edge_type == edge_type)

    if graph_id is not None:
        q = q.filter(Node.graph_id == graph_id)

    return q.order_by(Edge.id).offset(offset).limit(limit).all()
