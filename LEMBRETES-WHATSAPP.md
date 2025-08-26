# 🕐 Sistema de Lembretes Automáticos WhatsApp

## 🎯 **Funcionalidade**
Sistema que envia automaticamente lembretes por WhatsApp **24 horas antes** de cada agendamento.

## ⚙️ **Configuração**

### 1. **Instalar Dependências**
```bash
npm install node-cron
```

### 2. **Configurar Banco de Dados**
Execute no Supabase SQL Editor:
```sql
-- Executar: add_reminder_sent_column.sql
-- Executar: fix_template_variables.sql
```

### 3. **Iniciar Servidor de Lembretes**
```bash
# Apenas lembretes
npm run reminders

# Ou tudo junto (recomendado)
npm run start:complete
```

## 🚀 **Como Funciona**

### **Fluxo Automático:**
1. **Servidor roda** a cada hora (cron job)
2. **Verifica agendamentos** para o dia seguinte
3. **Filtra apenas** status "agendado" e "confirmado"
4. **Envia lembretes** para quem ainda não recebeu
5. **Marca como enviado** para não duplicar

### **Condições para Envio:**
- ✅ Agendamento para **amanhã**
- ✅ Status: **"agendado"** ou **"confirmado"**
- ✅ **Não enviado** anteriormente (`reminder_sent = false`)
- ✅ WhatsApp **conectado**
- ✅ Template de lembrete **ativo**

## 📱 **Templates de Lembrete**

### **Variáveis Disponíveis:**
- `{cliente_nome}` → Nome do cliente
- `{data}` → Data do agendamento (DD/MM/AAAA)
- `{horario}` → Horário do agendamento
- `{servico}` → Nome do serviço
- `{preco}` → Preço formatado (R$ XX,XX)
- `{profissional}` → Nome do profissional
- `{barbearia_nome}` → Nome da barbearia
- `{barbearia_endereco}` → Endereço da barbearia

### **Template Padrão:**
```
⏰ *Lembrete de Agendamento*

Olá {cliente_nome}! 

Lembrando que você tem um agendamento *amanhã*:

📅 *Data:* {data}
🕐 *Horário:* {horario}
💇 *Serviço:* {servico}
👨‍💼 *Profissional:* {profissional}
🏪 *Local:* {barbearia_nome}

📍 *Endereço:* {barbearia_endereco}

Nos vemos amanhã! 😊
Caso precise remarcar, entre em contato conosco.
```

## 🖥️ **Monitoramento**

### **Página de Administração:**
Acesse: `/dashboard/whatsapp/reminders`

**Funcionalidades:**
- 📊 Estatísticas de lembretes
- 📋 Lista de agendamentos de amanhã
- ✅ Status de envio de cada lembrete
- 🔄 Botão para processar manualmente

### **Logs do Servidor:**
```bash
# Ver logs em tempo real
npm run reminders

# Logs mostram:
# - Agendamentos encontrados
# - Lembretes enviados
# - Erros e falhas
# - Estatísticas do processamento
```

## 🔧 **Comandos Úteis**

```bash
# Instalar dependências
npm install

# Iniciar apenas lembretes
npm run reminders

# Iniciar sistema completo
npm run start:complete

# Desenvolvimento completo
npm run dev:full
```

## 📋 **Checklist de Configuração**

- [ ] Dependência `node-cron` instalada
- [ ] SQL `add_reminder_sent_column.sql` executado
- [ ] SQL `fix_template_variables.sql` executado
- [ ] WhatsApp conectado e funcionando
- [ ] Template de lembrete criado e ativo
- [ ] Servidor de lembretes rodando
- [ ] Testado com agendamento para amanhã

## 🎯 **Teste do Sistema**

### **Para Testar:**
1. **Crie um agendamento** para amanhã
2. **Aguarde** o processamento automático (a cada hora)
3. **Ou processe manualmente** na página de lembretes
4. **Verifique** se o cliente recebeu o lembrete
5. **Confirme** que `reminder_sent = true` no banco

### **Teste Manual:**
```bash
# Iniciar servidor e aguardar 5 segundos
npm run reminders

# Ou acessar a página de lembretes e clicar "Processar Agora"
```

## ⚠️ **Importante**

- **Servidor deve ficar rodando** para funcionar automaticamente
- **Lembretes são enviados apenas uma vez** por agendamento
- **Horário de verificação:** A cada hora (minuto 0)
- **Fuso horário:** Baseado no servidor
- **Rate limiting:** 2 segundos entre cada envio

## 🚀 **Próximas Melhorias**

- [ ] Lembretes personalizáveis por horário
- [ ] Lembretes de confirmação (2h antes)
- [ ] Dashboard com métricas detalhadas
- [ ] Integração com outros canais (SMS, Email)
- [ ] Agendamento de lembretes customizados

---

**🎉 Sistema de Lembretes Automáticos Implementado com Sucesso!**