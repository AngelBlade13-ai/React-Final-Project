const { test, expect } = require("@playwright/test");

test("public account and admin smoke paths work against the test stack", async ({
  browser,
  page
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /soft archive/i })
  ).toBeVisible();

  await page.goto("/release/this-is-my-light");
  await expect(
    page.getByRole("heading", { name: "This Is My Light" })
  ).toBeVisible();

  await page.goto("/account");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.getByLabel("Display Name").fill("Quality Gate User");
  await page.getByLabel("Email").fill("quality@example.com");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Create Account" }).first().click();

  await expect(
    page.getByRole("heading", { name: "Quality Gate User" })
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Quality Gate User" })
  ).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await adminPage.goto("/admin/login");
  await adminPage.getByLabel("Email").fill("admin@example.com");
  await adminPage.getByLabel("Password").fill("Admin123!");
  await adminPage.getByRole("button", { name: "Login" }).click();

  await expect(
    adminPage.getByRole("heading", { name: "Manage Site Content" })
  ).toBeVisible();

  await adminPage.goto("/admin/unknown-surface");
  await expect(
    adminPage.getByRole("heading", {
      name: /this admin surface does not exist/i
    })
  ).toBeVisible();
  await adminPage.getByRole("link", { name: "Open Insights" }).click();
  await expect(
    adminPage.getByRole("heading", { name: "Manage Site Content" })
  ).toBeVisible();

  await adminPage.reload();
  await expect(
    adminPage.getByRole("heading", { name: "Manage Site Content" })
  ).toBeVisible();

  await adminContext.close();
});

test("public shell has recovery navigation for unknown routes", async ({
  page
}) => {
  await page.goto("/not-a-real-threshold");

  await expect(
    page.getByRole("heading", { name: /this threshold does not open/i })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search Archive" })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Footer" }).getByRole("link", {
      name: "Collections"
    })
  ).toBeVisible();

  await page.getByRole("link", { name: "Search Archive" }).click();
  await expect(
    page.getByRole("heading", {
      name: /search the archive by title, release notes, and collection/i
    })
  ).toBeVisible();

  await page.goto("/release/not-a-real-release");
  await expect(
    page.getByRole("heading", { name: /this release could not be opened/i })
  ).toBeVisible();
  await page.getByRole("link", { name: "Search archive" }).click();
  await expect(
    page.getByRole("heading", {
      name: /search the archive by title, release notes, and collection/i
    })
  ).toBeVisible();

  await page.goto("/collections/not-a-real-collection");
  await expect(
    page.getByRole("heading", { name: /this collection could not be opened/i })
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse collections" }).click();
  await expect(
    page.getByRole("heading", {
      name: /curated entry points into the archive/i
    })
  ).toBeVisible();
});
