# 🚀 Evolution API - Configuração WhatsApp

## ✅ Vantagens do Evolution API

- **SEM Puppeteer/Chromium** - Funciona perfeitamente no App Platform
- **API REST completa** - Fácil integração
- **Mais estável** - Sem dependências de navegador
- **Webhooks** - Recebe mensagens em tempo real
- **Multi-instância** - Várias barbearias no mesmo servidor

## 🔧 Como configurar

### 1. **Obter Evolution API**

Você pode usar Evolution API de várias formas:

#### Opção A: Serviço hospedado (Recomendado)
- Contrate um serviço Evolution API já hospedado
- Exemplos: evolutionapi.com, whatsapp-api.com
- Você recebe URL e API Key prontos

#### Opção B: Hospedar seu próprio
- Deploy no Railway, Render, ou VPS
- Repositório: https://github.com/EvolutionAPI/evolution-api
- Mais controle, mas precisa gerenciar

### 2. **Configurar no DigitalOcean**

No painel do App Platform, adicione as variáveis:

```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-api-aqui
```

### 3. **Testar conexão**

Acesse: `https://seu-app.ondigitalocean.app/health`

Deve mostrar:
```json
{
  "status": "ok",
  "service": "hairfy-evolution-api",
  "evolutionApi": "https://sua-evolution-api.com",
  "hasApiKey": true
}
```

## 📱 Como usar

### 1. **Conectar WhatsApp**
```bash
POST /api/whatsapp/connect/sua-barbearia-id
```

### 2. **Obter QR Code**
```bash
GET /api/whatsapp/qr/sua-barbearia-id
```

### 3. **Verificar status**
```bash
GET /api/whatsapp/status/sua-barbearia-id
```

### 4. **Enviar mensagem**
```bash
POST /api/whatsapp/send/sua-barbearia-id
{
  "phone": "5511999999999",
  "message": "Olá! Seu horário foi confirmado."
}
```

## 🔗 Serviços Evolution API recomendados

### 1. **Evolution API Cloud** (Pago)
- URL: https://evolution-api.com
- Planos a partir de $10/mês
- Suporte técnico incluído

### 2. **Self-hosted no Railway** (Gratuito)
- Deploy gratuito no Railway
- Você gerencia sua própria instância
- Template: https://railway.app/template/evolution-api

### 3. **Self-hosted no Render** (Gratuito)
- Deploy gratuito no Render
- Boa para testes
- Pode ter limitações de uso

## ⚙️ Configuração avançada

### Webhooks (Opcional)
Para receber mensagens automaticamente:

```bash
# No Evolution API, configure webhook:
POST /webhook/set/sua-instancia
{
  "url": "https://seu-app.ondigitalocean.app/api/webhook/whatsapp",
  "events": ["messages.upsert"]
}
```

### Múltiplas instâncias
Cada barbearia pode ter sua própria instância:
- `barbearia-1` → Instância separada
- `barbearia-2` → Instância separada
- Cada uma com seu próprio QR Code

## 🚨 Importante

1. **API Key**: Mantenha sua chave segura
2. **Rate Limits**: Respeite os limites da API
3. **Backup**: Evolution API salva sessões automaticamente
4. **Monitoramento**: Verifique logs regularmente

## 🆘 Troubleshooting

### Erro: "Evolution API Key não configurada"
- Verifique se `EVOLUTION_API_KEY` está definida
- Confirme se a chave está correta

### Erro: "HTTP 401 Unauthorized"
- API Key inválida ou expirada
- Verifique com seu provedor Evolution API

### Erro: "Instance not found"
- Instância não foi criada
- Chame `/api/whatsapp/connect/` primeiro

### QR Code não aparece
- Aguarde alguns segundos após conectar
- Verifique se a instância está ativa
- Tente resetar: `/api/whatsapp/reset/`

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs do App Platform
2. Teste as APIs manualmente
3. Consulte documentação do Evolution API
4. Entre em contato com suporte do seu provedor

---

**✅ Pronto!** Seu WhatsApp funcionará perfeitamente no DigitalOcean App Platform sem problemas de Chromium!