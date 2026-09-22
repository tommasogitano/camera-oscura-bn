@echo off
rem ---------------------------------------------------------------
rem  Camera Oscura BN - installazione in Photoshop dal pacchetto
rem  Crea dist\CameraOscuraBN-<versione>.ccx dalla cartella bn-studio
rem  e lo installa con l'installatore ufficiale di Creative Cloud.
rem  Da eseguire con Photoshop CHIUSO, dopo ogni modifica al codice.
rem ---------------------------------------------------------------
setlocal
set UPIA=C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe

tasklist /FI "IMAGENAME eq Photoshop.exe" 2>nul | find /I "Photoshop.exe" >nul
if not errorlevel 1 (
  echo   ATTENZIONE: Photoshop e' aperto. Chiudilo e rilancia questo script.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crea-ccx.ps1"
if errorlevel 1 ( echo   Creazione del pacchetto non riuscita. & pause & exit /b 1 )

for %%F in ("%~dp0..\dist\CameraOscuraBN-*.ccx") do set PACCHETTO=%%~fF
"%UPIA%" /install "%PACCHETTO%"
if errorlevel 1 ( echo   Installazione non riuscita. & pause & exit /b 1 )

echo.
echo   Fatto. Riapri Photoshop: il pannello e' in Plugin ^> Camera Oscura BN.
echo.
pause
