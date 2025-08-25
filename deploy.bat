@echo off
echo 🚀 Iniciando deploy automatico...
echo.

echo 🛑 Parando processos Node.js...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Processos parados

echo.
echo ⏳ Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo 📦 Fazendo build da aplicacao...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro no build
    pause
    exit /b 1
)
echo ✅ Build concluido

echo.
echo ⏳ Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo 🚀 Fazendo deploy para o Railway...
railway up --detach
if %errorlevel% neq 0 (
    echo ❌ Erro no deploy
    echo.
    echo 💡 Possiveis solucoes:
    echo 1. Instale o Railway CLI: npm install -g @railway/cli
    echo 2. Faca login: railway login
    echo 3. Tente novamente: railway up
    pause
    exit /b 1
)

echo.
echo ✅ Deploy iniciado com sucesso!
echo.
echo ⏳ Aguardando deploy finalizar...
timeout /t 10 /nobreak >nul

echo.
echo 🌐 Obtendo URL da aplicacao...
railway domain
if %errorlevel% neq 0 (
    echo ℹ️ Verifique o dashboard do Railway para obter a URL
    echo 🔗 https://railway.app/dashboard
)

echo.
echo 🎉 Deploy automatico concluido!
echo.
echo 📋 Proximos passos:
echo 1. Acesse a URL da aplicacao
echo 2. Configure sua barbearia
echo 3. Conecte o WhatsApp
echo 4. Teste o envio de mensagens
echo.
pause