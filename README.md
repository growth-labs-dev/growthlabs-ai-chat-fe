# Growth AI Chat

Frontend conversacional da Growth Labs para `g-chat.growthlabs.pt`. Construído com React, TypeScript, Vite, Tailwind CSS e os componentes do TailAdmin React.

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Por omissão, o browser comunica apenas com `/growth-api/v1` no mesmo domínio e envia o cookie de sessão com `credentials: include`. Nenhuma chave de modelo ou credencial administrativa pertence ao frontend.

O login de produção apresenta email/palavra-passe e/ou Google OAuth de acordo com `/auth/config`. Quando `password.registration` está ativo, `/register` envia um pedido real e informa que a conta aguarda aprovação; não existe recuperação de palavra-passe simulada. Login e registo são validados como same-origin pelo backend. Depois da autenticação, o CSRF fica apenas em memória e acompanha todas as mutações, incluindo a troca de palavra-passe em Perfil/Segurança.

O frontend não grava utilizadores, sessões, conversas, histórico, perfil ou preferências em `localStorage`, `sessionStorage` ou IndexedDB. A sessão de produção usa exclusivamente cookie opaco `HttpOnly` e persistência do gateway. O modo de demonstração só existe no servidor Vite com `VITE_ENABLE_DEMO=true`, é rotulado e mantém os dados somente em RAM.

Em desktop, `/login` e `/register` apresentam à esquerda o MP4 institucional fornecido pela Growth Labs, sem overlay, gradiente ou tint. O vídeo é decorativo, silencioso e possui fallback preto; em movimento reduzido ou viewport móvel não inicia reprodução.

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
O CSP permite media exclusivamente no host CloudFront exato do MP4; o restante JavaScript e todas as ligações de aplicação continuam same-origin.

O contrato esperado do backend está em [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Marca

A aplicação usa diretamente `public/Logo-Vertical-White.svg`, fornecida pela Growth Labs. O projeto preserva a licença MIT do snapshot oficial TailAdmin em [`LICENSE.md`](LICENSE.md).
