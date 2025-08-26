# 🧪 **Teste Rápido - Sistema de Lembretes**

## ⚡ **Teste em 5 Minutos**

### **1. Configurar Banco (1 min)**
```sql
-- Copie e cole no Supabase SQL Editor:
-- Arquivo: setup_reminders_complete.sql
```

### **2. Iniciar Sistema (1 min)**
```bash
# Opção 1: Tudo junto
npm run start:complete

# Opção 2: Separado
npm run reminders  # Terminal 1
npm run dev        # Terminal 2
```

### **3. Criar Agendamento de Teste (1 min)**
1. Acesse: `http://localhost:5173`
2. Vá em **Agendamentos** → **Novo**
3. Preencha dados do cliente
4. **IMPORTANTE:** Coloque data para **AMANHÃ**
5. Status: **Confirmado**
6. Salve o agendamento

### **4. Testar Lembrete (2 min)**
1. Acesse: `http://localhost:5173/dashboard/whatsapp/reminders`
2. Clique **"Processar Agora"**
3. Verifique se aparece "✅ Lembrete enviado"
4. Confirme no WhatsApp do cliente

## 🔍 **Verificações**

### **✅ Checklist de Funcionamento:**
- [ ] Dependência `node-cron` instalada
- [ ] SQL executado no Supabase
- [ ] WhatsApp conectado
- [ ] Template de lembrete existe
- [ ] Agendamento criado para amanhã
- [ ] Servidor de lembretes rodando
- [ ] Lembrete enviado com sucesso

### **❌ Problemas Comuns:**

**"Template não encontrado"**
- Execute o SQL completo no Supabase
- Verifique se template "appointment_reminder" existe

**"WhatsApp não conectado"**
- Acesse WhatsApp Settings
- Reconecte o WhatsApp

**"Nenhum agendamento para lembrete"**
- Agendamento deve ser para AMANHÃ
- Status deve ser "agendado" ou "confirmado"
- reminder_sent deve ser false

## 📱 **Teste Manual Rápido**

```javascript
// Cole no console do navegador:
fetch('/api/test-reminder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '5532999999999',
    message: 'Teste de lembrete automático!'
  })
});
```

## 🎯 **Resultado Esperado**

**Console do servidor:**
```
🔄 PROCESSANDO LEMBRETES AUTOMÁTICOS...
📅 Buscando agendamentos para: 2025-01-XX
📋 Encontrados 1 agendamentos para lembrete
✅ João Silva - Lembrete enviado para +5532999999999
🎯 PROCESSAMENTO CONCLUÍDO: 1 enviados, 0 erros
```

**WhatsApp do cliente:**
```
⏰ Lembrete de Agendamento

Olá João Silva! 

Lembrando que você tem um agendamento amanhã:

📅 Data: 27/01/2025
🕐 Horário: 14:00
💇 Serviço: Corte + Barba
👨‍💼 Profissional: Carlos
🏪 Local: Barbearia do João

📍 Endereço: Rua das Flores, 123

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.
```

---

**🎉 Se tudo funcionou, o sistema está 100% operacional!**