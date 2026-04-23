

# Nova arquitetura de Acesso, Login, Usuários, Perfil e Sellers

## Visão geral

Transformar o app em um SaaS multi-tenant real, onde cada empresa cliente é uma **Organização** isolada. Toda a base — usuários, sellers, lojas, integrações, dados de vendas — passa a ser escopada por organização. O acesso entra **somente por convite** enviado pelo Owner/Admin da organização. Permissões seguem 4 roles fixos por organização: **Owner, Admin, Member, Viewer**. Segurança ganha 2FA TOTP opcional, gestão de sessões e bloqueio anti-brute-force.

## O que muda para o usuário

**Login**
- Tela de login sem cadastro público.
- Botão "Tem um convite?" para colar token de convite + criar senha.
- Suporte opcional a 2FA (código de 6 dígitos no app autenticador).
- Mensagem amigável após 5 tentativas erradas (bloqueio temporário de 15 min).

**Dentro do app**
- Seletor de **Organização** no canto superior esquerdo (caso o usuário pertença a mais de uma).
- Sellers, lojas, integrações e dados ficam restritos à organização ativa.
- Página **Configurações da Organização** (somente Owner/Admin):
  - Dados da empresa (nome, slug, logo).
  - Membros (convidar / remover / mudar role).
  - Convites pendentes (reenviar / revogar).
  - Audit log da organização.
- Página **Perfil** ganha: troca de senha, ativar/desativar 2FA, ver sessões ativas e revogar dispositivos.
- Owner pode transferir a propriedade da organização para outro membro.

**Roles e o que cada um pode fazer**

```text
Owner   → tudo, único que pode deletar a org / transferir propriedade
Admin   → membros, sellers, integrações, configurações, todos os dados
Member  → CRUD em sellers, lojas e dados operacionais; não toca em membros
Viewer  → apenas leitura de dashboards e relatórios
```

## Arquitetura técnica

**Banco (migrations)**

1. Tabela `organizations` (já existe) vira fonte de verdade do tenant.
2. Tabela `organization_members` (já existe) com enum `org_role` estendido para `owner | admin | member | viewer`.
3. Nova `organization_invites`: `id, org_id, email, role, token_hash, invited_by, expires_at (7 dias), accepted_at`.
4. Nova `user_sessions`: `id, user_id, device_label, ip, user_agent, last_seen_at, revoked_at` (alimentada pelo client a cada refresh de token).
5. Nova `failed_login_attempts`: `email, ip, attempted_at` (para bloqueio anti-brute-force).
6. Adicionar `organization_id` (NOT NULL, FK → organizations) em: `sellers`, `seller_stores`, `ml_tokens`, `ml_user_cache`, todos os `ml_*_cache`, `ml_sync_log`, `sales_data`, `shopee_*`, `audit_log`. Migração popula `organization_id` criando uma org por usuário existente e atribuindo todos os recursos dele.
7. Refazer **todas as RLS** dessas tabelas: substituir `user_id = auth.uid()` por `is_org_member(auth.uid(), organization_id)`. Mutações exigem `get_org_role(auth.uid(), organization_id) IN ('owner','admin','member')`.
8. Função `has_org_role(_user_id, _org_id, _role)` security-definer para checagens finas.
9. Tabela `user_roles` global é descontinuada (papel global "admin" some). O role passa a ser **por organização**.

**Edge Functions**

- `org-invite-create` — Owner/Admin gera convite, hash do token salvo no DB, e-mail enviado via Lovable Emails.
- `org-invite-accept` — Aceita convite (cria conta se necessário, valida token, vincula à org, expira o convite).
- `org-member-update-role` — Mudar role de membro (Owner/Admin), com proteção: nunca remover o último Owner.
- `org-member-remove` — Remover membro da org.
- `org-transfer-ownership` — Owner transfere propriedade.
- `auth-2fa-enroll` / `auth-2fa-verify` / `auth-2fa-disable` — Fluxo TOTP (segredo gerado server-side, QR code retornado, validação de código de 6 dígitos).
- `auth-login-guard` — Chamada antes do login: registra tentativa, bloqueia se 5+ falhas no mesmo email/IP nos últimos 15 min.
- Atualizar `admin-create-user`, `admin-list-users`, `admin-toggle-user`, `admin-update-role` → renomear/refatorar como variantes de `org-*` escopadas pela org do caller.

**Frontend**

- Novo `OrganizationContext` (substitui o role global do `AuthContext`): expõe `currentOrg`, `orgs[]`, `orgRole`, `switchOrg(id)`.
- `ProtectedRoute` valida sessão; `RoleRoute` passa a checar `orgRole` e a tabela `roleAccess` re-mapeada para os 4 novos roles.
- Tela nova **`/aceitar-convite?token=...`** — cria senha, ativa conta, entra direto na org.
- Tela nova **`/api/organizacao`** (Owner/Admin) — abas: Geral, Membros, Convites, Audit.
- `/api/perfil` ganha seções: Segurança (senha + 2FA) e Sessões.
- `/api/usuarios` é removida (substituída por `/api/organizacao`).
- `/api/sellers` continua, mas filtra automaticamente pela org ativa.
- Header passa a mostrar **OrganizationSwitcher** + **SellerMarketplaceBar**.

**Segurança aplicada**

- RLS default-deny em todas as tabelas de tenant.
- Tokens de convite: armazenados como hash SHA-256, expiram em 7 dias, uso único.
- Anti-brute-force: 5 tentativas por email+IP em 15 min → bloqueio temporário com mensagem genérica.
- 2FA TOTP opcional por usuário; Owner pode marcar a org como "2FA obrigatório" (todos os membros precisam ativar para entrar).
- Sessões registradas; usuário pode revogar dispositivos (chama `supabase.auth.admin.signOut` via edge function).
- Audit log com `organization_id` registra: convites, mudanças de role, remoções, login (success/fail), 2FA enable/disable, transferência de propriedade.
- Service-role nunca chega ao client; toda escalação é feita em edge function que valida `org_role` do caller.

## Plano de execução em fases

**Fase 1 — Fundação multi-tenant**  
Migrations: estender `org_role`, adicionar `organization_id` em todas as tabelas, popular dados existentes (1 org por usuário atual), refazer RLS, descontinuar `user_roles` global.

**Fase 2 — Convites e gestão de membros**  
Tabela `organization_invites`, edge functions `org-invite-*`, `org-member-*`, `org-transfer-ownership`, página `/api/organizacao`, tela `/aceitar-convite`, OrganizationContext + switcher.

**Fase 3 — Segurança avançada**  
2FA TOTP (enroll/verify/disable), tela de Segurança no perfil, anti-brute-force (`failed_login_attempts` + `auth-login-guard`), tabela `user_sessions` + tela de dispositivos, política opcional "2FA obrigatório por org".

**Fase 4 — Limpeza**  
Remover `/api/usuarios` antiga, remover `user_roles` global (após migração), remover lógica que dependia do papel global "admin", atualizar `roleAccess` para os novos roles, atualizar memórias do projeto.

## Pontos a confirmar antes da execução

- Nível de segurança da Fase 3 (Essencial + 2FA já está incluído no plano; se quiser pular ou trocar por Google OAuth, me avise).
- Quer que durante a migração eu crie automaticamente uma organização chamada "(Nome do usuário) — Workspace" para cada usuário existente, ou prefere nomear manualmente depois?
- Manter ou remover o conceito de "self-ban protection" (admin não pode banir a si mesmo) nas novas regras de membros — sugiro manter.

