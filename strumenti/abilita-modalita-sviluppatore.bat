@echo off
title Camera Oscura BN - abilita la modalita sviluppatore UXP
setlocal enableextensions

rem  UXP Developer Tool attiva la modalita sviluppatore scrivendo un file
rem  dentro Program Files, e per farlo servono i privilegi di amministratore.
rem  Se il pulsante "Enable" non produce alcun effetto, e perche UDT non e
rem  stato avviato come amministratore e la scrittura fallisce in silenzio.
rem  Questo script scrive quel file al posto suo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Servono i privilegi di amministratore: confermare la richiesta di Windows.
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "CARTELLA=%CommonProgramFiles%\Adobe\UXP\developer"

echo.
echo  Cartella di destinazione:
echo    %CARTELLA%
echo.

if not exist "%CARTELLA%" mkdir "%CARTELLA%"
if not exist "%CARTELLA%" (
    echo  ERRORE: non e stato possibile creare la cartella.
    echo  Verificare che il percorso Program Files sia accessibile.
    echo.
    pause
    exit /b 1
)

> "%CARTELLA%\settings.json" echo {"developer": true}

if not exist "%CARTELLA%\settings.json" (
    echo  ERRORE: il file non e stato scritto.
    echo.
    pause
    exit /b 1
)

echo  Scritto settings.json con questo contenuto:
echo.
type "%CARTELLA%\settings.json"
echo.
echo  ------------------------------------------------------------
echo   Fatto. Ora:
echo     1. chiudi UXP Developer Tool se e ancora aperto
echo     2. apri Photoshop e lascialo aperto
echo     3. riapri UXP Developer Tool
echo     4. sulla riga di Camera Oscura BN premi Load
echo  ------------------------------------------------------------
echo.
pause
