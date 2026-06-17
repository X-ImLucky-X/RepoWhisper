from typing import List, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import os

class RAGIngestor:
    def __init__(self, repository_id: str, persist_directory: str = "./chroma_db"):
        self.repository_id = repository_id
        self.persist_directory = persist_directory
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        self.vector_store = Chroma(
            collection_name=f"repo_{repository_id}",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True,
        )

    def ingest_files(self, files: List[Dict[str, str]]):
        documents = []
        for file in files:
            doc = Document(
                page_content=file["content"],
                metadata={"source": file["path"], "repository_id": self.repository_id}
            )
            documents.append(doc)

        # Split documents
        split_docs = self.text_splitter.split_documents(documents)

        # Ingest to ChromaDB
        if split_docs:
            self.vector_store.add_documents(split_docs)

    def get_retriever(self):
        return self.vector_store.as_retriever(search_kwargs={"k": 5})
