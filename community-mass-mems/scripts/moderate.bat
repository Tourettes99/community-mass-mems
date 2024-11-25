@echo off
cd %~dp0\..
title Community Mass Memories - Moderation Console

:: Install required packages if not already installed
npm install

:: Run the interactive moderation script
node scripts/moderate-interactive.js

:: Keep the window open if there was an error
pause
