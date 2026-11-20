import { test, expect } from "@playwright/test";
test("next workout starts with the last recorded reps for each set", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.locator(".picker-card, .workout-choice").first(),
  ).toBeVisible();
  const fullBody = (await page.locator(".picker-card").count()) > 0;
  async function start() {
    if (fullBody) {
      if (!(await page.locator(".pick-exercise[aria-pressed=true]").count()))
        await page.locator(".pick-exercise").first().click();
      await page
        .getByRole("button", { name: "Start workout", exact: true })
        .click();
    } else
      await page.locator(".workout-choice").filter({ hasText: "Push" }).click();
  }
  await start();
  const weight = page.getByRole("textbox", {
    name: "Weight for set 1",
    exact: true,
  });
  await weight.fill("5");
  await weight.press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Weight for set 3", exact: true }),
  ).toHaveValue("5");
  for (let i = 0; i < 3; i++) {
    for (let n = 0; n < i + 1; n++) {
      await page
        .getByRole("button", { name: "Decrease reps", exact: true })
        .nth(i)
        .click();
      await expect(page.locator(".stepper b").nth(i)).toHaveText(
        String(11 - n),
      );
    }
  }
  for (let i = 1; i <= 3; i++) {
    await page
      .getByRole("button", { name: `Complete set ${i}`, exact: true })
      .click();
    if (i < 3)
      await expect(
        page.getByRole("button", { name: `Reopen set ${i}`, exact: true }),
      ).toBeVisible();
  }
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await start();
  for (let i = 0; i < 3; i++)
    await expect(page.locator(".stepper b").nth(i)).toHaveText(String(11 - i));
  await expect(
    page.getByRole("button", { name: "Complete set 1", exact: true }),
  ).toBeVisible();
  await page.reload();
  for (let i = 0; i < 3; i++)
    await expect(page.locator(".stepper b").nth(i)).toHaveText(String(11 - i));
});
