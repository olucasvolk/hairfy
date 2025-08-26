# 🌊 **Deploy Completo no Digital Ocean**

## 🎯 **Sistema Integrado**
- ✅ **WhatsApp Web.js** (conexão local)
- ✅ **Lembretes Automáticos** (cron job)
- ✅ **Interface Web** (React)
- ✅ **API Completa** (Node.js)

---

## 🚀 **Deploy Automático**

### **1. Preparar Ambiente**
```bash
# No seu servidor Digital Ocean
git clone seu-repositorio
cd barberflow-saas

# Instalar Docker (se não tiver)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### **2. Configurar Variáveis**
```bash
# Configurar variáveis de ambiente
export VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
export VITE_SUPABASE_ANON_KEY="sua-chave-anonima-supabase"

# Ou criar arquivo .env
echo "VITE_SUPABASE_URL=https://seu-projeto.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=sua-chave-anonima-supabase" >> .env
```

### **3. Executar Deploy**
```bash
# Deploy automático
chmod +x deploy-do.sh
./deploy-do.sh

# Ou manual
npm run build
docker build -t barberflow-complete .
docker-compose up -d
```

---

## 🔧 **Configuração Manual**

### **1. Banco de Dados**
Execute no Supabase SQL Editor:
```sql
-- Copie e cole todo o conteúdo de:
-- setup_reminders_complete.sql
```

### **2. Verificar Saúde**
```bash
# Verificar se está funcionando
curl http://localhost:3001/health

# Resposta esperada:
{
  "status": "ok",
  "service": "hairfy-complete",
  "whatsapp": "active",
  "reminders": "active"
}
```

### **3. Logs em Tempo Real**
```bash
# Ver logs da aplicação
docker-compose logs -f

# Ver apenas logs do WhatsApp
docker-compose logs -f | grep "WhatsApp"

# Ver apenas logs dos lembretes
docker-compose logs -f | grep "LEMBRETE"
```

---

## 📱 **Funcionalidades Ativas**

### **WhatsApp**
- ✅ Conexão via QR Code
- ✅ Envio de mensagens
- ✅ Confirmações automáticas
- ✅ Reconexão automática

### **Lembretes**
- ✅ Processamento a cada hora
- ✅ Lembretes 24h antes
- ✅ Templates personalizáveis
- ✅ Controle de duplicação

### **Interface Web**
- ✅ Dashboard completo
- ✅ Gestão de agendamentos
- ✅ Configuração WhatsApp
- ✅ Monitoramento de lembretes

---

## 🔍 **Monitoramento**

### **Endpoints de Saúde**
```bash
# Status geral
curl http://seu-ip:3001/health

# Processar lembretes manualmente
curl -X POST http://seu-ip:3001/api/reminders/process

# Status WhatsApp específico
curl http://seu-ip:3001/api/whatsapp/status/barbershop-id
```

### **Comandos Docker**
```bash
# Ver containers rodando
docker ps

# Parar aplicação
docker-compose stop

# Reiniciar aplicação
docker-compose restart

# Ver logs
docker-compose logs -f

# Atualizar aplicação
git pull
docker-compose build
docker-compose up -d
```

---

## 🛠️ **Resolução de Problemas**

### **WhatsApp não conecta**
```bash
# Limpar cache do WhatsApp
docker-compose down
docker volume rm $(docker volume ls -q | grep whatsapp)
docker-compose up -d

# Ver logs específicos
docker-compose logs -f | grep -i whatsapp
```

### **Lembretes não funcionam**
```bash
# Verificar cron job
docker-compose logs -f | grep -i cron

# Processar manualmente
curl -X POST http://localhost:3001/api/reminders/process

# Verificar banco de dados
# Execute no Supabase: SELECT * FROM appointments WHERE appointment_date = CURRENT_DATE + 1;
```

### **Interface não carrega**
```bash
# Verificar se build foi feito
ls -la dist/

# Rebuild se necessário
npm run build
docker-compose build
docker-compose up -d
```

---

## 🔒 **Segurança**

### **Firewall**
```bash
# Abrir apenas porta necessária
sudo ufw allow 3001
sudo ufw enable
```

### **SSL/HTTPS** (Opcional)
```bash
# Instalar Nginx como proxy reverso
sudo apt install nginx

# Configurar SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### **Backup**
```bash
# Backup dos dados WhatsApp
docker run --rm -v barberflow_whatsapp_auth:/data -v $(pwd):/backup alpine tar czf /backup/whatsapp-backup.tar.gz -C /data .

# Restaurar backup
docker run --rm -v barberflow_whatsapp_auth:/data -v $(pwd):/backup alpine tar xzf /backup/whatsapp-backup.tar.gz -C /data
```

---

## 📊 **Métricas**

### **Verificar Performance**
```bash
# Uso de recursos
docker stats

# Logs de performance
docker-compose logs -f | grep -E "(enviado|erro|processamento)"

# Verificar agendamentos processados
curl http://localhost:3001/api/reminders/stats
```

---

## 🎉 **Resultado Final**

Após o deploy, você terá:

- 🌐 **Interface Web**: `http://seu-ip:3001`
- 📱 **WhatsApp**: Conectado e funcionando
- ⏰ **Lembretes**: Automáticos a cada hora
- 🔄 **Auto-restart**: Em caso de falha
- 📊 **Monitoramento**: Endpoints de saúde
- 🔒 **Segurança**: Containerizado

**Sistema 100% funcional no Digital Ocean!** 🚀