import { expect, test } from "@playwright/test";
import path from "path";

test("landlord creates and publishes listing; renter tours and requests viewing", async ({
  page,
}) => {
  // 1. Sign up as a new user
  await page.goto("/auth/signup");
  const email = `smoke-${Date.now()}@demo.keyhaus.ng`;
  await page.getByLabel("Full name").fill("Ngozi Eze");
  await page.getByLabel("Nigerian mobile number").fill("0803 123 4567");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("SecurePass123!");
  await page.getByLabel(/I agree to the Keyhaus/i).click();
  await page.getByRole("button", { name: /Create account/i }).click();

  // 2. Choose landlord role on /onboarding/role
  await expect(page).toHaveURL(/\/onboarding\/role/);
  await page.getByRole("radio", { name: /I'm a landlord/i }).click();
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/landlord/);

  // 3. Create a listing (Details -> Neighborhood -> Rooms -> Preview -> Publish)
  await page.goto("/landlord/new");
  const title = `Smoke Test Flat ${Date.now()}`;
  await page.getByLabel("Listing title").fill(title);
  await page
    .getByLabel(/Description/i)
    .fill("Clean 2-bedroom flat with POP ceiling, borehole water, and quiet compound.");
  await page.getByLabel("Area / Neighbourhood").fill("Garki");
  await page
    .getByLabel(/Street address/i)
    .fill("Plot 99 Smoke Street, Sample Close");
  await page
    .getByRole("button", { name: /Save & continue to Neighborhood/i })
    .click();

  await page
    .getByRole("button", { name: /Save & continue to Rooms/i })
    .click();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(
    path.resolve(process.cwd(), "public/images/demo/living-lagos.webp")
  );
  await expect(page.getByText(/1\. Living room/i)).toBeVisible();
  await page.getByRole("button", { name: /Save & preview/i }).click();

  await page.getByRole("button", { name: /Publish listing/i }).click();
  await expect(page).toHaveURL(/\/listing\//);
  const publishedUrl = page.url();

  // 4. Switch to a renter account, open listing, tour it, and request a viewing
  await page.goto("/profile");
  await page.getByRole("button", { name: /Sign out/i }).click();
  await page.goto("/auth/signin");
  await page.getByRole("button", { name: /Continue as Demo Renter/i }).click();
  await expect(page).toHaveURL(/\/explore/);

  await page.goto(publishedUrl);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // Take the room-by-room tour
  await page.getByRole("link", { name: /Walk through this place/i }).click();
  await expect(page).toHaveURL(/\/tour/);
  await expect(page.getByText("1 of 1")).toBeVisible();
  await page.getByRole("link", { name: /Exit/i }).click();

  // Request a viewing
  await page.getByRole("button", { name: /Request viewing/i }).click();
  await page.getByRole("button", { name: /Send viewing request/i }).click();
  await expect(
    page.getByText(/Viewing request sent to the landlord/i)
  ).toBeVisible();
});
