# AutoGit

**AutoGit** is a lightweight Windows automation utility for keeping multiple Git repositories automatically synced.  
It works by pointing AutoGit to a **parent folder** that contains your repositories. The tool then scans all repos inside, runs `git pull` and `git commit` if changes exist, and optionally pushes them to remote.

---

## 🚀 Features
- Automatically syncs all Git repositories under a parent folder.
- Supports **four modes**:
  - **click** → Manually run the script by double-clicking `autoGit.bat`.
  - **hey** → Run sync on Windows startup.
  - **bye** → Run sync and then shut down the system.
  - **auto** → Run periodically in the background using Windows Task Scheduler.
- Simple configuration through `config.bat`.
- Debug mode for troubleshooting.
- Beginner-friendly, no manual Git operations required.

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

3. **Edit `config.bat`**  
   Customize parameters such as:
   - `rootPath` → Path where your Git repos are stored.
   - `defaultCommitMsg` → Default commit message for auto commits.
   - `debugMode` → Toggle debug mode.

   Example template:
   ```bat
   set rootPath=C:\Users\YourUser\Projects
   set defaultCommitMsg=AutoGit Sync
   set debugMode=true
   set enableShutdown=false
   ```

4. **Run Modes**  
   Double click and it's starts running.

---

## 🔧 Automation Options

- **Startup**: Copy both `autoGit.bat` and `config.bat` into the Windows Startup folder to run AutoGit every time the system boots.
- **Shutdown**: Configure AutoGit with the **bye** mode and register it as a shutdown script so the system auto-syncs before shutting down.
- **Scheduler**: Use Windows Task Scheduler to run AutoGit at regular intervals in **auto** mode.

---

## 🐞 Debug Mode
Enable debug mode in `config.bat` to see detailed logs for troubleshooting:
```bat
set DEBUG=true
```

---

## 📖 Examples

### Example 1: Manual click Run
```bat
autoGit.bat 
```
This will sync all repositories once and exit.

### Example 2: Startup Sync
Place AutoGit in Startup folder and configure:
```bat
autoGit.bat hey
```
Your repos will always be up to date when Windows starts.

### Example 3: Shutdown Sync
```bat
autoGit.bat 
config.bat
```
Runs sync and automatically powers off the system when finished.

### Example 4: Scheduled Auto-Sync
Using Task Scheduler:
```bat
autoGit.bat 
config.bat
```
Runs periodically (e.g., every hour) without user intervention.

---

## ✍️ Author
Created and maintained by **imakshat47**.  
Happy coding!

