import os
import subprocess
import tempfile
import shutil
import pathspec
from typing import List, Dict, Tuple

# Massive list of ignore patterns inspired by gitingest
DEFAULT_IGNORE_PATTERNS = [
    "*.pyc", "*.pyo", "*.pyd", "__pycache__", ".pytest_cache", ".coverage", "coverage/", ".tox", ".nox", ".mypy_cache", ".ruff_cache",
    "*.lock", "node_modules", "bower_components", "package-lock.json", "yarn.lock", "bun.lockb",
    ".npm", ".yarn", ".pnpm-store", "*.class", "*.jar", "*.war", "*.ear", "build/", ".gradle/", ".settings/", "*.gradle",
    ".project", "*.o", "*.obj", "*.dll", "*.dylib", "*.exe", "*.lib", "*.out", "*.a", "*.pdb", "*.bin", ".build/", "*.xcodeproj/",
    "*.xcworkspace/", "xcuserdata/", ".swiftpm/", "*.gem", ".bundle/", "vendor/bundle", "Gemfile.lock", ".ruby-version",
    "Cargo.lock", "target/", "pkg/", "obj/", "bin/", ".git", ".svn", ".hg", ".gitignore", ".gitattributes", ".gitmodules",
    "*.svg", "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico", "*.pdf", "*.mov", "*.mp4", "*.mp3", "*.wav", "*.zip", "venv", ".venv",
    "env", ".env", "virtualenv", ".idea", ".vscode", ".vs", "*.log", "*.bak", "*.tmp", "*.temp", ".cache", ".DS_Store",
    "Thumbs.db", "desktop.ini", "dist", "out", "*.egg-info", "*.egg", "*.whl", "*.so", "site-packages", ".docusaurus",
    ".next", ".nuxt", "*.db", "*.sqlite", "*.sqlite3", "*.min.js", "*.min.css", "*.map", "*.tfstate*", "vendor/", "digest.txt", "public/assets/"
]

class GitHubParser:
    def __init__(self, github_url: str, access_token: str = None):
        self.github_url = github_url
        self.access_token = access_token
        self.temp_dir = tempfile.mkdtemp()
        self.max_files = 5000
        self.max_size_bytes = 50 * 1024 * 1024 # 50 MB
        
    def clone(self):
        import requests
        try:
            # Check size via GitHub API before cloning to prevent DoS
            if "github.com" in self.github_url:
                parts = self.github_url.rstrip("/").split("/")
                if len(parts) >= 2:
                    owner, repo = parts[-2], parts[-1]
                    api_url = f"https://api.github.com/repos/{owner}/{repo}"
                    headers = {"Authorization": f"token {self.access_token}"} if self.access_token else {}
                    res = requests.get(api_url, headers=headers)
                    if res.status_code == 200:
                        repo_size_kb = res.json().get("size", 0)
                        # GitHub API returns size in KB. 500000 KB = ~500 MB
                        if repo_size_kb > 500000:
                            raise Exception(f"Repository is too large ({repo_size_kb // 1000} MB). Max allowed is 500 MB.")
                            
            clone_url = self.github_url
            if self.access_token:
                base_url = clone_url.rstrip("/")
                if base_url.startswith("https://"):
                    clone_url = base_url.replace("https://", f"https://x-access-token:{self.access_token}@")
            
            # Disable terminal prompting to prevent hanging on authentication errors
            env = os.environ.copy()
            env["GIT_TERMINAL_PROMPT"] = "0"
            subprocess.run(["git", "clone", "--depth", "1", clone_url, self.temp_dir], check=True, capture_output=True, env=env)
        except subprocess.CalledProcessError as e:
            self.cleanup()
            from app.core.security import sanitize_secrets
            err_msg = sanitize_secrets(e.stderr.decode(), [self.access_token] if self.access_token else None)
            raise Exception(f"Failed to clone repository: {err_msg}")
        except Exception as e:
            self.cleanup()
            from app.core.security import sanitize_secrets
            err_msg = sanitize_secrets(str(e), [self.access_token] if self.access_token else None)
            raise Exception(err_msg)
            
    def _build_ignore_spec(self) -> pathspec.PathSpec:
        patterns = list(DEFAULT_IGNORE_PATTERNS)
        # Read .gitignore if present
        gitignore_path = os.path.join(self.temp_dir, ".gitignore")
        if os.path.exists(gitignore_path):
            with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                patterns.extend(f.readlines())
        return pathspec.PathSpec.from_lines(pathspec.patterns.GitWildMatchPattern, patterns)

    def get_files_and_tree(self) -> Tuple[List[Dict[str, str]], str, Dict]:
        spec = self._build_ignore_spec()
        files_data = []
        tree_lines = []
        
        nodes = []
        links = []
        
        total_files = 0
        total_size = 0
        
        root_name = os.path.basename(self.github_url.rstrip("/"))
        tree_lines.append(root_name)
        nodes.append({"id": root_name, "name": root_name, "group": "root"})
        
        # Build tree representation and collect files
        for root, dirs, files in os.walk(self.temp_dir):
            rel_root = os.path.relpath(root, self.temp_dir)
            if rel_root == ".":
                rel_root = ""
                parent_id = root_name
            else:
                parent_id = os.path.dirname(rel_root)
                if not parent_id:
                    parent_id = root_name
                nodes.append({"id": rel_root, "name": os.path.basename(root), "group": "folder"})
                links.append({"source": parent_id, "target": rel_root})
                
            # Filter dirs
            dirs[:] = [d for d in dirs if not spec.match_file(os.path.join(rel_root, d) + "/")]
            
            # Print directory in tree
            if rel_root:
                depth = rel_root.count(os.sep) + 1
                tree_lines.append("│   " * (depth - 1) + "├── " + os.path.basename(root) + "/")
                
            for file in files:
                rel_path = os.path.join(rel_root, file).replace("\\", "/") if rel_root else file
                
                # Check ignore patterns
                if spec.match_file(rel_path):
                    continue
                    
                file_path = os.path.join(root, file)
                
                # Safety checks
                if total_files >= self.max_files:
                    break
                
                file_size = os.path.getsize(file_path)
                if file_size > 500 * 1024: # skip huge files locally
                    continue
                    
                if total_size + file_size > self.max_size_bytes:
                    break
                
                # Append to tree
                depth = rel_root.count(os.sep) + 1 if rel_root else 1
                tree_lines.append("│   " * depth + "├── " + file)
                
                # Add to JSON graph
                current_parent_id = rel_root if rel_root else root_name
                nodes.append({"id": rel_path, "name": file, "group": "file"})
                links.append({"source": current_parent_id, "target": rel_path})
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        files_data.append({"path": rel_path, "content": content})
                        total_files += 1
                        total_size += file_size
                except UnicodeDecodeError:
                    continue # skip binaries
            
            if total_files >= self.max_files or total_size >= self.max_size_bytes:
                break
                
        tree_str = "\n".join(tree_lines)
        return files_data, tree_str, {"nodes": nodes, "links": links}
        
    def cleanup(self):
        if os.path.exists(self.temp_dir):
            def onerror(func, path, exc_info):
                import stat
                os.chmod(path, stat.S_IWRITE)
                func(path)
            shutil.rmtree(self.temp_dir, onerror=onerror)
