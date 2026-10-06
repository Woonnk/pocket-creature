@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\electron\dist\electron.exe (
  echo Installing the desktop runtime. Internet is needed for this first run.
  call npm install
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
call npm start
if errorlevel 1 pause
