# Growth AI Chat

Frontend conversacional da Growth Labs para `g-chat.growthlabs.pt`. Construído com React, TypeScript, Vite, Tailwind CSS e os componentes do TailAdmin React.

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Por omissão, o browser comunica apenas com `/growth-api/v1` no mesmo domínio e envia o cookie de sessão com `credentials: include`. Nenhuma chave de modelo ou credencial administrativa pertence ao frontend.

O login de produção é exclusivamente Google OAuth e só aceita contas provisionadas pelo administrador. O CSRF da sessão fica apenas em memória e é enviado em todas as mutações. O modo de demonstração só existe no servidor Vite e requer `VITE_ENABLE_DEMO=true`; os dados e respostas simulados ficam explicitamente identificados.

## Qualidade

```bash
npm run lint
npm run build
npm run test:e2e
npm run check
```

## Container

```bash
docker build -t growthlabs-ai-chat-fe .
docker run --rm -p 8080:8080 \
  -e GROWTH_API_UPSTREAM=http://growth-api:8080 \
  growthlabs-ai-chat-fe
```

`GET /healthz` valida o Nginx. O prefixo `/growth-api/` é encaminhado sem buffering para preservar SSE.

O contrato esperado do backend está em [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Marca

A aplicação usa diretamente `public/Logo-Vertical-White.svg`, fornecida pela Growth Labs. O projeto preserva a licença MIT do snapshot oficial TailAdmin em [`LICENSE.md`](LICENSE.md).
