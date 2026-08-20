# Contrato HTTP do Growth AI Chat

O frontend usa `/growth-api/v1` no mesmo origin. O Nginx incluído encaminha esse prefixo para `GROWTH_API_UPSTREAM`. Sessões usam exclusivamente cookie `HttpOnly`, `Secure` e `SameSite=Lax`; o browser nunca recebe uma master key.

## Configuração e sessão

`GET /auth/config`:

```json
{
  "authentication": true,
  "registration": false,
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

Uma sessão anónima devolve `{ "authenticated": false, "user": null, "csrfToken": null }`. O token CSRF permanece apenas em memória; não é escrito em storage, URL ou logs. Todas as mutações feitas pelo frontend, incluindo `POST /chat/completions`, incluem `X-Growth-CSRF` e `credentials: include`.

## Google OAuth

Não existe formulário de registo nem login por email/palavra-passe. `GET /auth/google/start?return_to=...` inicia o OAuth e o servidor só conclui a sessão para emails ativos previamente provisionados.

O callback regressa à aplicação com:

- `?auth=success`
- `?auth=not-authorized`
- `?auth=failed`

A aplicação apresenta o resultado e remove imediatamente `auth` do endereço, preservando outros parâmetros legítimos.

`POST /auth/logout` exige cookie e `X-Growth-CSRF`; depois da resposta o frontend elimina o CSRF da memória.

## Login do Growth CLI no browser

A CLI cria o pedido em `POST /auth/cli/start` e abre o `verification_uri_complete`, que contém `?user_code=...`. Depois do login, o browser mostra o código para confirmação explícita:

- `POST /auth/cli/approve` com `{ "user_code": "..." }`
- `POST /auth/cli/deny` com `{ "user_code": "..." }`

Ambas exigem cookie e `X-Growth-CSRF`. O código é removido do endereço depois de uma resposta bem-sucedida.

## Inferência

`POST /chat/completions` usa cookie, CSRF, `stream: true` e um dos modelos `growth-low`, `growth-medium` ou `growth-high`. O frontend interpreta eventos SSE com `delta`, `text`, `output_text` ou `choices[0].delta.content`, e encerra a leitura em `[DONE]`.

O G-Brain é aplicado no servidor de acordo com a identidade assinada da sessão; o browser não envia nem escolhe fontes de memória. G-Cortex é a camada de visualização do conhecimento, não uma fonte selecionável no pedido. Permissões de ferramentas também pertencem ao runtime/backend, nunca ao conteúdo enviado pelo browser.

## Serviços de aplicação ainda necessários

O gateway público atual implementa identidade e inferência, mas não persiste as entidades visuais abaixo. O frontend já contém adapters para uma futura API autenticada de aplicação:

- `/chat/workspace`, `/chat/folders`, `/chat/conversations` e `/chat/attachments`
- `/skills`, `/plugins`, `/connections`, `/personalities`
- `/profile` e `/profile/preferences`

Até estes endpoints existirem, a autenticação e o streaming podem ser integrados, mas histórico sincronizado, pastas e gestão de recursos não devem ser declarados operacionais em produção.

## Requisitos de implantação

- `GROWTH_API_UPSTREAM` aponta para o gateway privado, mantendo `/growth-api` no mesmo origin público.
- O gateway deve usar `GROWTH_CHAT_PUBLIC_URL=https://g-chat.growthlabs.pt` e um `GROWTH_AUTH_PUBLIC_URL` coerente com o callback público; cookies não atravessam domínios diferentes.
- CSRF, ownership, RBAC, rate limiting e limites de upload continuam obrigatórios no backend.
- OAuth usa `state`, PKCE, nonce e allowlist de contas provisionadas.
- O device flow usa códigos curtos, expirados, de uso único e confirmação explícita.
