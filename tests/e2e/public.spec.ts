import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("homepage explains free group buying without promising savings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Group Deals/ }).first()).toBeVisible();
    await expect(page.getByText(/Discounts are not guaranteed/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/guaranteed savings/i);
  });

  test("visitors can browse and filter vehicles without logging in", async ({ page }) => {
    await page.goto("/vehicles?category=two_wheeler");
    await expect(page.getByRole("heading", { name: "Two-wheelers" })).toBeVisible();
    await expect(page.getByText(/vehicles? found/)).toBeVisible();
    await page.goto("/vehicles?q=zzzz-no-match");
    await expect(page.getByText("No vehicles match these filters")).toBeVisible();
  });

  test("group page shows verified count, target and free-joining CTA", async ({ page }) => {
    await page.goto("/groups");
    await page.locator('a[href^="/groups/"]').first().click();
    await expect(page.getByText("Verified participants").first()).toBeVisible();
    await expect(page.getByRole("progressbar").first()).toBeVisible();
    await expect(page.getByText(/does not guarantee a discount/i).first()).toBeVisible();
  });

  test("protected areas redirect to login", async ({ page }) => {
    for (const path of ["/dashboard", "/admin", "/dealer"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test("no participant identities leak into public HTML", async ({ page }) => {
    await page.goto("/groups");
    const html = await page.content();
    expect(html).not.toMatch(/demo-participant-\d+@/);
    expect(html).not.toMatch(/\+9190000\d{5}/);
  });
});
