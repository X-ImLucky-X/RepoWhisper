from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

class RepoSummarizer:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2)
        
    def generate_cheat_sheet(self, files_data: list) -> str:
        # To avoid context limit issues, we extract a high-level summary of the files.
        # For a production system, we'd chunk this or use a Map-Reduce approach.
        # Here we just pass file paths and snippets.
        
        file_summaries = ""
        for idx, f in enumerate(files_data[:50]): # Limit to 50 files for safety
            content_snippet = f["content"][:500] # First 500 chars to grasp the file
            file_summaries += f"File: {f['path']}\nSnippet:\n{content_snippet}\n\n"

        prompt = PromptTemplate.from_template("""
        You are a Principal Software Engineer. Based on the following file snippets from a GitHub repository, generate a 1-page executive "Cheat Sheet" summary of the project.
        
        The summary must include:
        1. Tech Stack Justification (What is used and why)
        2. Data Flow Architecture (High-level explanation of how components interact)
        3. Core Functionalities
        
        Repository File Snippets:
        {file_summaries}
        
        Output the Cheat Sheet in Markdown format.
        """)
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({"file_summaries": file_summaries})
