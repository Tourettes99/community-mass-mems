@echo off
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit','-Command',\"Set-Location 'c:\Users\isman\Documents\community-mass-mems'; node server.js\""
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit','-Command',\"Set-Location 'c:\Users\isman\Documents\community-mass-mems\client'; $env:PORT='3001'; npx react-scripts start\""
