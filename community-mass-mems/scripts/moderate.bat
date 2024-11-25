@echo off
cd /d %~dp0
title Community Mass Memories - Moderation Console

:: Install required packages if not already installed
call npm install inquirer@^8.2.5 chalk@^4.1.2 boxen@^5.1.2 2>nul

:: Run the interactive moderation script
node moderate-interactive.js

:: Keep the window open if there was an error
if errorlevel 1 pause
