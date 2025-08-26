# AutoGit

**AutoGit** is a lightweight Windows automation utility for keeping multiple Git repositories automatically synced.  
It works by pointing AutoGit to a **parent folder** that contains your repositories. The tool then scans all repos inside, runs `git pull` and `git commit` if changes exist, and optionally pushes them to remote.

---

## 🚀 Features
- Automatically syncs all Git repositories under a parent folder.
- Supports **three modes**:
  - **hey** → Runs on Windows startup.
  - **bye** → Runs sync and then shuts down system.
  - **auto** → Runs periodically in background using Windows Task Scheduler.
- Simple configuration through `config.bat`.
- Beginner-friendly, no manual Git operations required.

---

## ⚙️ Setup

1. **Install Git**  
   Ensure [Git for Windows](https://git-scm.com/download/win) is installed and available in PATH.

2. **Download AutoGit**  
   Place `autoGit.bat` and `config.bat` in a folder (e.g., `C:\Tools\AutoGit\`).

3. **Edit `config.bat`**  
   Example template (see below).

4. **Run modes**  
   Open Command Prompt and run:
   ```bat
   autoGit.bat hey
   autoGit.bat bye
   autoGit.bat auto
