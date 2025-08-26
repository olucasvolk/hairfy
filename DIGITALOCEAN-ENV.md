# Variáveis de Ambiente para DigitalOcean

## 🔧 **Configuração no Painel do DigitalOcean**

Vá em **Settings → Environment Variables** e adicione:

### **Variáveis do Sistema**
```
NODE_ENV=production
PORT=8080
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### **Variáveis do Supabase**
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
```

## 📋 **Como obter as variáveis do Supabase:**

1. **Acesse**: https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em**: Settings → API
4. **Copie**:
   - **URL**: Project URL
   - **Key**: anon/public key

## ✅ **Exemplo de configuração:**

```
NODE_ENV=production
PORT=8080
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
VITE_SUPABASE_URL=https://xyzabc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 **Após configurar:**

1. **Salve** as variáveis
2. **Redeploy** a aplicação
3. **Teste** o WhatsApp em: https://sua-app.ondigitalocean.app

## 📱 **Funcionalidades disponíveis:**

- ✅ **Frontend React** - Sistema completo da barbearia
- ✅ **WhatsApp Web** - QR Code e envio de mensagens
- ✅ **Socket.IO** - Comunicação em tempo real
- ✅ **Puppeteer** - Automação do WhatsApp
- ✅ **Supabase** - Banco de dados e autenticação