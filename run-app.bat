@echo off
cd /d "%~dp0"

setlocal

echo =========================================
echo Iniciando o projeto Pilot Dispatch...
echo =========================================

call npm install
if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080/' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
    echo O projeto ja esta em execucao na porta 8080.
    start "" http://localhost:8080
    exit /b 0
)

start "" http://localhost:8080
call npm run dev
if errorlevel 1 (
    echo.
    echo Falha ao iniciar o projeto.
    pause
    exit /b 1
)

endlocal
