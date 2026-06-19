from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

class RepoSummarizer:
    def __init__(self):
        self.llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
        
    def generate_cheat_sheet(self, files_data: list, tree_str: str = "") -> str:
        # To avoid context limit issues and Groq free-tier TPM limits (12k tokens max),
        # we truncate the tree and severely limit the file snippets.
        
        if len(tree_str) > 3000:
            tree_str = tree_str[:3000] + "\n...[Directory tree truncated]..."
            
        file_summaries = ""
        # Limit to 15 files and 300 characters each to ensure we stay under ~3,000 tokens total
        for idx, f in enumerate(files_data[:15]): 
            content_snippet = f["content"][:300] 
            file_summaries += f"File: {f['path']}\nSnippet:\n{content_snippet}\n\n"

        prompt = PromptTemplate.from_template("""
        You are a Principal Software Engineer. Based on the following directory structure and file snippets from a GitHub repository, generate a 1-page executive "Cheat Sheet" summary of the project.
        
        The summary must include:
        1. Tech Stack Justification (What is used and why)
        2. Data Flow Architecture (High-level explanation of how components interact)
        3. Core Functionalities
        
        Repository Directory Structure:
        ```text
        {tree_str}
        ```
        
        Repository File Snippets:
        {file_summaries}
        
        Output the Cheat Sheet in Markdown format.
        """)
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({"file_summaries": file_summaries, "tree_str": tree_str})

    def generate_scorecard(self, files_data: list, tree_str: str = "") -> str:
        if len(tree_str) > 3000:
            tree_str = tree_str[:3000] + "\n...[Directory tree truncated]..."
            
        file_summaries = ""
        for idx, f in enumerate(files_data[:20]): 
            content_snippet = f["content"][:300] 
            file_summaries += f"File: {f['path']}\nSnippet:\n{content_snippet}\n\n"

        prompt = PromptTemplate.from_template("""
        You are an expert Principal Software Engineer. Based on the following directory structure and file snippets from a GitHub repository, generate an Architecture Scorecard.
        
        You MUST output ONLY a valid JSON object matching this exact schema:
        {{
          "score": 85,
          "circular_dependencies": ["A -> B -> A", "auth -> db -> auth"],
          "dead_files": ["utils/old_helpers.js"],
          "security_risks": ["Hardcoded API key in config.ts"]
        }}
        
        The "score" should be an integer from 0 to 100 representing the architectural health.
        If you find none, return an empty array [] for that field.
        Do NOT wrap the JSON in markdown codeblocks (no ```json). Output raw JSON.
        
        Repository Directory Structure:
        {tree_str}
        
        Repository File Snippets:
        {file_summaries}
        """)
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({"file_summaries": file_summaries, "tree_str": tree_str})
        
        # Strip potential markdown blocks if the LLM disobeys
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]
            
        return result.strip()
