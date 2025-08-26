@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ===============================
:: AutoGit - Automated Git Sync Tool (v2)
:: Modes:
::   hey        - run once now + add Startup shortcut (future runs at startup)
::   bye        - run once now + shutdown
::   auto       - run once now + register Scheduled Task for recurring runs
::   status     - show setup status (task, startup shortcut, logs)
::   uninstall  - remove Scheduled Task + Startup shortcut
:: Internal:
::   tick       - perform one sync run (used by scheduler/startup)
:: ===============================

:: --- Load config ---
set "SCRIPT_DIR=%~dp0"
if not exist "%SCRIPT_DIR%config.bat" (
  echo [ERROR] Config not found: "%SCRIPT_DIR%config.bat"
  exit /b 1
)
call "%SCRIPT_DIR%config.bat"

:: --- Defaults / Normalize ---
if not defined LOG_DIR set "LOG_DIR=%LOCALAPPDATA%\AutoGit\logs"
if not defined GIT_EXE set "GIT_EXE=git"
if not defined COMMIT_PREFIX set "COMMIT_PREFIX=[AutoGit]"
if not defined SCHEDULE_MINUTES set "SCHEDULE_MINUTES=30"
if not defined SHUTDOWN_TIMEOUT set "SHUTDOWN_TIMEOUT=0"
if not defined AUTO_SAFE set "AUTO_SAFE=0"

:: --- Logging setup ---
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "DATESTR=%DATE:~-4,4%-%DATE:~-7,2%-%DATE:~-10,2%"
set "TIMESTR=%TIME: =0%"
set "TIMESTR=%TIMESTR::=-%"
set "LOG_FILE=%LOG_DIR%\run_%DATESTR%_%TIMESTR%.log"

:: --- Helpers ---
:log
setlocal
set "MSG=%~1"
echo %DATE% %TIME% %MSG%
>>"%LOG_FILE%" echo %DATE% %TIME% %MSG%
endlocal & goto :eof

:isGitRepo
:: usage: call :isGitRepo "C:\path\repo" && (echo yes) || (echo no)
setlocal
set "CHK=%~1\.git"
if exist "%CHK%" ( endlocal & exit /b 0 ) else ( endlocal & exit /b 1 )

:: --- Core sync ---
:runRepos
call :log "======== AutoGit run started ========"
if "%PARENT_DIR%"=="" (
  call :log "[ERROR] PARENT_DIR is empty. Set it in config.bat"
  exit /b 1
)
if not exist "%PARENT_DIR%" (
  call :log "[ERROR] Parent directory not found: %PARENT_DIR%"
  exit /b 1
)

set /a _count=0
for /d %%R in ("%PARENT_DIR%\*") do (
  call :isGitRepo "%%~fR"
  if not errorlevel 1 (
    call :processRepo "%%~fR"
    set /a _count+=1
  )
)

if !_count! EQU 0 call :log "[WARN] No Git repositories found directly under: %PARENT_DIR%"
call :log "======== AutoGit run finished ========"
goto :eof

:processRepo
setlocal
set "REPO=%~1"
call :log ""
call :log "📂 Repo: %REPO%"

pushd "%REPO%" >nul 2>&1
if errorlevel 1 (
  endlocal & call :log "[ERROR] Cannot enter repo: %REPO%" & goto :eof
)

:: Optional: auto safe.directory to avoid "unsafe repository" errors
if "%AUTO_SAFE%"=="1" (
  for /f "usebackq delims=" %%P in (`"%GIT_EXE%" rev-parse --show-toplevel 2^>nul`) do (
    "%GIT_EXE%" config --global --add safe.directory "%%~fP" >nul 2>&1
  )
)

:: Pull latest changes
"%GIT_EXE%" pull >>"%LOG_FILE%" 2>&1
if errorlevel 1 call :log "[ERROR] git pull failed."

:: Detect changes
set "HAS_CHANGES="
for /f "delims=" %%S in ('"%GIT_EXE%" status --porcelain') do (
  set "HAS_CHANGES=1"
  goto :gotStatus
)
:gotStatus

if defined HAS_CHANGES (
  "%GIT_EXE%" add -A >>"%LOG_FILE%" 2>&1
  set "NOW=%DATE% %TIME%"
  "%GIT_EXE%" commit -m "%COMMIT_PREFIX% %NOW%" >>"%LOG_FILE%" 2>&1
  if errorlevel 1 (
    call :log "[ERROR] git commit failed."
  ) else (
    "%GIT_EXE%" push >>"%LOG_FILE%" 2>&1
    if errorlevel 1 (
      call :log "[ERROR] git push failed."
    ) else (
      call :log "✅ Changes committed & pushed."
    )
  )
) else (
  call :log "ℹ️ No changes to commit."
)

