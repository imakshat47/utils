# Utils



# Self Password Manager (Chrome Extension)

A lightweight, local-first password manager built as a Chrome Manifest V3 extension.

## Features
- Master-password–based vault (AES-GCM encryption with PBKDF2 key derivation).
- Local storage only (no server).
- Add, view, and manage entries (username, password, URL).
- Generate strong random passwords.
- Autofill credentials into login forms.
- Clipboard copy with auto-clear timer.
- Vault auto-lock after inactivity.


## Security
- Vault is encrypted with a key derived from your master password.
- No plaintext storage in localStorage or disk.
- Clipboard auto-clears after ~20s.
- Extension auto-locks after 2m idle.


⚠️ **Disclaimer**: This is a demo utility. Do **not** use it for real production secrets without a full audit.


## Folder Layout
self-pw-manager.zip
└── self-pw-manager/
├── manifest.json
├── service-worker.js
├── crypto.js
├── popup.html
├── popup.js
├── content-script.js
├── icons/
│ ├── icon-16.png
│ ├── icon-48.png
│ └── icon-128.png
├── README.md
├── .gitignore
└── package.json

## Installation (Unpacked)
1. Clone or download this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** → select the `self-pw-manager/` folder.
5. Pin the extension from the puzzle-piece menu.


## Usage
1. On first run, set a master password.
2. Add entries with `+ Add` (name, username, password, URL).
3. Use **Copy** to copy password (auto-clears) or **Fill** on a login page.
4. Lock the vault when done.


## Export
You can export an encrypted vault JSON. Decrypt with the same master password.


# auto_git

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