import os
import subprocess
import tempfile
import shutil
from typing import List, Dict

class GitHubParser:
    def __init__(self, github_url: str):
        self.github_url = github_url
        self.temp_dir = tempfile.mkdtemp()
        
    def clone(self):
        try:
            # Clone depth 1 to save time
            subprocess.run(["git", "clone", "--depth", "1", self.github_url, self.temp_dir], check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            self.cleanup()
            raise Exception(f"Failed to clone repository: {e.stderr.decode()}")
            
    def get_files(self, ignore_extensions: List[str] = None) -> List[Dict[str, str]]:
        if ignore_extensions is None:
            ignore_extensions = [".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pyc", ".lock", ".env"]
            
        ignore_dirs = [".git", "node_modules", "venv", "__pycache__", ".next"]
        
        files_data = []
        for root, dirs, files in os.walk(self.temp_dir):
            # Prune ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in ignore_extensions:
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.temp_dir)
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        files_data.append({"path": rel_path, "content": content})
                except UnicodeDecodeError:
                    # Skip binary files that don't have matching extensions
                    continue
                    
        return files_data
        
    def cleanup(self):
        if os.path.exists(self.temp_dir):
            # Use shutil to forcefully remove read-only files (like .git objects on Windows)
            def onerror(func, path, exc_info):
                import stat
                os.chmod(path, stat.S_IWRITE)
                func(path)
            shutil.rmtree(self.temp_dir, onerror=onerror)
