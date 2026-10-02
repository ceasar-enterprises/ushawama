@echo off
title Ushawama firewall setup (one time)
>nul 2>&1 fltmc || (
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs" && exit /b
)
netsh advfirewall firewall delete rule name="Ushawama API 4000" >nul 2>&1
netsh advfirewall firewall add rule name="Ushawama API 4000" dir=in action=allow protocol=TCP localport=4000 program="C:\Program Files\nodejs\node.exe" profile=any
netsh advfirewall firewall delete rule name="Ushawama Metro 8081" >nul 2>&1
netsh advfirewall firewall add rule name="Ushawama Metro 8081" dir=in action=allow protocol=TCP localport=8081 program="C:\Program Files\nodejs\node.exe" profile=any
echo.
echo Done. Phone on the same Wi-Fi can now reach the PC on :4000 and :8081.
pause