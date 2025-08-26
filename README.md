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
1. Clone or download this repository.  
2. Edit the `config.json` file (see example below) to add your repositories:  

```json
{
  "repos": [
    "C:\\Users\\YourUser\\Projects\\repo1",
    "C:\\Users\\YourUser\\Projects\\repo2"
  ]
}
