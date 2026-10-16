# backend/prepare_git_repo.py
import os
import sys
import fnmatch
from dulwich import porcelain
from dulwich.repo import Repo

REPO_PATH = r"c:\Users\raghu\Downloads\Cardiovascular-Health-Prediction-main\Cardiovascular-Health-Prediction-main"

def is_ignored(rel_path):
    # Normalize forward slashes
    norm_path = rel_path.replace("\\", "/")
    
    # Specific patterns to always ignore
    always_ignore = [
        ".git",
        "node_modules",
        "dist",
        "__pycache__",
        ".env",
        ".venv",
        "venv",
        "*.pyc",
        "*.db",
        "*.sqlite3",
        "uploads",
        "temp",
        "scratch"
    ]
    parts = norm_path.split("/")
    for part in parts:
        for pat in always_ignore:
            if fnmatch.fnmatch(part, pat):
                return True
    return False

def init_and_commit():
    print(f"Initializing Git repository at: {REPO_PATH}")
    repo = porcelain.init(REPO_PATH)
    
    # Gather files
    files_to_add = []
    for root, dirs, files in os.walk(REPO_PATH):
        # Filter directories in place to prevent descending into ignored dirs
        dirs[:] = [d for d in dirs if not is_ignored(os.path.relpath(os.path.join(root, d), REPO_PATH))]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, REPO_PATH)
            if not is_ignored(rel_path):
                files_to_add.append(rel_path)
                
    print(f"Staging {len(files_to_add)} files...")
    # Add files
    porcelain.add(REPO_PATH, files_to_add)
    
    # Commit
    commit_msg = b"CardioPredict: Fix blank dashboard, add 5-step clinical workflow, AI analysis & personalized diet plan"
    commit_id = porcelain.commit(
        REPO_PATH,
        message=commit_msg,
        author=b"raghugy <raghugy@users.noreply.github.com>",
        committer=b"raghugy <raghugy@users.noreply.github.com>"
    )
    print(f"Successfully committed! Commit ID: {commit_id.decode() if isinstance(commit_id, bytes) else commit_id}")
    
    # Configure remote origin
    remote_url = "https://github.com/raghugy/cardiovascular.git"
    config = repo.get_config()
    config.set(("remote", "origin"), "url", remote_url)
    config.set(("remote", "origin"), "fetch", "+refs/heads/*:refs/remotes/origin/*")
    config.set(("branch", "main"), "remote", "origin")
    config.set(("branch", "main"), "merge", "refs/heads/main")
    config.write_to_path()
    
    # Create main branch ref
    repo.refs[b"refs/heads/main"] = repo.head()
    print("Remote 'origin' set to https://github.com/raghugy/cardiovascular.git")
    print("Branch 'main' created and pointing to latest commit.")

if __name__ == "__main__":
    init_and_commit()
