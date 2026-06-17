from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.messages import HumanMessage, AIMessage
from app.services.rag.ingestion import RAGIngestor

class MockInterviewerAgent:
    def __init__(self, repository_id: str):
        self.repository_id = repository_id
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.7)
        self.retriever = RAGIngestor(repository_id).get_retriever()
        self.qa_chain = self._build_chain()
        
    def _build_chain(self):
        # 1. Contextualize question based on history
        contextualize_q_system_prompt = (
            "Given a chat history and the latest user input "
            "which might reference context in the chat history, "
            "formulate a standalone question which can be understood "
            "without the chat history. Do NOT answer the question, "
            "just reformulate it if needed and otherwise return it as is."
        )
        contextualize_q_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, contextualize_q_prompt
        )

        # 2. Answer question using RAG and Interviewer Persona
        system_prompt = (
            "You are a cynical, aggressive Principal Software Engineer interviewing a candidate for a senior backend role. "
            "The candidate has submitted a GitHub repository for review. "
            "Use the following pieces of retrieved context from their repository to answer the question, or to poke holes in their design. "
            "If you don't know the answer, say that you can't find it in their code, and penalize them for lack of clarity. "
            "Always ask a follow-up technical question challenging their design choices, scaling limits, or security practices. "
            "\n\n"
            "{context}"
        )
        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)

        # 3. Combine into final RAG chain
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
        return rag_chain

    def chat(self, user_input: str, chat_history: list) -> str:
        # Convert raw history to LangChain message objects
        formatted_history = []
        for msg in chat_history:
            if msg["role"] == "USER":
                formatted_history.append(HumanMessage(content=msg["content"]))
            else:
                formatted_history.append(AIMessage(content=msg["content"]))

        response = self.qa_chain.invoke({"input": user_input, "chat_history": formatted_history})
        return response["answer"]
