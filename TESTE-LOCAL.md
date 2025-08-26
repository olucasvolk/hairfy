# 🧪 Teste Local do WhatsApp

## 🚀 Como testar localmente

### 1. **Instalar dependências** (se ainda não fez)
```bash
npm install
```

### 2. **Executar em modo desenvolvimento**
```bash
npm run dev:full
```

Isso vai iniciar:
- ✅ **Servidor WhatsApp** em `http://localhost:3001`
- ✅ **Frontend Vite** em `http://localhost:5173`

### 3. **Acessar a aplicação**
1. Abra: `http://localhost:5173`
2. Faça login/cadastro
3. Vá para: **Configurações → WhatsApp**

### 4. **Testar WhatsApp**
1. **Aba Conexão**: Clique em "Conectar WhatsApp"
2. **QR Code**: Deve aparecer automaticamente
3. **Escanear**: Use seu celular para escanear
4. **Status**: Deve mudar para "Conectado"

### 5. **Testar Templates**
1. **Aba Templates**: Criar/editar templates
2. **Variáveis**: Use `{{client_name}}`, `{{service_name}}`, etc.
3. **Status**: Ativar/desativar templates

### 6. **Testar Envio**
1. **Aba Teste**: Digite um número
2. **Mensagem**: Digite uma mensagem de teste
3. **Enviar**: Deve chegar no WhatsApp

## 🔧 Logs e Debug

### **Terminal 1** (Servidor WhatsApp)
```
🚀 WhatsApp Dev Server running on http://localhost:3001
📱 Health: http://localhost:3001/health
💬 WhatsApp API: http://localhost:3001/api/whatsapp/
```

### **Terminal 2** (Frontend)
```
  VITE v6.3.5  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🐛 Troubleshooting

### **QR Code não aparece?**
1. Verifique se o servidor está rodando na porta 3001
2. Abra: `http://localhost:3001/health`
3. Deve retornar: `{"status":"ok"}`

### **Socket.IO não conecta?**
- Normal! O sistema usa **HTTP polling** como fallback
- QR Code aparece via polling a cada 2 segundos

### **WhatsApp não conecta?**
1. Certifique-se que não tem outra instância rodando
2. Delete a pasta `.wwebjs_auth` se necessário
3. Tente novamente

### **Erro de CORS?**
- O servidor dev já tem CORS configurado
- Se persistir, verifique se está usando `localhost:5173`

## 📱 Endpoints de Teste

### **Health Check**
```bash
curl http://localhost:3001/health
```

### **Status WhatsApp**
```bash
curl http://localhost:3001/api/whatsapp/status/SEU_BARBERSHOP_ID
```

### **QR Code**
```bash
curl http://localhost:3001/api/whatsapp/qr/SEU_BARBERSHOP_ID
```

## ✅ Checklist de Teste

- [ ] Servidor WhatsApp iniciou (porta 3001)
- [ ] Frontend iniciou (porta 5173)
- [ ] Login funcionando
- [ ] Página WhatsApp carregou
- [ ] Botão "Conectar" funciona
- [ ] QR Code aparece
- [ ] WhatsApp conecta após escanear
- [ ] Status muda para "Conectado"
- [ ] Templates podem ser criados
- [ ] Mensagem de teste envia

## 🚀 Após teste local OK

Se tudo funcionar localmente, faça:

```bash
git add .
git commit -m "WhatsApp funcionando localmente - pronto para produção"
git push origin main
```

O DigitalOcean fará o redeploy automaticamente! 🎉