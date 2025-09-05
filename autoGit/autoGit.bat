@echo off

:: ===============================
:: AutoGit - Automated Git Sync Tool (v1)
:: Modes:
::   hey        - run once now + add Startup shortcut (future runs at startup)
::   bye        - run once now + shutdown
::   set enableShutdown=true
::   auto       - run once now + register Scheduled Task for recurring runs
:: ===============================

:: ============================================
:: Enable delayed variable expansion
:: ============================================
setlocal enabledelayedexpansion

:: ============================================
:: Do Not Change Below
:: ============================================
call "./config.bat"

:: ============================================
:: Move to Working Directory
:: ============================================
cd /d "%rootPath%"

:: ============================================
:: Ensure Git is Available
:: ============================================
git --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Git is not installed or not in the system PATH.
    pause
     
)

:: ============================================
:: Generate Timestamp
:: ============================================
for /f %%t in ('powershell -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "timestamp=%%t"

:: ============================================
:: Iterate Over Each Git Repo Folder
:: ============================================
for /d %%d in (*) do (
    if exist "%%d\.git" (
        if /i "!debugMode!"=="true" echo ==== Checking Git repo in: %%d ====
        cd /d %%d

        :: Pull from remote
        if /i "!debugMode!"=="true" echo Pulling latest changes...
        git pull origin main >nul 2>&1

        if %ERRORLEVEL% NEQ 0 (
            echo [x] Pull failed in %%d. Skipping...
            pause
            continue
        )

        set "changesDetected=false"

        :: Handle changes
        for /f "delims=" %%i in ('git status -s') do (
            set "line=%%i"
            set "fileName=!line:~3!"
            set "changesDetected=true"

            if /i "!debugMode!"=="true" echo Staging file: !fileName!
            git add "!fileName!" >nul 2>&1

            git commit -m "%defaultCommitMsg% - !fileName! at !timestamp!" >nul 2>&1

            if !ERRORLEVEL! EQU 0 (
                if /i "!debugMode!"=="true" echo Committed: !fileName!
                git push origin main >nul 2>&1
            ) else (
                if /i "!debugMode!"=="true" echo Error in commit for !fileName!
            )
        )
	
        :: Final batch add & commit fallback
        git add . >nul 2>&1
        git commit -m "%defaultCommitMsg% - batch commit at !timestamp!" >nul 2>&1

        if /i "!changesDetected!"=="true" (
	    git push origin main >nul 2>&1
            echo [vv] %%d: Changes pushed.
        ) else (
            echo [v] %%d: No changes found.
        )

        :: Return to the parent folder
        cd ..

    )
    
)

:: ============================================
:: Completion Message and Optional Shutdown
:: ============================================
echo.
echo Script completed at %timestamp%.
echo Closing in 3 seconds...
timeout /t 3 >nul

if /i "%enableShutdown%"=="true" (
    echo System will shut down in 5 seconds...
    timeout /t 5 >nul
    shutdown /s /t 3
) else (
    echo Exiting in 5 seconds...
    timeout /t 5 >nul
)

endlocal
exit \b