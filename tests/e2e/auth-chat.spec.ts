import { expect, test, type Page, type Request } from "@playwright/test";

const authVideoUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4";

const apiConfig = {
  authentication: true,
  password: { enabled: true, registration: true },
  google: { enabled: true, loginUrl: "https://g-aura.growthlabs.pt/growth-api/v1/auth/google/start" },
  cli: { enabled: true, verificationUrl: "https://g-chat.growthlabs.pt/cli/authorize" },
};

const user = {
  id: "user-1",
  email: "user@growthlabs.pt",
  displayName: "Growth User",
  avatarUrl: null,
  role: "user",
  status: "active",
};

const unavailableCapabilities = {
  persistence: { available: true, source: "growth-auth-sqlite" },
  uploads: { available: false, reason: "Secure attachment parsing and scanning is not configured" },
  browserTools: { available: false, reason: "A sandboxed browser tool runtime is not configured" },
};

const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function mockUnauthenticated(page: Page) {
  await page.route("https://d8j0ntlcm91z4.cloudfront.net/**", (route) => route.abort());
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: false, user: null, csrfToken: null })));
}

function expectCsrf(request: Request) {
  expect(request.headers()["x-growth-csrf"]).toBe("csrf-test-token");
}

async function expectNoBrowserDataStorage(page: Page) {
  const storage = await page.evaluate(async () => ({
    local: Object.keys(window.localStorage),
    session: Object.keys(window.sessionStorage),
    databases: typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((database) => database.name).filter(Boolean)
      : [],
  }));
  expect(storage).toEqual({ local: [], session: [], databases: [] });
}

