# Deploy no DigitalOcean App Platform

## Pré-requisitos
1. Conta no DigitalOcean
2. Repositório GitHub configurado
3. Supabase configurado

## Passo a Passo

### 1. Criar App no DigitalOcean
1. Acesse [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Clique em "Create App"
3. Conecte seu repositório GitHub: `olucasvolk/hairfy`
4. Selecione a branch `main`

### 2. Configurar o Serviço
- **Name**: `hairfy-whatsapp`
- **Source Type**: GitHub
- **Branch**: main
- **Autodeploy**: Enabled

### 3. Configurar Build & Deploy
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`
- **Output Directory**: `dist`

### 4. Configurar Variáveis de Ambiente
Adicione estas variáveis no painel do DigitalOcean:

```
NODE_ENV=production
PORT=3001
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Supabase (copie do seu projeto)
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

### 5. Configurar Recursos
- **Plan**: Basic ($5/mês)
- **Instance Size**: Basic
- **Instance Count**: 1

### 6. Deploy
1. Clique em "Create Resources"
2. Aguarde o build e deploy (5-10 minutos)
3. Acesse a URL fornecida

## Funcionalidades Incluídas

✅ **Frontend React** - Interface completa da barbearia
✅ **WhatsApp Web Integration** - QR Code e envio de mensagens
✅ **Socket.IO** - Comunicação em tempo real
✅ **Puppeteer** - Automação do WhatsApp Web
✅ **Supabase** - Banco de dados e autenticação
✅ **Armazenamento Persistente** - Sessões do WhatsApp mantidas

## URLs da Aplicação

- **Frontend**: `https://sua-app.ondigitalocean.app`
- **Health Check**: `https://sua-app.ondigitalocean.app/health`
- **WhatsApp API**: `https://sua-app.ondigitalocean.app/api/whatsapp/`

## Monitoramento

O DigitalOcean fornece:
- Logs em tempo real
- Métricas de performance
- Alertas automáticos
- Backup automático

## Custos Estimados

- **App Platform**: $5-12/mês
- **Bandwidth**: Incluído
- **Build Minutes**: Incluído
- **Total**: ~$5-12/mês

## Suporte

- Suporte 24/7 do DigitalOcean
- Documentação completa
- Community forums
- Escalabilidade automática

## Próximos Passos

1. Configure seu domínio personalizado
2. Configure SSL (automático)
3. Configure backups
4. Configure alertas de monitoramento