popd >nul
endlocal
goto :eof

:: --- Startup shortcut (calls tick) ---
:createStartupShortcut
setlocal
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AutoGit.lnk"
powershell -NoProfile -Command ^
 "$ws = New-Object -ComObject WScript.Shell;" ^
 "$s = $ws.CreateShortcut('%LNK%');" ^
 "$s.TargetPath = 'cmd.exe';" ^
 "$s.Arguments = '/c \"\"%SCRIPT_DIR%autoGit.bat\" tick\"';" ^
 "$s.WorkingDirectory = '%SCRIPT_DIR%';" ^
 "$s.IconLocation = '%SystemRoot%\System32\shell32.dll,25';" ^
 "$s.Save();" >nul 2>&1
if errorlevel 1 (
  call :log "[WARN] Could not create Startup shortcut."
) else (
  call :log "📌 Startup shortcut created: %LNK%"
)
endlocal
goto :eof

:removeStartupShortcut
setlocal
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AutoGit.lnk"
if exist "%LNK%" (
  del /q "%LNK%" >nul 2>&1
  call :log "🧹 Removed Startup shortcut."
) else (
  call :log "[INFO] Startup shortcut not present."
)
endlocal
goto :eof

:: --- Scheduler (runs tick) ---
:registerTask
schtasks /Create ^
  /TN "AutoGit" ^
  /TR "cmd.exe /c \"\"%SCRIPT_DIR%autoGit.bat\" tick\"" ^
  /SC MINUTE ^
  /MO %SCHEDULE_MINUTES% ^
  /F >nul 2>&1
if errorlevel 1 (
  call :log "[ERROR] Failed to create/update scheduled task."
) else (
  call :log "📅 Scheduled task 'AutoGit' created/updated (every %SCHEDULE_MINUTES% min)."
)
goto :eof

:removeTask
schtasks /Delete /TN "AutoGit" /F >nul 2>&1
if errorlevel 1 (
  call :log "[INFO] Scheduled task 'AutoGit' not present."
) else (
  call :log "🧹 Removed scheduled task 'AutoGit'."
)
goto :eof

:showStatus
echo.
echo ===== AutoGit Status =====
echo Config:      "%SCRIPT_DIR%config.bat"
echo Logs folder: "%LOG_DIR%"
echo.
echo [Task Scheduler]
schtasks /Query /TN "AutoGit" >nul 2>&1
if errorlevel 1 (
  echo   - Task: Not found
) else (
  schtasks /Query /TN "AutoGit" /V /FO LIST | findstr /R "^TaskName: ^Schedule: ^Next Run Time: ^Last Run Time: ^Status:"
)
echo.
echo [Startup]
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AutoGit.lnk"
if exist "%LNK%" (
  echo   - Startup shortcut: Present
) else (
  echo   - Startup shortcut: Not present
)
echo.
echo [Last Log]
for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%LOG_DIR%\run_*.log" 2^>nul ^| findstr /R "." ^| more +0') do (
  echo   - Latest: "%LOG_DIR%\%%F"
  goto :statusDone
)
echo   - No log files yet.
:statusDone
echo ==========================
echo.
goto :eof

:: --- Mode handling ---
set "MODE=%~1"
if "%MODE%"=="" goto :help

if /i "%MODE%"=="tick" (
  call :runRepos
  exit /b 0
)

if /i "%MODE%"=="hey" (
  call :log "👋 HEY mode: run now + add Startup shortcut"
  call :runRepos
  call :createStartupShortcut
  exit /b 0
)

if /i "%MODE%"=="bye" (
  call :log "👋 BYE mode: run now + shutdown"
  call :runRepos
  shutdown /s /t %SHUTDOWN_TIMEOUT%
  exit /b 0
)

if /i "%MODE%"=="auto" (
  call :log "🤖 AUTO mode: run now + register scheduler"
  call :runRepos
  call :registerTask
  exit /b 0
)

if /i "%MODE%"=="status" (
  call :showStatus
  exit /b 0
)

if /i "%MODE%"=="uninstall" (
  call :removeTask
  call :removeStartupShortcut
  echo.
  echo ✅ Uninstall complete.
  exit /b 0
)

:help
echo Usage:
echo   autoGit.bat hey       ^> run once now + add Startup shortcut (future auto at login)
echo   autoGit.bat bye       ^> run once now + shutdown (delay via SHUTDOWN_TIMEOUT)
echo   autoGit.bat auto      ^> run once now + schedule every SCHEDULE_MINUTES
echo   autoGit.bat status    ^> show scheduled task, startup shortcut, and last log
echo   autoGit.bat uninstall ^> remove scheduled task and startup shortcut
exit /b 1
