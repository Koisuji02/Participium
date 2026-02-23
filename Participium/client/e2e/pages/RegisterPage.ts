import { Page, Locator } from '@playwright/test';

/**
 * Register Page Object Model
 * Represents the registration page and its interactions
 */
export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.firstNameInput = page.locator('input[name="firstName"], input[name="name"]');
    this.lastNameInput = page.locator('input[name="lastName"], input[name="surname"]');
    this.emailInput = page.locator('input[name="email"], input[type="email"]');
    this.passwordInput = page.locator('input[name="password"]').first();
    this.registerButton = page.locator('button[type="submit"], button:has-text("Register")');
    this.loginLink = page.locator('a:has-text("Login")');
    this.successMessage = page.locator('.success, .alert-success');
    this.errorMessage = page.locator('.error, .alert-danger, [role="alert"]');
  }

  async goto() {
    // Navigate to login page and click Register button
    await this.page.goto('/login');
    await this.page.click('button:has-text("Register")');
    // Wait for registration form to appear
    await this.usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async register(userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.usernameInput.fill(userData.username);
    await this.firstNameInput.fill(userData.firstName);
    await this.lastNameInput.fill(userData.lastName);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    await this.registerButton.click();
  }

  async clickLogin() {
    await this.loginLink.click();
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }
}
