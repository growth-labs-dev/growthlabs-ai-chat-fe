import { expect, test, type Page, type Request } from "@playwright/test";

const apiConfig = {
  authentication: true,
  registration: false,
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

const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function mockUnauthenticated(page: Page) {
  await page.route("**/growth-api/v1/auth/config", (route) => route.fulfill(json(apiConfig)));
  await page.route("**/growth-api/v1/auth/session", (route) => route.fulfill(json({ authenticated: false, user: null, csrfToken: null })));
}

function expectCsrf(request: Request) {
  expect(request.headers()["x-growth-csrf"]).toBe("csrf-test-token");
}

test("OAuth-only login handles authorization results and preserves the CLI code", async ({ page }) => {
  await mockUnauthenticated(page);
  await page.goto("/?auth=not-authorized&user_code=ABCD-EFGH");

  await expect(page).toHaveTitle(/Growth AI/);
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Growth AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeEnabled();
  await expect(page.getByText("Esta conta Google não está autorizada")).toBeVisible();
  await expect(page.getByText("ABCD-EFGH")).toBeVisible();
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  await expect(page).toHaveURL(/user_code=ABCD-EFGH/);
  await expect(page).not.toHaveURL(/auth=/);

  await page.goto("/?auth=failed");
  await expect(page.getByText("O login Google falhou ou expirou")).toBeVisible();
  await expect(page).not.toHaveURL(/auth=/);
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

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Growth AI" })).toBeVisible();
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
});
