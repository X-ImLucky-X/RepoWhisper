# 🌌 RepoWhisper

### AI-Powered Architectural Command Center for Modern Codebases

[🔗 Live Demo](https://github.com/X-ImLucky-X/RepoWhisper)

---

## 📖 Introduction

> **Stop reading codebases. Start understanding them.**

**RepoWhisper** is an AI-powered developer platform that automatically analyzes repositories, visualizes software architecture, evaluates code quality, and teaches developers how a codebase works through interactive AI explanations.

Whether you're onboarding to a new project, conducting architecture reviews, preparing for technical interviews, or exploring an open-source repository, RepoWhisper acts as your personal **Principal Engineer**.

---

## ✨ Features

### 🚀 Automated Repository Ingestion

Simply paste a GitHub repository URL, and RepoWhisper will:

- **Clone & index** the repository seamlessly.
- **Parse source files** using `Tree-sitter` for accurate AST parsing.
- **Build dependency relationships** across the entire codebase.
- **Extract architectural metadata** to map out components.
- **Generate embeddings** for deep semantic understanding.

### 🌌 Interactive 3D Architecture Graph

Visualize your codebase as a force-directed 3D knowledge graph.

- File dependency visualization and component relationship mapping.
- Interactive node exploration with color-coded architecture layers.
- Full zoom, rotate, and inspect functionality.

> Instead of navigating folders manually, developers can explore architecture visually.

### 📊 AI Architecture Scorecard

Every repository receives an AI-generated health assessment analyzing:

- Circular dependencies & unused/dead files.
- Structural complexity & code organization.
- Potential security concerns & maintainability indicators.

> Provides a health score from **0–100** along with actionable recommendations.

### 🎓 AI Walkthrough Tutor

Click any file in the architecture graph and receive an instant explanation:

- *What does this file do and why does it exist?*
- *Which files depend on it and how does it fit into the system?*
- *What would break if it changed?*

### 🎤 AI Mock Interviewer

Turn any repository into an interview simulator. RepoWhisper can:

- Generate architecture questions based on the ingested code.
- Ask targeted system design follow-ups.
- Test repository understanding and evaluate reasoning/trade-offs.

### ⚙️ Developer Control Center

Manage repositories and AI settings from a centralized dashboard. Configure AI model selection, response verbosity, analysis depth, and general user preferences.

---

## 🏗️ System Architecture

```text
GitHub Repository
        │
        ▼
Repository Ingestion Service
        │
        ▼
Tree-sitter AST Parsing
        │
        ▼
Dependency Graph Builder
        │
        ▼
Embedding Generator
        │
        ▼
PostgreSQL + pgvector
        │
        ├────────────► AI Scorecard Engine
        │
        ├────────────► Walkthrough Tutor
        │
        └────────────► Mock Interview Engine
                              │
                              ▼
                    Next.js Frontend
                              │
                              ▼
                Interactive 3D Graph UI
```

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React |
| Styling & Animation | Tailwind CSS v4, Framer Motion |
| 3D Visualization | React Force Graph 3D, Three.js |
| Authentication | NextAuth |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) |
| Database | PostgreSQL + `pgvector` |
| Parser | Tree-sitter |

### AI Layer

| Layer | Technology |
|---|---|
| Orchestration | LangChain |
| LLMs | OpenAI Models, Llama Models |
| Architecture | RAG & Vector Embeddings |

### Infrastructure

| Layer | Technology |
|---|---|
| Integrations | GitHub OAuth |
| Deployment | Docker, REST APIs |

---

## 🎨 Design Philosophy

RepoWhisper uses a custom **Cyberpunk Brutalism** design language to make code exploration feel like navigating a futuristic command center rather than reading documentation.

### Synthetix Design System

| Element | Specification |
|---|---|
| **Background Canvas** | Deep Space Obsidian `#0B0F19` |
| **Primary Accent** | Electric Purple `#BD00FF` |
| **Secondary Accent** | Bright Cyan `#00E0FF` |
| **Borders** | Hard `4px` Solid Black |
| **Shadows** | Brutalist Hard Rigid Drop Shadows |

---

## 🎯 Use Cases

- **New Team Members** — Understand large codebases in minutes instead of days.
- **Open Source Contributors** — Quickly discover architecture before making contributions.
- **Engineering Managers** — Review repository health and identify structural technical debt.
- **Students** — Learn how real-world production software systems are structured.
- **Interview Candidates** — Practice system design discussions using actual enterprise repositories.

---

## 📸 Screenshots

#### Landing Page
*Coming soon*

#### Repository Dashboard & 3D Knowledge Graph
*Coming soon*

#### Architecture Scorecard & AI Tutor
*Coming soon*

---

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/X-ImLucky-X/RepoWhisper.git
cd RepoWhisper
```

### 2. Frontend Setup

```bash
npm install
npm run dev
```

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Environment Variables

Create a `.env` file in your root/backend directories and populate the following:

```env
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_postgresql_url
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
```

---

## 👨‍💻 Author

**Lakshya Kumar Singh**  
Passionate about AI, software engineering, system design, and building tools that help developers understand complex systems faster.

- **GitHub:** [@X-ImLucky-X](https://github.com/X-ImLucky-X)
- **LinkedIn:** [Lakshya Kumar Singh](https://www.linkedin.com/in/lakshya-kumar-singh-62142128b/)

---

## ⭐ Why RepoWhisper?

Modern codebases are becoming larger, more distributed, and harder to understand. **RepoWhisper** transforms raw repositories into visual, searchable, and explainable systems — giving developers profound architectural insight instead of forcing them to manually reverse-engineer thousands of lines of legacy code.

> **Understand architecture. Faster. Smarter. Visually.**