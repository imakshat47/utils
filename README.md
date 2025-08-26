# Utils


## auto_git

`auto_git` is a PowerShell automation tool for managing Git repositories on Windows.  
It simplifies the workflow by automatically pulling updates and committing local changes.  

The script supports **three modes**:

- **hey** → Automatically runs on system startup (auto-pull/commit).  
- **bye** → Runs the Git automation, then shuts down the system.  
- **auto** → Runs continuously in background using Windows Task Scheduler.  

---

## 🚀 Features
- Automatically pulls latest changes from remote.  
- Detects uncommitted changes and commits them with a timestamp.  
- Supports multiple repositories (via config file).  
- Modular and beginner-friendly.  

---

## ⚙️ Setup

1. **Install Git**  
   Ensure [Git for Windows](https://git-scm.com/download/win) is installed and available in PATH.

2. **Download AutoGit**  
   Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/imakshat47/utils
   cd utils/AutoGit
   ```
   Or place `autoGit.bat` and `config.bat` in a folder (e.g., `C:\Tools\AutoGit\`).

Note: Refer ReadME file inside autoGit folder for full details.  