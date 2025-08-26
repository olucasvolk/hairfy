#!/bin/bash

echo "🌊 DEPLOY PARA DIGITAL OCEAN"
echo "=============================="

# Verificar se está no diretório correto
if [ ! -f "digitalocean-complete-server.js" ]; then
    echo "❌ Arquivo digitalocean-complete-server.js não encontrado!"
    echo "Execute este script na raiz do projeto."
    exit 1
fi

# Build da aplicação React
echo "📦 Building aplicação React..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Diretório dist não foi criado!"
    echo "Verifique se o build foi executado corretamente."
    exit 1
fi

echo "✅ Build concluído!"

# Verificar variáveis de ambiente
echo "🔍 Verificando variáveis de ambiente..."

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "⚠️  VITE_SUPABASE_URL não definida"
    echo "Configure: export VITE_SUPABASE_URL=sua_url_supabase"
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  VITE_SUPABASE_ANON_KEY não definida"
    echo "Configure: export VITE_SUPABASE_ANON_KEY=sua_chave_supabase"
fi

# Build da imagem Docker
echo "🐳 Building imagem Docker..."
docker build -t barberflow-complete .

if [ $? -eq 0 ]; then
    echo "✅ Imagem Docker criada com sucesso!"
else
    echo "❌ Erro ao criar imagem Docker!"
    exit 1
fi

# Iniciar com docker-compose
echo "🚀 Iniciando aplicação..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo "================================"
    echo "🌐 Aplicação: http://localhost:3001"
    echo "📱 WhatsApp: Ativo"
    echo "⏰ Lembretes: Ativo (a cada hora)"
    echo "🔗 Health Check: http://localhost:3001/health"
    echo ""
    echo "📋 Comandos úteis:"
    echo "   docker-compose logs -f    # Ver logs"
    echo "   docker-compose stop       # Parar"
    echo "   docker-compose restart    # Reiniciar"
    echo ""
else
    echo "❌ Erro ao iniciar aplicação!"
    exit 1
fi
