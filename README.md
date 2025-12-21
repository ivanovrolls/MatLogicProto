# 🥋 MatLogic — What is it?

MatLogic is a web-based application designed for Brazilian Jiu-Jitsu (BJJ) practitioners to **map, structure, and internalise their game** using visual graphs. Techniques are represented as **nodes**, and transitions as **edges**. This is to encourage a certain type of training I have personally used for years in my martial arts journey: first person visualisation. This technique allows a martial artist to practice whatever they wish, anywhere, anytime. I am building this app because I always loved the idea of providing structure to my visualisation training. So, in MatLogic, each technique has its own dedicated page where users can attach videos and write first-person, step-by-step execution notes to deepen understanding and retention 🧠

---

## ✨ Core Features (Current)

- 🕸️ **Graph-based technique mapping**
  - Nodes represent individual techniques
  - Edges represent transitions between techniques
- 🎯 **Clean, focused UI**
  - Draggable nodes
  - Quick recovery controls to regroup nodes if they get lost
- 🌗 **Dark & Light mode**
- 📄 **Technique pages per node**
  - Attach video links (e.g. YouTube)
  - Write detailed step-by-step instructions
  - Designed to promote first-person visualisation and mental rehearsal
- 🗄️ **Persistent storage**
  - PostgreSQL database
  - Fully containerised using Docker & Docker Compose

---

## 🚧 Planned / In Progress

- 🤖 **AI-assisted node recommendations**
  - Suggest logical next techniques when a node has few connections
  - Help practitioners identify gaps in their game
- 🧠 **Guided mental rehearsal prompts**
- 👥 **Multi-user refinement & sharing**
- 📊 **Game-plan analysis & optimisation**
- ✏️ **The ability to upload custom images of the technique, ideally on-paper sketches by the user**

---

## 🧪 MVP Scope

The current MVP focuses on:
- Graph-based BJJ game-plan construction
- Technique-level documentation and visualisation
- A smooth UI suitable for daily use by practitioners

AI features are intentionally planned *after* the core tooling proves useful on its own.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI
- **Database:** PostgreSQL
- **Frontend:** React + React Flow
- **Infrastructure:** Docker, Docker Compose
- **Dev Workflow:** Git & GitHub

---

## 📈 Project Status

**Active development (Early MVP)**  
Core functionality is implemented and usable.  
The focus is now on refinement, stability, and further feature development.

---

## 🥋 Philosophy

MatLogic is built around a simple idea: 

> *First person visualisation can be used to practice techniques*

This tool is not meant to replace training. It exists to **supplement it**, the way I have done so, for years.

