@echo off
title Ushawama Demo Launcher
rem Run this from anywhere - it resolves its own folder.
cd /d "%~dp0"

echo [1/2] Starting Ushawama API on :4000 ...
start "Ushawama API (4000)" node src\api\server.js

echo [2/2] Starting Expo web on :8081 ...
start "Ushawama Expo (8081)" cmd /k "npx.cmd expo start --web"

echo.
echo Both started. Open this on your PC:
echo    PC  : http://localhost:8081        (Chrome - mic + audio)
echo    Phone: scan the QR shown in the Expo window, same Wi-Fi
echo        : or in Expo Go type   exp://YOUR-LAN-IP:8081
echo Close the two small windows when done.
pause