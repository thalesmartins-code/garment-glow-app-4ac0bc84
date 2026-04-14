

## Planejamento Completo: Gestão de Usuários e Login

### Estado Atual

O sistema ja possui uma base solida:
- Login por email/senha via Supabase Auth
- RBAC com 3 cargos (admin, editor, viewer) em tabela separada `user_roles`
- Edge functions para criar usuarios, listar e atualizar cargos (com verificacao de admin server-side)
- RLS policies em todas as tabelas
- ProtectedRoute e RoleRoute para controle de acesso no frontend
- Pagina de perfil com upload de avatar e edicao de nome
- Gestao de visibilidade de menu por cargo

### Lacunas Identificadas

1. **Sem recuperacao de senha** - nao existe fluxo "Esqueci minha senha"
2. **Sem desativacao/exclusao de usuario** - admin nao pode desativar contas
3. **Sem validacao de senha forte** - aceita qualquer senha no cadastro
4. **Edge functions com `verify_jwt = false`** em `admin-list-users` e `admin-create-user` - embora validem JWT no codigo, a config expoe o endpoint
5. **Sem funcao `admin-update-role` no config.toml** - pode estar usando default
6. **Sem log de auditoria** - nao ha registro de quem alterou cargos
7. **Sem confirmacao de acao destrutiva** - mudanca de cargo nao pede confirmacao

### Plano de Implementacao

#### 1. Recuperacao de Senha

**Arquivo: `src/pages/Login.tsx`**
- Adicionar link "Esqueci minha senha" abaixo do formulario
- Abrir dialog pedindo email
- Chamar `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

**Arquivo novo: `src/pages/ResetPassword.tsx`**
- Rota publica `/reset-password`
- Detectar `type=recovery` no hash da URL
- Formulario para nova senha com confirmacao
- Chamar `supabase.auth.updateUser({ password })`
- Validacao: minimo 8 caracteres, pelo menos 1 numero e 1 letra maiuscula

**Arquivo: `src/App.tsx`**
- Adicionar rota `<Route path="/reset-password" element={<ResetPassword />} />`

#### 2. Validacao de Senha Forte

**Arquivo: `src/pages/UserManagement.tsx` e `src/pages/ResetPassword.tsx`**
- Criar funcao utilitaria `validatePassword(pwd)` que exige minimo 8 chars, 1 maiuscula, 1 numero
- Mostrar feedback visual em tempo real (indicador de forca)

**Arquivo: `supabase/functions/admin-create-user/index.ts`**
- Adicionar validacao server-side da senha antes de criar usuario

#### 3. Desativacao de Usuario (Admin)

**Arquivo novo: `supabase/functions/admin-toggle-user/index.ts`**
- Recebe `{ user_id, banned: true/false }`
- Verifica que o chamador e admin
- Usa `adminClient.auth.admin.updateUserById(user_id, { ban_duration: banned ? 'none' : '876000h' })` para banir/desbanir
- Impede que admin bana a si mesmo

**Arquivo: `src/pages/UserManagement.tsx` e `src/pages/Profile.tsx`**
- Adicionar coluna "Status" (Ativo/Inativo) na tabela de usuarios
- Botao toggle com confirmacao via dialog

**Arquivo: `supabase/config.toml`**
- Adicionar `[functions.admin-toggle-user]` com `verify_jwt = false`

#### 4. Confirmacao para Acoes Criticas

**Arquivo: `src/pages/Profile.tsx`**
- Dialog de confirmacao antes de alterar cargo de usuario
- Impedir que admin remova seu proprio cargo de admin

#### 5. Log de Auditoria

**Migracao SQL:**
```sql
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);
```

**Edge functions afetadas:** `admin-create-user`, `admin-update-role`, `admin-toggle-user`
- Inserir registro na `audit_log` apos cada acao (criar usuario, alterar cargo, ativar/desativar)

**Arquivo: `src/pages/Profile.tsx`**
- Adicionar card "Historico de Alteracoes" (somente admin) listando ultimas acoes

#### 6. Seguranca das Edge Functions

**Arquivo: `supabase/functions/admin-list-users/index.ts`**
- Ja valida JWT no codigo (seguro). Manter `verify_jwt = false` pois a validacao interna e suficiente.

**Arquivo: `supabase/functions/admin-create-user/index.ts`**
- Adicionar validacao de input com regex para email e tamanho de senha

### Resumo dos Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/Login.tsx` | Adicionar "Esqueci minha senha" |
| `src/pages/ResetPassword.tsx` | Criar pagina de redefinicao |
| `src/App.tsx` | Adicionar rota `/reset-password` |
| `src/pages/UserManagement.tsx` | Validacao de senha, status de usuario |
| `src/pages/Profile.tsx` | Confirmacao de acoes, audit log card |
| `supabase/functions/admin-create-user/index.ts` | Validacao server-side |
| `supabase/functions/admin-toggle-user/index.ts` | Nova funcao para ativar/desativar |
| `supabase/config.toml` | Registrar nova funcao |
| Migracao SQL | Tabela `audit_log` |

### Ordem de Execucao

1. Recuperacao de senha (Login + ResetPassword + rota)
2. Validacao de senha forte (client + server)
3. Desativacao de usuario (edge function + UI)
4. Confirmacao para acoes criticas (dialogs)
5. Log de auditoria (migracao + edge functions + UI)

