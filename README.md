# RepoWhisper 🧠💻

**RepoWhisper** is an AI-powered architectural command center for your codebases. It automatically ingests GitHub repositories, builds a 3D Knowledge Graph of the architecture, and grades the codebase with an automated Architecture Scorecard. It also features a built-in AI Tutor to walk you through the codebase or conduct technical mock interviews based on your actual code.

![Cyberpunk Brutalism UI](https://img.shields.io/badge/UI-Cyberpunk_Brutalism-BD00FF?style=flat-square)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_pgvector-336791?style=flat-square&logo=postgresql)

---

## 🔥 Key Features

- **Automated Ingestion**: Paste a GitHub URL and RepoWhisper will clone, parse, and analyze the AST (Abstract Syntax Tree) of the codebase.
- **Architecture Scorecard**: AI acts as a Principal Engineer to grade the codebase (0-100), detecting circular dependencies, dead files, and security risks.
- **3D Knowledge Graph**: Explore your codebase visually. See how files and components relate to each other in a 3D force-directed graph.
- **AI Walkthrough Tutor**: Select any file in the 3D graph and the AI will provide an "Explain Like I'm New" breakdown.
- **Mock Interviewer**: Test your knowledge! The AI will conduct a technical interview based entirely on the architecture of the repository you imported.
- **Developer Control Center**: A brutalist dashboard to manage indexed repositories, configure AI models (Llama 3.3, GPT), and set response styles.
- **GitHub Integration**: Sign in with GitHub via NextAuth for a seamless developer experience.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Aesthetic**: Cyberpunk Brutalism ("Synthetix" Theme)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Visualizations**: `react-force-graph-3d` for the Knowledge Graph, `mermaid` for flowcharts
- **Authentication**: `next-auth` (GitHub OAuth)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: PostgreSQL (with `pgvector` for semantic search) / Supabase
- **AI / LLMs**: Support for Llama 3.3 70B, GPT-4, and open-source models
- **Parsing**: Tree-sitter for deep code intelligence

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL database
- GitHub OAuth application credentials

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/RepoWhisper.git
cd RepoWhisper
```

### 2. Backend Setup
Navigate to the backend directory and set up your Python environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Set your environment variables (create a `.env` file):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/repowhisper
OPENAI_API_KEY=your_api_key
```
Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory:
```bash
cd frontend
npm install
```
Set up your Next.js environment variables (create a `.env.local` file):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_client_secret
```
Run the development server:
```bash
npm run dev
```

### 4. Open the App
Visit `http://localhost:3000` in your browser. Sign in with GitHub, paste a repository URL into the Dashboard, and let the AI go to work!

---

## 🎨 Design System: Synthetix Brutalism
The UI intentionally rejects soft gradients and rounded corners in favor of high-contrast, aggressive styling:
- **Background**: `#0B0F19` (Deep space canvas)
- **Panels**: `#121826` (Elevated boxes)
- **Primary Accent**: `#BD00FF` (Electric purple)
- **Secondary Accent**: `#00E0FF` (Cyber cyan)
- **Borders & Shadows**: Heavy 4px solid borders with hard `4px 4px 0px #000` drop shadows.

## 📄 License
This project is licensed under the MIT License.
