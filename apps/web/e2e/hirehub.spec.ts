import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openMenuOnMobile(page: Page) {
  if ((page.viewportSize()?.width || 1000) < 850)
    await page.getByRole("button", { name: /^(Open menu|Mở menu)$/ }).click();
}

test("candidate can browse, apply and track", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Ứng viên", { exact: true }).click();
  await openMenuOnMobile(page);
  await page.getByRole("link", { name: /Việc làm|Jobs/ }).click();
  const apply = page.getByRole("button", { name: /Ứng tuyển|Apply/ }).first();
  await expect(apply).toBeVisible();
  await apply.click();
  await openMenuOnMobile(page);
  await page.getByRole("link", { name: /Đơn ứng tuyển|Applications/ }).click();
  await expect(
    page.getByRole("heading", { name: /Đơn ứng tuyển|Applications/ }),
  ).toBeVisible();
});

test("recruiter can update and export pipeline", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Nhà tuyển dụng", { exact: true }).click();
  await openMenuOnMobile(page);
  await page.getByRole("link", { name: /Ứng viên|Candidates/ }).click();
  await expect(page.getByRole("heading", { name: /Pipeline/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();
});

test("admin can inspect moderation and audit", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Quản trị nền tảng", { exact: true }).click();
  await page.getByRole("link", { name: /Doanh nghiệp|Companies/ }).click();
  await expect(
    page.getByRole("heading", { name: /Doanh nghiệp|Companies/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Nhật ký kiểm toán|Audit log/ }).click();
  await expect(
    page.getByRole("heading", { name: /Nhật ký kiểm toán|Audit log/ }),
  ).toBeVisible();
});

test("language switch changes the login experience", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Ngôn ngữ" }).click();
  await page.getByRole("option", { name: "EN" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Which role would you like to explore?",
    }),
  ).toBeVisible();
  await expect(page.getByText("Candidate", { exact: true })).toBeVisible();
});

test("login page applies light and dark colors consistently", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("hirehub-color-scheme", "light");
    localStorage.setItem("language", "en");
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const form = page.locator(".auth-form");
  const brand = page.locator(".auth-brand");
  const roleCard = page.locator(".role-card").first();
  await expect(form).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(brand).toHaveCSS("background-color", "rgb(241, 239, 248)");
  await expect(roleCard).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  await expect(form).toHaveCSS("background-color", "rgb(29, 30, 34)");
  await expect(brand).toHaveCSS("background-color", "rgb(23, 20, 30)");
  await expect(roleCard).toHaveCSS("background-color", "rgb(29, 30, 34)");
});

test("landing pipeline pagination is interactive", async ({ page }) => {
  test.skip((page.viewportSize()?.width || 0) < 850, "Desktop visual only");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const interviews = page.getByRole("button", { name: "Interviews" });
  await interviews.click();
  await expect(interviews).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".visual-columns")).toHaveClass(/preview-1/);
});

test("candidate profile completion card follows dark mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("hirehub-color-scheme", "dark");
    localStorage.setItem("language", "en");
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Candidate", { exact: true }).click();
  const completion = page.locator(".profile-completion-card");
  await expect(completion).toBeVisible();
  await expect(completion).toHaveCSS("background-color", "rgb(37, 38, 43)");
  await expect(completion).toHaveCSS("color", "rgb(241, 242, 244)");
});

test("project introduction appears after scrolling the login page", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#about-hirehub").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", {
      name: "One hiring journey, three connected perspectives.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Candidate portal", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Accept offer", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore the demo" }),
  ).toBeVisible();
});

test("login and candidate portal have no automatic WCAG A/AA violations", async ({
  page,
}) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const login = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    login.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.getByText("Ứng viên", { exact: true }).click();
  const portal = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    portal.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});
