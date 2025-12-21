from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)

class Graph(Base):
    __tablename__ = 'graphs'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", backref="graphs")

class Node(Base):
    __tablename__ = "nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    graph_id = Column(Integer, ForeignKey("graphs.id"))
    
    graph = relationship("Graph", backref="nodes")

class Edge(Base):
    __tablename__ = "edges"
    
    id = Column(Integer, primary_key=True, index=True)
    from_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False, index=True)
    to_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False, index=True)

class Technique(Base):
    __tablename__ = "techniques"
    
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), unique=True, nullable=False, index=True)
    video_url = Column(String, nullable=True)
    steps = Column(Text, nullable=True)
    
    node = relationship("Node", backref="technique")