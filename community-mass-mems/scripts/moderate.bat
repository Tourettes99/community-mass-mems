@echo off
title Community Mass Memories - Moderation Console

cd %~dp0\..

echo Installing dependencies...
call npm install

echo Starting moderation console...
node scripts/moderate-interactive.js

if errorlevel 1 (
    echo Error occurred while running the script
    echo Press any key to exit...
    pause > nul
) else (
    echo Press any key to exit...
    pause > nul
)
