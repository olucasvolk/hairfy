# 🎯 UAZ API - Fluxo Correto Implementado

## ✅ **Fluxo UAZ API Correto:**

### 1. **Criar Instância** (admintoken)
```bash
POST /instance/init
Header: admintoken: clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig
Body: {
  "name": "hairfy-{barbershopId}",
  "systemName": "hairfy",
  "adminField01": "{barbershopId}",
  "adminField02": "whatsapp-integration"
}
```
**Resposta:** `{ "token": "fafa55ae-dc77-4022-b11f-aa13f740ebfe" }`

### 2. **Conectar Instância** (token da instância)
```bash
POST /instance/connect
Header: token: fafa55ae-dc77-4022-b11f-aa13f740ebfe
```

### 3. **Verificar Status** (token da instância)
```bash
GET /instance/status
Header: token: fafa55ae-dc77-4022-b11f-aa13f740ebfe
```
**Resposta:** `{ "connected": true/false, "qrcode": "base64..." }`

### 4. **Enviar Mensagem** (token da instância)
```bash
POST /send/text
Header: token: fafa55ae-dc77-4022-b11f-aa13f740ebfe
Body: {
  "number": "5511999999999",
  "text": "Mensagem"
}
```

### 5. **Desconectar** (token da instância)
```bash
POST /instance/disconnect
Header: token: fafa55ae-dc77-4022-b11f-aa13f740ebfe
```

### 6. **Deletar Instância** (token da instância)
```bash
DELETE /instance
Header: token: fafa55ae-dc77-4022-b11f-aa13f740ebfe
```

## 🔧 **Implementação no Servidor:**

### **Tokens Gerenciados:**
- **Admin Token:** `clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig` (fixo)
- **Instance Tokens:** Armazenados em `Map<barbershopId, instanceToken>`

### **Fluxo de Conexão:**
1. **Usuário clica "Conectar"**
2. **Servidor verifica** se já existe instância para a barbearia
3. **Se não existe:** Cria nova instância com `admintoken`
4. **Armazena** o token da instância retornado
5. **Conecta** a instância usando o token dela
6. **Frontend** verifica QR Code via status da instância

### **Fluxo de Desconexão:**
1. **Usuário clica "Desconectar"**
2. **Servidor desconecta** a instância
3. **Servidor deleta** a instância (sempre!)
4. **Remove** token local da memória

## 📱 **APIs Implementadas:**

| Endpoint | Método | Função |
|----------|--------|---------|
| `/api/whatsapp/connect/{id}` | POST | Criar/Conectar instância |
| `/api/whatsapp/status/{id}` | GET | Status + QR Code |
| `/api/whatsapp/qr/{id}` | GET | Apenas QR Code |
| `/api/whatsapp/send/{id}` | POST | Enviar mensagem |
| `/api/whatsapp/disconnect/{id}` | POST | Desconectar + Deletar |
| `/api/whatsapp/reset/{id}` | POST | Reset completo |
| `/api/test-uaz` | GET | Teste de conectividade |

## 🎯 **Vantagens da Implementação:**

- ✅ **Fluxo correto** - Segue exatamente a documentação UAZ
- ✅ **Gerenciamento de tokens** - Admin vs Instance tokens
- ✅ **Limpeza automática** - Sempre deleta instância ao desconectar
- ✅ **Teste integrado** - Endpoint para testar conectividade
- ✅ **Logs detalhados** - Acompanhar cada operação
- ✅ **Error handling** - Tratamento de erros robusto

## 🧪 **Teste de Conectividade:**

O endpoint `/api/test-uaz` faz:
1. **Cria** instância de teste
2. **Verifica** se funcionou
3. **Deleta** instância de teste
4. **Retorna** resultado

## 🚀 **Pronto para Usar:**

Agora o sistema segue exatamente o fluxo da UAZ API:
- **admintoken** para operações administrativas
- **token da instância** para operações do WhatsApp
- **Limpeza automática** de instâncias
- **Gerenciamento correto** de tokens

**🎉 Implementação 100% compatível com UAZ API!**