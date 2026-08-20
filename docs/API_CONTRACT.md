# Contrato HTTP do Growth AI Chat

O frontend usa `/growth-api/v1` no mesmo origin. O Nginx incluído encaminha esse prefixo para `GROWTH_API_UPSTREAM`. Sessões usam exclusivamente cookie `HttpOnly`, `Secure` e `SameSite=Lax`; o browser nunca recebe uma master key.

## Configuração e sessão

`GET /auth/config`:

```json
{
  "authentication": true,
  "password": { "enabled": true, "registration": true },
  "google": { "enabled": true, "loginUrl": "https://.../auth/google/start" },
  "cli": { "enabled": true, "verificationUrl": "https://g-chat.growthlabs.pt/cli/authorize" }
}
```

`GET /auth/session`:

```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "pessoa@growthlabs.pt",
    "displayName": "Pessoa",
    "avatarUrl": null,
    "role": "user",
    "status": "active"
  },
  "csrfToken": "..."
}
```

Uma sessão anónima devolve `{ "authenticated": false, "user": null, "csrfToken": null }`. O token CSRF permanece apenas em memória; não é escrito em storage, URL ou logs. Todas as mutações autenticadas feitas pelo frontend, incluindo `POST /chat/completions`, incluem `X-Growth-CSRF` e `credentials: include`.

## Email, palavra-passe e Google OAuth

Quando `password.enabled` é verdadeiro, `POST /auth/password/login` recebe `{ "email": "...", "password": "..." }` e devolve o mesmo objeto de sessão autenticada, incluindo `csrfToken`.

Quando `password.registration` é verdadeiro, `/register` envia `POST /auth/password/register` com `{ "first_name", "last_name", "email", "password" }`. A palavra-passe tem no mínimo 12 caracteres. O sucesso mantém a conta pendente até aprovação administrativa; não cria uma sessão automaticamente.

Login e registo são as duas mutações que não enviam `X-Growth-CSRF`, porque ainda não existe uma sessão. O backend exige same-origin/`Origin`, rate limiting e erros genéricos para não enumerar contas. O frontend limpa os campos sensíveis e não guarda palavra-passe ou CSRF em storage.

`GET /auth/google/start?return_to=...` inicia o OAuth e o servidor só conclui a sessão para emails ativos previamente provisionados.

O callback regressa à aplicação com:

- `?auth=success`
- `?auth=not-authorized`
- `?auth=failed`

A aplicação apresenta o resultado e remove imediatamente `auth` do endereço, preservando outros parâmetros legítimos.

`POST /auth/logout` exige cookie e `X-Growth-CSRF`; depois da resposta o frontend elimina o CSRF da memória.

`POST /auth/password/change` recebe `{ "current_password", "new_password" }` no Perfil/Segurança. Exige cookie e `X-Growth-CSRF`; a nova palavra-passe tem no mínimo 12 caracteres e todos os campos são limpos no fim.

Não existe recuperação de palavra-passe ou outra ação simulada na interface. Os métodos apresentados são estritamente os anunciados por `/auth/config`; GitHub permanece visivelmente indisponível enquanto o backend não o oferecer.

## Login do Growth CLI no browser

A CLI cria o pedido em `POST /auth/cli/start` e abre o `verification_uri_complete`, que contém `?user_code=...`. Depois do login, o browser mostra o código para confirmação explícita:

- `POST /auth/cli/approve` com `{ "user_code": "..." }`
- `POST /auth/cli/deny` com `{ "user_code": "..." }`

Ambas exigem cookie e `X-Growth-CSRF`. O código é removido do endereço depois de uma resposta bem-sucedida.

## Inferência

`POST /chat/completions` usa cookie, CSRF, `stream: true` e um dos modelos `growth-low`, `growth-medium` ou `growth-high`. O frontend interpreta eventos SSE com `delta`, `text`, `output_text` ou `choices[0].delta.content`, e encerra a leitura em `[DONE]`.

O G-Brain é aplicado no servidor de acordo com a identidade assinada da sessão; o browser não envia nem escolhe fontes de memória. G-Cortex é a camada de visualização do conhecimento, não uma fonte selecionável no pedido. Permissões de ferramentas também pertencem ao runtime/backend, nunca ao conteúdo enviado pelo browser.

## Persistência e recursos

O frontend usa exclusivamente os adapters autenticados do gateway para persistir:

- `/chat/workspace`, `/chat/folders`, `/chat/conversations` e `/chat/attachments`
- `/skills`, `/plugins`, `/connections`, `/personalities`
- `/profile` e `/profile/preferences`

Users, histórico, mensagens, perfil e preferências nunca são escritos em `localStorage`, `sessionStorage` ou IndexedDB. A sessão usa somente o cookie opaco `HttpOnly`, que não é lido por JavaScript, e o CSRF em memória. Mesmo o modo de demonstração DEV mantém os dados apenas em RAM e perde-os ao recarregar.

## Requisitos de implantação

- `GROWTH_API_UPSTREAM` aponta para o gateway privado, mantendo `/growth-api` no mesmo origin público.
- O gateway deve usar `GROWTH_CHAT_PUBLIC_URL=https://g-chat.growthlabs.pt` e um `GROWTH_AUTH_PUBLIC_URL` coerente com o callback público; cookies não atravessam domínios diferentes.
- CSRF, ownership, RBAC, rate limiting e limites de upload continuam obrigatórios no backend.
- Login e registo por palavra-passe validam `Origin` no servidor antes de criar qualquer estado; todas as mutações autenticadas seguintes exigem CSRF.
- OAuth usa `state`, PKCE, nonce e allowlist de contas provisionadas.
- O device flow usa códigos curtos, expirados, de uso único e confirmação explícita.
