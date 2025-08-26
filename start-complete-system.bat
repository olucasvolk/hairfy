@echo off
echo 🚀 INICIANDO SISTEMA COMPLETO BARBERFLOW + WHATSAPP + LEMBRETES
echo.

echo 📦 Verificando dependências...
call npm install

echo.
echo 🗄️ IMPORTANTE: Execute o SQL no Supabase primeiro!
echo    Arquivo: setup_reminders_complete.sql
echo.
pause

echo 🌐 Iniciando sistema completo...
echo    - Servidor WhatsApp
echo    - Servidor de Lembretes  
echo    - Interface Web
echo.

start "WhatsApp + Lembretes + Web" cmd /k "npm run start:complete"

echo.
echo ✅ Sistema iniciado com sucesso!
echo.
echo 📋 Serviços rodando:
echo    - WhatsApp: http://localhost:3001
echo    - Web: http://localhost:5173
echo    - Lembretes: Automático (a cada hora)
echo.
echo 📱 Acesse: http://localhost:5173/dashboard/whatsapp/reminders
echo    Para monitorar os lembretes
echo.
pause