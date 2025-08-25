@echo off
echo Parando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo Iniciando servidor WhatsApp...
node whatsapp-server.js
pause