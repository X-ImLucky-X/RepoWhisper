import os
from typing import List, Dict
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from tree_sitter_languages import get_parser

class RAGIngestor:
    def __init__(self, repository_id: str, persist_directory: str = "./qdrant_db"):
        self.repository_id = repository_id
        self.persist_directory = persist_directory
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        os.makedirs(self.persist_directory, exist_ok=True)
        self.client = QdrantClient(path=self.persist_directory)
        self.collection_name = f"repo_{repository_id}"
        
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
            
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=self.collection_name,
            embedding=self.embeddings
        )

    def _parse_ast_chunks(self, file_path: str, code: str) -> List[Dict]:
        chunks = []
        try:
            if file_path.endswith('.py'):
                parser = get_parser('python')
            elif file_path.endswith(('.js', '.jsx')):
                parser = get_parser('javascript')
            elif file_path.endswith(('.ts', '.tsx')):
                parser = get_parser('tsx')
            else:
                return [{"type": "file", "name": os.path.basename(file_path), "content": code}]

            tree = parser.parse(bytes(code, "utf8"))

            def traverse(node):
                if node.type in ['function_definition', 'class_definition', 'method_definition', 'function_declaration', 'class_declaration', 'arrow_function']:
                    content = code[node.start_byte:node.end_byte]
                    name = "anonymous"
                    for child in node.children:
                        if child.type in ['identifier', 'property_identifier', 'type_identifier']:
                            name = code[child.start_byte:child.end_byte]
                            break
                    chunks.append({
                        "type": node.type,
                        "name": name,
                        "content": content
                    })
                for child in node.children:
                    traverse(child)

            traverse(tree.root_node)
        except Exception as e:
            print(f"AST Parsing failed for {file_path}: {e}")
            
        if not chunks:
             return [{"type": "file", "name": os.path.basename(file_path), "content": code}]
        return chunks

    def ingest_files(self, files: List[Dict[str, str]]):
        documents = []
        for file in files:
            chunks = self._parse_ast_chunks(file["path"], file["content"])
            for chunk in chunks:
                doc = Document(
                    page_content=chunk["content"],
                    metadata={
                        "source": file["path"], 
                        "repository_id": self.repository_id,
                        "node_type": chunk["type"],
                        "node_name": chunk["name"]
                    }
                )
                documents.append(doc)

        if documents:
            self.vector_store.add_documents(documents)

    def get_retriever(self):
        # We can retrieve Top 5 specific function/class nodes now to save tokens
        return self.vector_store.as_retriever(search_kwargs={"k": 5})
