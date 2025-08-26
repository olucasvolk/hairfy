# 🚀 UAZ API WhatsApp Integration - Completa

## ✅ **Configuração UAZ API:**

- **URL Base:** https://hairfycombr.uazapi.com
- **Token:** clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig
- **Documentação:** https://docs.uazapi.com/

## 📱 **APIs Implementadas:**

### 1. **Conectar WhatsApp**
```bash
POST /api/whatsapp/connect/{barbershop-id}
```
- Inicia processo de conexão via UAZ API
- Retorna status da conexão
- Se já conectado, confirma status

### 2. **Obter QR Code**
```bash
GET /api/whatsapp/qr/{barbershop-id}
```
- Obtém QR Code em base64 da UAZ API
- Formato: `data:image/png;base64,{qr_data}`
- Retorna erro se já conectado

### 3. **Verificar Status**
```bash
GET /api/whatsapp/status/{barbershop-id}
```
- Verifica status real via UAZ API
- Retorna: connected, connecting, disconnected
- Inclui número do telefone se conectado

### 4. **Enviar Mensagem**
```bash
POST /api/whatsapp/send/{barbershop-id}
{
  "phone": "5511999999999",
  "message": "Sua mensagem aqui"
}
```
- Envia mensagem via UAZ API
- Formata número automaticamente (adiciona 55 se necessário)
- Retorna ID da mensagem enviada

### 5. **Desconectar**
```bash
POST /api/whatsapp/disconnect/{barbershop-id}
```
- Desconecta via UAZ API
- Limpa dados locais

### 6. **Reset Completo**
```bash
POST /api/whatsapp/reset/{barbershop-id}
```
- Reset completo da conexão
- Limpa todos os dados

## 🔗 **Mapeamento UAZ API:**

| Função Hairfy | Endpoint UAZ API | Método |
|---------------|------------------|---------|
| Conectar | `/instance/connect` | POST |
| Status | `/instance/status` | GET |
| QR Code | `/instance/qr` | GET |
| Enviar | `/message/text` | POST |
| Logout | `/instance/logout` | POST |

## 🎯 **Fluxo de Conexão:**

1. **Usuário clica "Conectar"**
2. **Sistema chama** `/api/whatsapp/connect/{id}`
3. **Servidor chama** UAZ API `/instance/connect`
4. **Frontend inicia polling** para QR Code
5. **UAZ API gera QR Code** → `/instance/qr`
6. **Usuário escaneia** QR Code no WhatsApp
7. **UAZ API confirma** conexão → status `connected`
8. **Sistema atualiza** banco de dados

## 📊 **Health Check:**

```bash
GET /health
```

Retorna:
```json
{
  "status": "ok",
  "service": "hairfy-uaz-whatsapp",
  "uazAPI": {
    "url": "https://hairfycombr.uazapi.com",
    "configured": true,
    "token": "clNjDFU0jD..."
  },
  "activeInstances": ["barbearia-1", "barbearia-2"]
}
```

## 🔐 **Segurança:**

- ✅ **Token seguro** - Não aparece no frontend
- ✅ **HTTPS** - Todas as comunicações criptografadas
- ✅ **CORS** - Configurado corretamente
- ✅ **Validação** - Dados validados antes do envio

## 🚀 **Vantagens UAZ API:**

1. **✅ Profissional** - Serviço dedicado para WhatsApp Business
2. **✅ Estável** - Infraestrutura robusta e confiável
3. **✅ Rápido** - Sem dependências locais pesadas
4. **✅ Escalável** - Suporta múltiplas instâncias
5. **✅ Suporte** - Equipe técnica especializada
6. **✅ Sem Chromium** - Não precisa instalar navegador
7. **✅ Sem Baileys** - Não precisa de bibliotecas complexas

## 🎯 **Exemplo de Uso Completo:**

```javascript
// 1. Conectar WhatsApp
const connectResponse = await fetch('/api/whatsapp/connect/barbearia-1', {
  method: 'POST'
});
const connectResult = await connectResponse.json();

// 2. Polling para QR Code
const pollQR = setInterval(async () => {
  const qrResponse = await fetch('/api/whatsapp/qr/barbearia-1');
  const qrData = await qrResponse.json();
  
  if (qrData.qr) {
    document.getElementById('qr-image').src = qrData.qr;
  }
  
  // Verificar se conectou
  const statusResponse = await fetch('/api/whatsapp/status/barbearia-1');
  const status = await statusResponse.json();
  
  if (status.connected) {
    clearInterval(pollQR);
    console.log('WhatsApp conectado!', status.phoneNumber);
  }
}, 2000);

// 3. Enviar mensagem
const sendMessage = async (phone, message) => {
  const response = await fetch('/api/whatsapp/send/barbearia-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Mensagem enviada!', result.messageId);
  }
};
```

## 🔧 **Debug e Monitoramento:**

- **Health Check:** `/health` - Status geral do sistema
- **Instâncias Ativas:** `/api/whatsapp/instances` - Lista instâncias
- **Logs Detalhados:** Console do servidor mostra todas as operações
- **Socket.IO:** Comunicação em tempo real (opcional)

## 📦 **Dependências Removidas:**

- ❌ `@whiskeysockets/baileys` - Não precisa mais
- ❌ `pino` - Logging simplificado
- ❌ `qrcode` - QR Code vem da UAZ API
- ❌ `qrcode-terminal` - Não precisa mais
- ❌ Chromium/Puppeteer - Não precisa mais

## 🎉 **Resultado Final:**

- **✅ Integração limpa** com UAZ API profissional
- **✅ Código simplificado** sem dependências pesadas
- **✅ Deploy fácil** no DigitalOcean App Platform
- **✅ Estabilidade garantida** pela UAZ API
- **✅ Suporte técnico** disponível
- **✅ Escalabilidade** para múltiplas barbearias

---

**🚀 Pronto para produção!** A integração UAZ API é a solução mais profissional e confiável para WhatsApp Business.