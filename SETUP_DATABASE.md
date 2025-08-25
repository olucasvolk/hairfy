# Configuração do Banco de Dados - BarberFlow SaaS

## Passo a Passo para Configurar o Supabase

### 1. Acesse o Supabase Dashboard
- Vá para [https://supabase.com](https://supabase.com)
- Faça login na sua conta
- Acesse o projeto: `eubmuubokczxlustnpyx`

### 2. Execute os Scripts SQL

Execute os scripts na seguinte ordem no **SQL Editor** do Supabase:

#### 2.1. Criar Tabelas e Estrutura
```sql
-- Cole e execute todo o conteúdo do arquivo: database_schema.sql
```

#### 2.2. Configurar Políticas de Segurança
```sql
-- Cole e execute todo o conteúdo do arquivo: database_policies.sql
```

#### 2.3. Criar Funções e Triggers
```sql
-- Cole e execute todo o conteúdo do arquivo: database_functions.sql
```

#### 2.4. Inserir Dados Iniciais
```sql
-- Cole e execute todo o conteúdo do arquivo: database_seed.sql
```

### 3. Verificar a Configuração

Após executar todos os scripts, você deve ter as seguintes tabelas:

- ✅ `users` - Usuários do sistema
- ✅ `barbershops` - Barbearias
- ✅ `services` - Serviços oferecidos
- ✅ `staff_members` - Profissionais
- ✅ `clients` - Clientes
- ✅ `products` - Produtos
- ✅ `appointments` - Agendamentos
- ✅ `sales` - Vendas
- ✅ `sale_items` - Itens de venda
- ✅ `appointment_products` - Produtos usados em agendamentos
- ✅ `subscription_plans` - Planos de assinatura
- ✅ `user_subscriptions` - Assinaturas dos usuários

### 4. Configurar Autenticação

No painel do Supabase, vá em **Authentication > Settings**:

1. **Site URL**: Configure para `http://localhost:5173` (desenvolvimento)
2. **Redirect URLs**: Adicione `http://localhost:5173/**`
3. **Email Templates**: Personalize se necessário

### 5. Testar a Aplicação

1. Execute o projeto: `npm run dev`
2. Acesse: `http://localhost:5173`
3. Teste o cadastro de um novo usuário
4. Verifique se a barbearia é criada automaticamente
5. Teste o login e acesso ao dashboard

### 6. Funcionalidades Implementadas

#### Automações do Banco:
- ✅ Criação automática de usuário e barbearia no cadastro
- ✅ Atualização automática de estatísticas do cliente
- ✅ Controle automático de estoque de produtos
- ✅ Cálculo automático de totais de vendas
- ✅ Triggers para campos `updated_at`

#### Segurança (RLS):
- ✅ Usuários só acessam dados de suas próprias barbearias
- ✅ Isolamento completo entre diferentes barbearias
- ✅ Políticas de segurança em todas as tabelas

### 7. Próximos Passos

Após configurar o banco, você pode:

1. **Personalizar os planos**: Edite os valores e recursos em `subscription_plans`
2. **Adicionar dados de teste**: Descomente e ajuste o código em `database_seed.sql`
3. **Configurar produção**: Ajuste as URLs para seu domínio final
4. **Implementar pagamentos**: Integre com Stripe ou similar

### 8. Troubleshooting

#### Erro de Permissão:
- Verifique se RLS está habilitado
- Confirme se as políticas foram criadas corretamente

#### Erro de Função:
- Execute os scripts na ordem correta
- Verifique se todas as extensões estão habilitadas

#### Erro de Autenticação:
- Confirme as variáveis de ambiente no `.env`
- Verifique as configurações de Auth no Supabase

### 9. Comandos Úteis

```sql
-- Ver todas as tabelas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Ver políticas RLS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Ver triggers
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';
```

## Suporte

Se encontrar problemas, verifique:
1. Console do navegador para erros JavaScript
2. Logs do Supabase no dashboard
3. Configurações de RLS e políticas