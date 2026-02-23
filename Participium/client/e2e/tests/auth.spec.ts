import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { testUsers } from '../fixtures/testData';
import { AuthHelper } from '../helpers/authHelper';

test.describe('PT01: Citizen Registration and Login', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    authHelper = new AuthHelper(page);
  });

  test('PT01.1 - Citizen can register with name and username', async ({ page }) => {
    const uniqueUser = {
      ...testUsers.validUser,
      username: `citizen_${Date.now()}`,
      email: `citizen_${Date.now()}@example.com`,
    };

    await registerPage.goto();
    await registerPage.register(uniqueUser);
    await page.waitForTimeout(2000);
    
    const isOnLoginPage = page.url().includes('/login');
    const hasSuccessMessage = await registerPage.isSuccessVisible();
    
    expect(isOnLoginPage || hasSuccessMessage).toBeTruthy();
  });

  test('PT01.2 - Registered citizen can login to access the system', async ({ page }) => {
    const uniqueUser = {
      ...testUsers.validUser,
      username: `citizen_${Date.now()}`,
      email: `citizen_${Date.now()}@example.com`,
    };
    
    await authHelper.registerUser(uniqueUser);
    
    await loginPage.goto();
    await loginPage.login(uniqueUser.username, uniqueUser.password);
    await page.waitForURL(/\/(map|dashboard)/, { timeout: 10000 });
    
    expect(page.url()).toMatch(/\/(map|dashboard)/);
  });
});
