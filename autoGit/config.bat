:: ====== AutoGit User Config ======

:: ============================================
:: Configurable Parameters
:: ============================================

:: Root folder path that contains all your Git repositories.
:: Each direct subfolder inside this path will be checked as a repo.
:: Eg: C:\User\Project
set "rootPath=F:\pFolder"

:: A friendly name for the device where AutoGit is running.
:: Used to tag commits so you know which machine made the update.
:: Eg: Laptop, Computer
set "deviceName=<DeviceName>"

:: Your username (local or GitHub/Git user).
:: Also used in commit messages for tracking.
:: Eg: ImAkshat47
set "username=<UserName>"

:: The default commit message format.
:: You can include variables like %deviceName% and %username%.
:: Example resolved message: "Update from MyLaptop by ImAkshat47"
set "defaultCommitMsg=Update from %deviceName% by %username%"

:: Debug mode switch (true/false).
:: When true → extra logs printed to help troubleshoot issues.
set "debugMode=true"

:: Shutdown switch (true/false).
:: When true → AutoGit will trigger a system shutdown after finishing.
set "enableShutdown=false"
