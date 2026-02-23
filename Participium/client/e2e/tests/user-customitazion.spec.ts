import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserPage } from '../pages/UserPage';
import { testUsers } from '../fixtures/testData';
import { AuthHelper } from '../helpers/authHelper';

test.describe('Account Configuration', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let userPage: UserPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    userPage = new UserPage(page);
    authHelper = new AuthHelper(page);
  });

  test('User can view and edit profile', async ({ page }) => {
    // --- Create unique user ---
    const uniqueUser = {
      ...testUsers.validUser,
      username: `citizen_${Date.now()}`,
      email: `citizen_${Date.now()}@example.com`,
    };

    // --- Register user with helper ---
    await authHelper.registerUser(uniqueUser);

    // --- Login the user ---
    await loginPage.goto();
    await loginPage.login(uniqueUser.username, uniqueUser.password);
    await page.waitForURL('/map', { timeout: 10000 });

    // --- Navigate to user page ---
    await page.goto('/user');
    await userPage.avatarImage.waitFor({ state: 'visible' });
    
    // --- Check profile is displayed ---
    await page.waitForTimeout(1000);

    expect(await userPage.getUsernameLine()).toContain(uniqueUser.username);
    expect(await userPage.getEmailLine()).toContain(uniqueUser.email);

    // --- Enter edit mode ---
    await userPage.enterEditMode();
    expect(await userPage.isEditFormVisible()).toBeTruthy();

    // --- Edit profile ---
    const newTelegram = `telegram_${Date.now()}`;

    await userPage.fillEditForm({
      telegram: newTelegram,
      emailNotifications: true,
    });

    await userPage.saveChanges();

    // --- Wait for update ---
    await page.waitForTimeout(1000);

    // --- Verify updated data visible ---
    expect(await userPage.getTelegramLine()).toContain(newTelegram);
    expect(await userPage.getEmailNotificationsLine()).toContain('Enabled');
  });
});