test("login offers password, Google and registration while preserving OAuth and CLI state", async ({ page }) => {
  await mockUnauthenticated(page);
  await page.goto("/?auth=not-authorized&user_code=ABCD-EFGH");

  await expect(page).toHaveTitle(/Growth AI/);
  await expect(page.getByRole("heading", { name: "Entrar na sua conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "GitHub indisponível" })).toBeDisabled();
  await expect(page.getByLabel("Palavra-passe", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar palavra-passe", exact: true }).click();
  await expect(page.getByLabel("Palavra-passe", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar palavra-passe", exact: true }).click();
  await expect(page.getByText("Esta conta Google não está autorizada")).toBeVisible();
  await expect(page.getByText("ABCD-EFGH")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Palavra-passe", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/register");
  await expect(page).toHaveURL(/user_code=ABCD-EFGH/);
  await expect(page).not.toHaveURL(/auth=/);

  await page.goto("/login?auth=failed");
  await expect(page.getByText("O login Google falhou ou expirou")).toBeVisible();
  await expect(page).not.toHaveURL(/auth=/);
});

test("password login omits CSRF before session and keeps returned CSRF only in memory", async ({ page }) => {
  await mockUnauthenticated(page);
  await page.route("**/growth-api/v1/auth/password/login", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers()["x-growth-csrf"]).toBeUndefined();
    expect(request.headers().origin).toBe("http://127.0.0.1:4173");
    expect(await request.postDataJSON()).toEqual({ email: "user@growthlabs.pt", password: "segredo-de-teste" });
    await route.fulfill(json({ authenticated: true, user, csrfToken: "csrf-password-token" }));
  });
  await page.route("**/growth-api/v1/chat/workspace", (route) => route.fulfill(json({ folders: [], conversations: [], capabilities: unavailableCapabilities })));
  await page.route("**/growth-api/v1/auth/logout", async (route) => {
    expect(route.request().headers()["x-growth-csrf"]).toBe("csrf-password-token");
    await route.fulfill(json({ authenticated: false }));
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("user@growthlabs.pt");
  await page.getByLabel("Palavra-passe", { exact: true }).fill("segredo-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Como posso ajudar?" })).toBeVisible();
  await expectNoBrowserDataStorage(page);

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await expect(page.getByRole("heading", { name: "Entrar na sua conta" })).toBeVisible();
});

test("registration submits the exact contract without CSRF and reports pending approval", async ({ page }) => {
  await mockUnauthenticated(page);
  await page.route("**/growth-api/v1/auth/password/register", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers()["x-growth-csrf"]).toBeUndefined();
    expect(request.headers().origin).toBe("http://127.0.0.1:4173");
    expect(await request.postDataJSON()).toEqual({
      first_name: "Rita",
      last_name: "Growth",
      email: "rita@growthlabs.pt",
      password: "segredo-com-12",
    });
    await route.fulfill(json({ status: "pending" }));
  });

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Dados da conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "GitHub indisponível" })).toBeDisabled();
  await page.getByRole("button", { name: "Mostrar palavra-passe", exact: true }).click();
  await expect(page.getByLabel("Palavra-passe", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar palavra-passe", exact: true }).click();
  await page.getByLabel("Nome").fill("Rita");
  await page.getByLabel("Apelido").fill("Growth");
  await page.getByLabel("Email profissional").fill("rita@growthlabs.pt");
  await page.getByLabel("Palavra-passe", { exact: true }).fill("segredo-com-12");
  await page.getByLabel("Confirmar palavra-passe", { exact: true }).fill("segredo-com-12");
  await page.getByRole("button", { name: "Pedir acesso" }).click();

  await expect(page.getByRole("heading", { name: "Pedido recebido" })).toBeVisible();
  await expect(page.getByText("aguarda aprovação do administrador")).toBeVisible();
  await expect(page.getByRole("link", { name: /Voltar ao login/ })).toHaveAttribute("href", "/login");
  await expectNoBrowserDataStorage(page);
});

test("desktop auth keeps the exact MP4 hero on the left with a matte fallback", async ({ page }) => {
  await mockUnauthenticated(page);
  await page.goto("/register");

  const panel = page.getByTestId("auth-video-panel");
  const video = panel.locator("video");
  const source = video.locator("source");
  await expect(panel).toBeVisible();
  await expect(source).toHaveAttribute("src", authVideoUrl);
  await expect(source).toHaveAttribute("type", "video/mp4");
  await expect(video).toHaveAttribute("aria-hidden", "true");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveJSProperty("muted", true);
  const panelBox = await panel.boundingBox();
  const formBox = await page.getByRole("heading", { name: "Dados da conta" }).boundingBox();
  expect(panelBox && formBox && panelBox.x < formBox.x).toBeTruthy();
  expect(panelBox && panelBox.width / 1280).toBeGreaterThan(0.48);
  await video.dispatchEvent("error");
  await expect(panel).toHaveAttribute("data-video-state", "error");
  await expect(panel).toHaveCSS("background-color", "rgb(9, 9, 9)");
});

test("auth video does not autoplay or fetch when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let mediaRequests = 0;
  await page.route("https://d8j0ntlcm91z4.cloudfront.net/**", (route) => { mediaRequests += 1; return route.abort(); });
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: false, user: null, csrfToken: null })));
  await page.goto("/login");

  await expect(page.getByTestId("auth-video-panel")).toHaveAttribute("data-video-state", "reduced-motion");
  await expect(page.getByTestId("auth-video-panel").locator("video")).not.toHaveAttribute("autoplay", "");
  expect(mediaRequests).toBe(0);
});

test("registration is responsive and does not fetch the hidden video on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let mediaRequests = 0;
  await page.route("https://d8j0ntlcm91z4.cloudfront.net/**", (route) => { mediaRequests += 1; return route.abort(); });
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: false, user: null, csrfToken: null })));
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Dados da conta" })).toBeVisible();
  await expect(page.getByTestId("auth-video-panel")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(mediaRequests).toBe(0);
});

