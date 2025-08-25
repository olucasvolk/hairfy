# 🚀 Deploy Automático - BarberFlow

## Deploy com Railway (Recomendado)

### Opção 1: Deploy Automático (Mais Fácil)

```bash
npm run deploy
```

Este comando vai:
1. Instalar o Railway CLI se necessário
2. Fazer login no Railway
3. Criar um novo projeto
4. Fazer build da aplicação
5. Fazer deploy automático
6. Mostrar a URL da aplicação

### Opção 2: Deploy Manual

1. **Instalar Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login no Railway:**
```bash
railway login
```

3. **Criar projeto:**
```bash
railway init
```

4. **Build da aplicação:**
```bash
npm run build
```

5. **Deploy:**
```bash
railway up
```

6. **Obter URL:**
```bash
railway domain
```

## Configuração de Variáveis de Ambiente

No dashboard do Railway, adicione estas variáveis:

```
NODE_ENV=production
PORT=3001
```

## Configuração do Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings → API
4. Copie a URL e a chave anônima
5. Atualize o arquivo `src/lib/supabase.ts` com suas credenciais

## Recursos Incluídos

✅ **Frontend React + Vite**
- Interface completa da barbearia
- Dashboard com relatórios
- Gestão de agendamentos
- Configuração WhatsApp

✅ **Backend Node.js + Express**
- API REST completa
- Integração WhatsApp Web real
- WebSocket para tempo real
- Suporte a múltiplas barbearias

✅ **WhatsApp Integration**
- QR Code real para conexão
- Envio de mensagens automáticas
- Templates personalizáveis
- Teste de envio

✅ **Banco de Dados Supabase**
- PostgreSQL completo
- Autenticação integrada
- Storage para arquivos
- Políticas de segurança (RLS)

## Monitoramento

- **Logs:** `railway logs`
- **Status:** `railway status`
- **Restart:** `railway restart`

## Suporte

Se tiver problemas:
1. Verifique os logs: `railway logs`
2. Reinicie o serviço: `railway restart`
3. Verifique as variáveis de ambiente no dashboard

## Custos

- **Railway:** Gratuito até 500 horas/mês
- **Supabase:** Gratuito até 50MB de dados
- **Total:** Gratuito para começar! 🎉

## Próximos Passos Após Deploy

1. ✅ Acesse a URL da aplicação
2. ✅ Crie sua conta
3. ✅ Configure sua barbearia
4. ✅ Adicione serviços e funcionários
5. ✅ Conecte o WhatsApp
6. ✅ Teste o envio de mensagens
7. ✅ Comece a usar! 🚀