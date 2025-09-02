\# Self Password Manager (Chrome Extension)



A lightweight, local-first password manager built as a Chrome Manifest V3 extension.



\## Features

\- Master-password–based vault (AES-GCM encryption with PBKDF2 key derivation).

\- Local storage only (no server).

\- Add, view, and manage entries (username, password, URL).

\- Generate strong random passwords.

\- Autofill credentials into login forms.

\- Clipboard copy with auto-clear timer.

\- Vault auto-lock after inactivity.





\## Security

\- Vault is encrypted with a key derived from your master password.

\- No plaintext storage in localStorage or disk.

\- Clipboard auto-clears after ~20s.

\- Extension auto-locks after 2m idle.





⚠️ \*\*Disclaimer\*\*: This is a demo utility. Do \*\*not\*\* use it for real production secrets without a full audit.





\## Folder Layout

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



\## Installation (Unpacked)

1\. Clone or download this repo.

2\. Open `chrome://extensions`.

3\. Enable \*\*Developer mode\*\*.

4\. Click \*\*Load unpacked\*\* → select the `self-pw-manager/` folder.

5\. Pin the extension from the puzzle-piece menu.





\## Usage

1\. On first run, set a master password.

2\. Add entries with `+ Add` (name, username, password, URL).

3\. Use \*\*Copy\*\* to copy password (auto-clears) or \*\*Fill\*\* on a login page.

4\. Lock the vault when done.





\## Export

You can export an encrypted vault JSON. Decrypt with the same master password

