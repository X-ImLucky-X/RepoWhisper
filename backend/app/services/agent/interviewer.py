from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from app.services.rag.ingestion import RAGIngestor

class MockInterviewerAgent:
    def __init__(self, repository_id: str, repo_summary: str = "", mode: str = "interview", ai_model: str = "llama3_70b", response_style: str = "detailed"):
        self.repository_id = repository_id
        # Truncate summary to max 2000 chars to avoid blowing up Groq's 12K TPM limit
        self.repo_summary = repo_summary[:2000] + "..." if len(repo_summary) > 2000 else repo_summary
        self.mode = mode
        self.response_style = response_style
        
        # Map frontend model string to actual Groq models
        model_mapping = {
            "llama3_70b": "llama-3.3-70b-versatile",
            "llama3_8b": "llama-3.1-8b-instant",
            "gpt_oss_120b": "openai/gpt-oss-120b",
            "gpt_oss_20b": "openai/gpt-oss-20b"
        }
        actual_model = model_mapping.get(ai_model, "llama-3.3-70b-versatile")
        
        self.llm = ChatGroq(model=actual_model, temperature=0.7)
        
        # Override the retriever to only fetch top 3 instead of 5 to save context size
        base_retriever = RAGIngestor(repository_id).get_retriever()
        base_retriever.search_kwargs["k"] = 3
        self.retriever = base_retriever
        self.qa_chain = self._build_chain()
        
    def _build_chain(self):
        style_guide = ""
        if self.response_style == "brief":
            style_guide = "Be extremely brief and concise. Use bullet points. Do not write long paragraphs."
        elif self.response_style == "code_heavy":
            style_guide = "Prioritize showing code snippets in your explanation. Write concrete code examples to demonstrate your point."
        else:
            style_guide = "Be detailed and thoroughly explain architectural context."

        if self.mode == "walkthrough":
            system_prompt = (
                "You are a friendly, patient, and highly experienced AI Tutor helping a developer understand their codebase. "
                "Here is the high-level architectural overview of their repository to help you understand the core design:\n"
                f"### ARCHITECTURE SUMMARY:\n{self.repo_summary}\n\n###\n"
                "Use the architecture summary above AND the following specific pieces of retrieved code context to explain how things work. "
                "If you don't know the answer based on the context, politely let them know that you can't find it in their code. "
                f"Your goal is to be educational, supportive, and clear. {style_guide}\n"
                "CRITICAL: You are equipped with a Mermaid.js rendering engine in your chat UI. Whenever the user asks for a Dependency Graph, Impact Analysis, Architecture Timeline, Call Flow Visualization, or Service Communication Map, you MUST output a valid ```mermaid code block visualizing the relationships. "
                "MERMAID SYNTAX RULES: Use `graph TD;`. For labeled arrows, use `-->|label|`. Node labels MUST be wrapped in double quotes if they contain spaces or parentheses. Example: `A[\"Frontend (React)\"] -->|calls API| B[\"Backend (Node)\"];`. Do NOT output invalid arrows like `-->|label|>`."
                "\n\nCode Context:\n{context}"
            )
        else:
            system_prompt = (
                "You are a cynical, aggressive Principal Software Engineer interviewing a candidate for a senior backend role. "
                "The candidate has submitted a GitHub repository for review. "
                "Here is the high-level architectural overview of their repository to help you understand the core design:\n"
                f"### ARCHITECTURE SUMMARY:\n{self.repo_summary}\n\n###\n"
                "Use the architecture summary above AND the following specific pieces of retrieved code context to answer the question, or to poke holes in their design. "
                "If you don't know the answer based on the context, say that you can't find it in their code, and penalize them for lack of clarity. "
                "Always ask a follow-up technical question challenging their design choices, scaling limits, or security practices. "
                "\n\nCode Context:\n{context}"
            )
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])

        def format_docs(docs):
            formatted = []
            for doc in docs:
                source = doc.metadata.get("source", "Unknown file")
                node_type = doc.metadata.get("node_type", "chunk")
                node_name = doc.metadata.get("node_name", "anonymous")
                formatted.append(f"--- File: {source} | Type: {node_type} | Name: {node_name} ---\n{doc.page_content[:1500]}")
            return "\n\n".join(formatted)

        rag_chain = (
            RunnablePassthrough.assign(
                context=(lambda x: x["input"]) | self.retriever | format_docs
            )
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return rag_chain

    def chat(self, user_input: str, chat_history: list) -> str:
        formatted_history = []
        # Keep only the last 6 messages to save tokens
        recent_history = chat_history[-6:] if len(chat_history) > 6 else chat_history
        for msg in recent_history:
            if msg["role"] == "USER":
                formatted_history.append(HumanMessage(content=msg["content"]))
            else:
                formatted_history.append(AIMessage(content=msg["content"]))

        response = self.qa_chain.invoke({
            "input": user_input,
            "chat_history": formatted_history
        })
        return response

    def explain_file(self, file_path: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert developer. The user wants you to explain a specific file from their codebase: {file_path}.\n"
                "Here is the high-level architecture of the repository:\n"
                "{repo_summary}\n\n"
                "Review the code context provided below and generate a short, structured 'Explain Like I'm New' breakdown of this file.\n"
                "Your output MUST be formatted exactly in Markdown with these headers:\n"
                "### 🎯 Purpose\n[1-2 sentences]\n"
                "### 🔗 Depends On\n[Bullet points of key external services or internal modules it uses]\n"
                "### ⚠️ Risk Level\n[Low/Medium/High] - [Brief reason why]\n\n"
                "Code Context for {file_path}:\n{context}"
            )),
            ("human", "Explain the file: {file_path}")
        ])

        def format_docs(docs):
            formatted = []
            for doc in docs:
                source = doc.metadata.get("source", "Unknown file")
                node_type = doc.metadata.get("node_type", "chunk")
                node_name = doc.metadata.get("node_name", "anonymous")
                formatted.append(f"--- File: {source} | Type: {node_type} | Name: {node_name} ---\n{doc.page_content[:1500]}")
            return "\n\n".join(formatted)

        chain = (
            {
                "context": (lambda x: x["file_path"]) | self.retriever | format_docs,
                "file_path": lambda x: x["file_path"],
                "repo_summary": lambda _: self.repo_summary
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )
        return chain.invoke({"file_path": file_path})
