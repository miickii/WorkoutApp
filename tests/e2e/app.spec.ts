import { test, expect } from "@playwright/test";
test("choose exercises, log decimals, recover offline, edit and delete history", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(page.locator(".picker-card")).toHaveCount(27);
  await expect(
    page.getByRole("button", { name: "Start workout", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page
        .locator(".picker-card img")
        .evaluateAll((imgs: HTMLImageElement[]) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page
    .locator(".pick-exercise")
    .filter({ hasText: "Squats med vægt" })
    .click();
  await page.locator(".pick-exercise").filter({ hasText: "Dead bugs" }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(page.locator(".exercise-card")).toHaveCount(2);
  const weight = page.getByRole("textbox", {
    name: "Weight for set 1",
    exact: true,
  });
  await weight.fill("7,5");
  await weight.press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Weight for set 3", exact: true }),
  ).toHaveValue("7.5");
  await page
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reopen set 1", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Full body", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reopen set 1", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.getByRole("button", { name: /Full body.*completed sets/ }).click();
  await page
    .getByRole("button", { name: "Decrease reps", exact: true })
    .first()
    .click();
  await expect(page.locator(".stepper b").first()).toHaveText("11");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete workout", exact: true })
    .click();
  await expect(page.getByText("Your story starts with one set.")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Full body.*completed sets/ }),
  ).toBeVisible();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Home" })
    .click();
  await expect(page.locator(".pick-exercise[aria-pressed=true]")).toHaveCount(
    2,
  );
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(weight).toHaveValue("7.5");
});
test("no split settings, isolated backup and scoped installation", async ({
  page,
  baseURL,
}) => {
  await page.goto("./");
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.getByText("Suggested rotation")).toHaveCount(0);
  await expect(page.getByLabel("Workout template")).toHaveCount(0);
  await expect(page.locator(".library-item")).toHaveCount(27);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  expect((await download).suggestedFilename()).toContain("reptrack-mom-backup");
  const href = await page.locator("link[rel=manifest]").getAttribute("href");
  const manifest = await (
    await page.request.get(new URL(href!, baseURL!).href)
  ).json();
  expect(manifest.name).toBe("RepTrack Mom");
  expect(manifest.scope).toBe(new URL(baseURL!).pathname);
});
