# Deploy no Heroku

## 🚀 **Deploy Automático (1 clique)**

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/olucasvolk/hairfy)

## 📋 **Deploy Manual**

### 1. Criar App no Heroku
```bash
# Instalar Heroku CLI
# Windows: https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Criar app
heroku create hairfy-whatsapp

# Adicionar buildpacks
heroku buildpacks:add https://github.com/jontewks/puppeteer-heroku-buildpack
heroku buildpacks:add heroku/nodejs

# Deploy
git push heroku main
```

### 2. Configurar Variáveis de Ambiente

No painel do Heroku ou via CLI:

```bash
heroku config:set NODE_ENV=production
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
heroku config:set PUPPETEER_EXECUTABLE_PATH=/app/.apt/usr/bin/google-chrome-stable

# Suas variáveis do Supabase
heroku config:set VITE_SUPABASE_URL=sua_url_aqui
heroku config:set VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

## ✅ **Funcionalidades Incluídas**

- ✅ **Frontend React** - Interface completa
- ✅ **WhatsApp Web** - QR Code e mensagens
- ✅ **Socket.IO** - Tempo real
- ✅ **Puppeteer** - Automação WhatsApp
- ✅ **Supabase** - Banco de dados

## 💰 **Custos**

- **Plano Gratuito**: 550 horas/mês (suficiente para testes)
- **Basic ($7/mês)**: 24/7, sem limitações
- **Standard ($25/mês)**: Mais recursos

## 🔗 **URLs**

- **App**: `https://hairfy-whatsapp.herokuapp.com`
- **Health**: `https://hairfy-whatsapp.herokuapp.com/health`
- **WhatsApp API**: `https://hairfy-whatsapp.herokuapp.com/api/whatsapp/`

## 📊 **Monitoramento**

- Logs: `heroku logs --tail`
- Métricas: Painel do Heroku
- Alertas: Configuráveis

## 🆘 **Troubleshooting**

```bash
# Ver logs
heroku logs --tail

# Reiniciar
heroku restart

# Escalar
heroku ps:scale web=1
```