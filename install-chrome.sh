#!/bin/bash

# Script para instalar Chrome/Chromium no DigitalOcean Ubuntu

echo "🚀 Instalando dependências do Chrome..."

# Atualizar sistema
apt-get update

# Instalar dependências básicas
apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    software-properties-common

# Tentar instalar Chromium primeiro (mais leve)
echo "📦 Instalando Chromium..."
apt-get install -y chromium-browser

# Se Chromium não funcionar, instalar Google Chrome
if ! command -v chromium-browser &> /dev/null; then
    echo "📦 Chromium falhou, instalando Google Chrome..."
    
    # Adicionar repositório do Google Chrome
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
    
    # Atualizar e instalar Chrome
    apt-get update
    apt-get install -y google-chrome-stable
fi

# Instalar dependências adicionais para WhatsApp Web
apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2

echo "✅ Instalação concluída!"

# Verificar instalação
if command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium instalado: $(chromium-browser --version)"
    echo "export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> /etc/environment
elif command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome instalado: $(google-chrome --version)"
    echo "export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome" >> /etc/environment
else
    echo "❌ Erro: Nenhum navegador foi instalado com sucesso"
    exit 1
fi

echo "🎉 Chrome/Chromium pronto para WhatsApp Web!"