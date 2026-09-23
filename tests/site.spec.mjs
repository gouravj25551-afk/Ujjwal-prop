import { test, expect } from "@playwright/test";

const PAGES = ["/", "/buy.html", "/sell.html", "/rent.html", "/invest.html", "/credits.html", "/404.html"];

// Test-only values, never shown on the real site.
const TEST_CONFIG = {
  phone: "+91 90000 00000",
  whatsapp: "919000000000",
  email: "test@example.com",
};

async function withConfig(page, config) {
  await page.route("**/assets/js/config.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: `window.SITE_CONFIG = ${JSON.stringify(config)};` }),
  );
}

async function fillValid(page) {
  await page.getByLabel("Name").fill("Test Visitor");
  await page.getByLabel("Mobile").fill("98765 43210");
}

const isMobile = (testInfo) => testInfo.project.name === "mobile";

for (const path of PAGES) {
  test(`${path} loads cleanly with no horizontal scroll`, async ({ page }) => {
    const problems = [];
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
    page.on("response", (r) => r.url().startsWith("http://localhost") && r.status() >= 400 && !r.url().endsWith("404.html") && problems.push(`${r.status()} ${r.url()}`));

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(problems).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("images all load", async ({ page }) => {
  await page.goto("/");
  for (const img of await page.locator("img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
});

test("main navigation reaches every path", async ({ page }, testInfo) => {
  for (const [label, url] of [["Buy", /buy\.html$/], ["Sell", /sell\.html$/], ["Rent", /rent\.html$/], ["Invest", /invest\.html$/]]) {
    await page.goto("/");
    if (isMobile(testInfo)) {
      const menu = page.getByRole("button", { name: "Open menu" });
      await menu.click();
      await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    }
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${label} in Gurugram`);
    await expect(page.locator(`input[name="intent"][value="${label.toLowerCase()}"]`)).toBeChecked();
  }
});

test("mobile menu closes with Escape", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#site-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-nav")).toBeHidden();
});

test("path cards and hero buttons open the right pages", async ({ page }) => {
  await page.goto("/");
  await page.locator(".paths").getByRole("link", { name: /Invest/ }).click();
  await expect(page).toHaveURL(/invest\.html$/);
  await page.goto("/");
  await page.locator(".intent-row").getByRole("link", { name: "Sell" }).click();
  await expect(page).toHaveURL(/sell\.html$/);
});

test("area chips prefill the enquiry form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sohna Road" }).click();
  await expect(page.getByLabel("Area")).toHaveValue("Sohna Road");
  await expect(page.locator("#enquire")).toBeInViewport();
});

test("enquire buttons land on the form", async ({ page }, testInfo) => {
  await page.goto("/rent.html");
  if (isMobile(testInfo)) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#site-nav").getByRole("link", { name: "Enquire" }).click();
  } else {
    await page.locator(".header-cta").click();
  }
  await expect(page.locator("#enquire form")).toBeInViewport();
});

test("form validates required fields", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator("#f-name-err")).toHaveText("Please enter your name.");
  await expect(page.locator("#f-phone-err")).toHaveText("Please enter a 10-digit mobile number.");
  await expect(page.getByLabel("Name")).toBeFocused();

  await page.getByLabel("Name").fill("Test Visitor");
  await page.getByLabel("Mobile").fill("12345");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator("#f-name-err")).toBeEmpty();
  await expect(page.locator("#f-phone-err")).not.toBeEmpty();
});

test("without client details the form says so and contact buttons stay hidden", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-contact]:visible")).toHaveCount(0);
  await fillValid(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".form-status")).toHaveText("Enquiries aren't connected yet.");
});

test("form endpoint receives the enquiry", async ({ page }) => {
  let posted;
  await withConfig(page, { formEndpoint: "https://forms.example.test/f/abc" });
  await page.route("https://forms.example.test/**", async (route) => {
    posted = route.request().postData();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });

  await page.goto("/invest.html");
  await fillValid(page);
  await page.getByLabel("Area").selectOption("Dwarka Expressway");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.locator(".form-status")).toHaveText("Thank you. We'll be in touch soon.");
  expect(posted).toContain("Test Visitor");
  expect(posted).toContain("+91 9876543210");
  expect(posted).toContain("invest");
  expect(posted).toContain("Dwarka Expressway");
  await expect(page.getByLabel("Name")).toHaveValue("");
  await expect(page.locator('input[name="intent"][value="invest"]')).toBeChecked();
});

test("form endpoint failure is reported", async ({ page }) => {
  await withConfig(page, { formEndpoint: "https://forms.example.test/f/abc" });
  await page.route("https://forms.example.test/**", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");
  await fillValid(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.locator(".form-status")).toHaveText("Couldn't send. Please try again.");
});

test("with WhatsApp configured the enquiry opens WhatsApp", async ({ page, context }) => {
  await withConfig(page, TEST_CONFIG);
  await context.route("https://wa.me/**", (route) => route.fulfill({ body: "ok" }));
  await page.goto("/sell.html");

  await expect(page.locator('[data-contact="call"]')).toHaveAttribute("href", "tel:+919000000000");
  await expect(page.locator('[data-contact="whatsapp"]')).toHaveAttribute("href", "https://wa.me/919000000000");
  await expect(page.locator('[data-contact="email"]')).toHaveAttribute("href", "mailto:test@example.com");
  await expect(page.locator("[data-contact]:visible")).toHaveCount(3);

  await fillValid(page);
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Send enquiry" }).click()]);
  const text = new URL(popup.url()).searchParams.get("text");
  expect(popup.url()).toContain("wa.me/919000000000");
  expect(text).toContain("I'd like to sell in Gurugram.");
  expect(text).toContain("Name: Test Visitor");
});

test("listings render only when real data exists", async ({ page }) => {
  await page.goto("/buy.html");
  await expect(page.locator("[data-listings]")).toBeHidden();

  await page.route("**/data/listings.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.LISTINGS = [{ type: "buy", title: "Sample home", location: "Sample sector", details: "Sample details" }];`,
    }),
  );
  await page.goto("/buy.html");
  await expect(page.locator(".listing")).toHaveCount(1);
  await page.locator(".listing").getByRole("link", { name: "Enquire" }).click();
  await expect(page.getByLabel("Anything else")).toHaveValue("Interested in: Sample home, Sample sector");

  await page.goto("/rent.html");
  await expect(page.locator("[data-listings]")).toBeHidden();
});
