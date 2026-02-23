import { Page, Locator } from '@playwright/test';

/**
 * Login Page Object Model
 * Represents the login page and its interactions
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    this.passwordInput = page.locator('input[name="password"], input[type="password"]');
    this.loginButton = page.locator('button[type="submit"], button:has-text("Login")');
    this.registerLink = page.locator('a:has-text("Register")');
    this.errorMessage = page.locator('.error, .alert-danger, [role="alert"]');
  }

  async goto(baseURL: string = 'http://localhost:5173') {
    // Navigate to login page and click Login button
    await this.page.goto(`${baseURL}/login`);
    await this.page.click('button:has-text("Login")');
    // Wait for login form to appear
    await this.usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async clickRegister() {
    await this.registerLink.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}
