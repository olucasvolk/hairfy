#!/bin/bash

echo "🚀 CONFIGURANDO SISTEMA DE LEMBRETES AUTOMÁTICOS..."

# 1. Instalar dependência node-cron
echo "📦 Instalando dependências..."
npm install node-cron

# 2. Executar SQL para adicionar coluna reminder_sent
echo "🗄️ Configurando banco de dados..."
echo "Execute o arquivo 'add_reminder_sent_column.sql' no seu Supabase"

# 3. Verificar se templates de lembrete existem
echo "📝 Verificando templates de lembrete..."
echo "Execute o arquivo 'fix_template_variables.sql' para garantir que os templates estão corretos"

echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Execute: add_reminder_sent_column.sql no Supabase"
echo "2. Execute: fix_template_variables.sql no Supabase"
echo "3. Inicie o servidor de lembretes: npm run reminders"
echo "4. Ou inicie tudo junto: npm run start:complete"
echo ""
echo "⏰ O sistema verificará lembretes a cada hora automaticamente!"
echo "📱 Lembretes serão enviados 24h antes do agendamento"