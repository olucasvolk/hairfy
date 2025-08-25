# 📱 Configuração WhatsApp Real

## Como usar a integração WhatsApp

### 1. Iniciar o servidor WhatsApp

Você tem 3 opções:

**Opção A - Script automático (Recomendado):**
```bash
npm run start:full
```
Isso inicia tanto o servidor WhatsApp quanto o frontend.

**Opção B - Separadamente:**
```bash
# Terminal 1 - Servidor WhatsApp
npm run whatsapp

# Terminal 2 - Frontend
npm run dev
```

**Opção C - Windows (duplo clique):**
Execute o arquivo `start-whatsapp.bat`

### 2. Conectar WhatsApp

1. Acesse a página de configurações do WhatsApp no sistema
2. Clique em "Conectar WhatsApp"
3. Um QR Code real aparecerá na tela
4. Abra o WhatsApp no seu celular
5. Vá em **Menu → Dispositivos conectados**
6. Toque em **"Conectar um dispositivo"**
7. Escaneie o QR Code que apareceu na tela

### 3. Pronto!

Agora o sistema enviará mensagens reais do WhatsApp para seus clientes quando:
- Um agendamento for criado (confirmação)
- Próximo ao horário do agendamento (lembrete)

## ⚠️ Importante

- **Mantenha o servidor WhatsApp rodando**: Se você fechar o terminal/janela, o WhatsApp desconecta
- **Use um número dedicado**: Recomendamos usar um número específico para a barbearia
- **WhatsApp Business**: Funciona melhor com WhatsApp Business
- **Primeira conexão**: Pode demorar alguns segundos para gerar o QR Code

## 🔧 Solução de Problemas

**QR Code não aparece:**
- Verifique se o servidor está rodando na porta 3001
- Recarregue a página

**Não conecta após escanear:**
- Tente desconectar e conectar novamente
- Verifique sua conexão com a internet

**Mensagens não enviam:**
- Verifique se o WhatsApp ainda está conectado
- Números devem estar no formato: +55 11 99999-9999

## 📋 Recursos

✅ QR Code real do WhatsApp Web
✅ Conexão persistente
✅ Envio de mensagens reais
✅ Templates personalizáveis
✅ Histórico de mensagens
✅ Status de entrega
✅ Múltiplas barbearias (cada uma tem sua sessão)

## 🚀 Próximos Passos

Para produção, considere:
- Usar WhatsApp Business API oficial
- Servidor dedicado para WhatsApp
- Backup das sessões
- Monitoramento de conexão