test("authenticated flow sends in-memory CSRF on CLI approval, streaming and logout", async ({ page }) => {
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: true, user, csrfToken: "csrf-test-token" })));
  await page.route("**/growth-api/v1/chat/workspace", (route) => route.fulfill(json({
    folders: [],
    conversations: [{ id: "conversation-1", title: "Projeto Growth", folderId: null, model: "growth-medium", updatedAt: new Date().toISOString() }],
  })));
  await page.route("**/growth-api/v1/chat/conversations/conversation-1/messages", (route) => route.fulfill(json({ messages: [] })));
  await page.route("**/growth-api/v1/chat/conversations/conversation-1", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expectCsrf(route.request());
    await route.fulfill(json({ id: "conversation-1", title: "Resume o projeto", folderId: null, model: "growth-medium", updatedAt: new Date().toISOString() }));
  });
  await page.route("**/growth-api/v1/auth/cli/approve", async (route) => {
    expectCsrf(route.request());
    expect(await route.request().postDataJSON()).toEqual({ user_code: "ABCD-EFGH" });
    await route.fulfill(json({ status: "approved", clientName: "Growth CLI" }));
  });
  await page.route("**/growth-api/v1/chat/completions", async (route) => {
    expectCsrf(route.request());
    expect((await route.request().postDataJSON()).model).toBe("growth-medium");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "cache-control": "no-store" },
      body: 'data: {"choices":[{"delta":{"content":"Resposta Growth confirmada."}}]}\n\ndata: [DONE]\n\n',
    });
  });
  await page.route("**/growth-api/v1/auth/logout", async (route) => {
    expectCsrf(route.request());
    await route.fulfill(json({ authenticated: false }));
  });

  await page.goto("/?auth=success&user_code=ABCD-EFGH");
  await expect(page.getByRole("heading", { name: "Projeto Growth" })).toBeVisible();
  await expect(page.getByText("Sessão iniciada com sucesso.")).toBeVisible();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await expect(page).not.toHaveURL(/user_code=/);

  await page.getByLabel("Mensagem").fill("Resume o projeto");
  await page.getByLabel("Mensagem").press("Enter");
  await expect(page.getByText("Resposta Growth confirmada.")).toBeVisible();
  await expectNoBrowserDataStorage(page);

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await expect(page.getByRole("heading", { name: "Entrar na sua conta" })).toBeVisible();
});

test("profile security rotates a temporary password with session CSRF and clears every field", async ({ page }) => {
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: true, user, csrfToken: "csrf-test-token" })));
  await page.route("**/growth-api/v1/chat/workspace", (route) => route.fulfill(json({ folders: [], conversations: [], capabilities: unavailableCapabilities })));
  await page.route("**/growth-api/v1/skills", (route) => route.fulfill(json({ items: [] })));
  await page.route("**/growth-api/v1/auth/password/change", async (route) => {
    expectCsrf(route.request());
    expect(await route.request().postDataJSON()).toEqual({ current_password: "temporaria-owner", new_password: "nova-segura-123" });
    await route.fulfill(json({ status: "changed" }));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Perfil e configurações" }).click();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByLabel("Palavra-passe atual").fill("temporaria-owner");
  await page.getByLabel("Nova palavra-passe", { exact: true }).fill("nova-segura-123");
  await page.getByLabel("Confirmar nova palavra-passe").fill("nova-segura-123");
  await page.getByRole("button", { name: "Alterar palavra-passe" }).click();

  await expect(page.getByText("Palavra-passe atualizada com sucesso.")).toBeVisible();
  await expect(page.getByLabel("Palavra-passe atual")).toHaveValue("");
  await expect(page.getByLabel("Nova palavra-passe", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Confirmar nova palavra-passe")).toHaveValue("");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await expect(page.getByText(/Indisponível neste ambiente.*sandboxed browser tool runtime/)).toBeVisible();
  await expect(page.getByRole("switch", { name: "Acesso à internet" })).toBeDisabled();
  await expectNoBrowserDataStorage(page);
});

test("CLI denial exposes the gateway nested error and preserves the code for retry", async ({ page }) => {
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: true, user, csrfToken: "csrf-test-token" })));
  await page.route("**/growth-api/v1/chat/workspace", (route) => route.fulfill(json({ folders: [], conversations: [] })));
  await page.route("**/growth-api/v1/auth/cli/deny", async (route) => {
    expectCsrf(route.request());
    expect(await route.request().postDataJSON()).toEqual({ user_code: "EXPIRED-1" });
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "invalid_user_code", message: "O código expirou.", type: "invalid_request_error" } }),
    });
  });

  await page.goto("/?user_code=EXPIRED-1");
  await page.getByRole("button", { name: "Recusar" }).click();
  await expect(page.getByText("O código expirou.")).toBeVisible();
  await expect(page).toHaveURL(/user_code=EXPIRED-1/);
});

test("authenticated shell remains usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: true, user, csrfToken: "csrf-test-token" })));
  await page.route("**/growth-api/v1/chat/workspace", (route) => route.fulfill(json({ folders: [], conversations: [] })));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  await expect(page.getByLabel("Mensagem")).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("button", { name: "Nova conversa" })).toBeVisible();
  await expectNoBrowserDataStorage(page);
});
