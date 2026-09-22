@echo off
rem Camera Oscura BN - crea dist\CameraOscuraBN-<versione>.ccx
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crea-ccx.ps1"
pause
