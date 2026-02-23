import { Page, Locator } from '@playwright/test';

export class UserPage {
  readonly page: Page;

  readonly avatarImage: Locator;
  readonly nameLine: Locator;
  readonly surnameLine: Locator;
  readonly usernameLine: Locator;
  readonly emailLine: Locator;
  readonly telegramLine: Locator;
  readonly emailNotificationsLine: Locator;
  readonly editButton: Locator;

  // Edit mode locators
  readonly formRoot: Locator;
  readonly avatarPreview: Locator;
  readonly avatarUploadInput: Locator;
  readonly telegramInput: Locator;
  readonly emailNotificationsCheckbox: Locator;
  readonly saveButton: Locator;
  readonly undoButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // VIEW mode
    this.avatarImage = page.locator('img[alt="User Avatar"]');
    this.nameLine = page.locator('p:has-text("Name:")');
    this.surnameLine = page.locator('p:has-text("Surname:")');
    this.usernameLine = page.locator('p:has-text("Username:")');
    this.emailLine = page.locator('p:has-text("Email:")');
    this.telegramLine = page.locator('p:has-text("Telegram:")');
    this.emailNotificationsLine = page.locator('p:has-text("Email Notifications:")');
    this.editButton = page.locator('button:has-text("Edit Profile")');

    // EDIT mode (form that appears in-place)
    this.formRoot = page.locator('form');
    this.avatarPreview = page.locator('.avatar-wrapper img[alt="User Avatar"]');
    this.avatarUploadInput = page.locator('input[type="file"]');
    this.telegramInput = page.locator('input[name="telegram"]');
    this.emailNotificationsCheckbox = page.locator('input[type="checkbox"][name="emailNotifications"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.undoButton = page.locator('button:has-text("Undo")');
    this.errorMessage = page.locator('.error, .alert-danger, [role="alert"]');
    this.successMessage = page.locator('.success, .alert-success');
  }

  // NAVIGATION
  async goto() {
    await this.page.goto('/user');
    await this.avatarImage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  // VIEW getters (ritornano il testo della riga intera)
  async getNameLine(): Promise<string> {
    return (await this.nameLine.textContent())?.trim() ?? '';
  }
  async getSurnameLine(): Promise<string> {
    return (await this.surnameLine.textContent())?.trim() ?? '';
  }
  async getUsernameLine(): Promise<string> {
    return (await this.usernameLine.textContent())?.trim() ?? '';
  }
  async getEmailLine(): Promise<string> {
    return (await this.emailLine.textContent())?.trim() ?? '';
  }
  async getTelegramLine(): Promise<string> {
    return (await this.telegramLine.textContent())?.trim() ?? '';
  }
  async getEmailNotificationsLine(): Promise<string> {
    return (await this.emailNotificationsLine.textContent())?.trim() ?? '';
  }

  // ENTER / EXIT edit mode
  async enterEditMode() {
    await this.editButton.click();
    await this.formRoot.waitFor({ state: 'visible', timeout: 5000 });
  }

  async cancelEdit() {
    await this.undoButton.click();
    await this.formRoot.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }

  async fillEditForm(options: {
    avatarFilePath?: string;
    telegram?: string;
    emailNotifications?: boolean;
  }) {
    if (options.avatarFilePath) {
      await this.avatarUploadInput.setInputFiles(options.avatarFilePath);
      await this.avatarPreview.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }

    if (typeof options.telegram !== 'undefined') {
      await this.telegramInput.fill(options.telegram);
    }

    if (typeof options.emailNotifications !== 'undefined') {
      const isChecked = await this.emailNotificationsCheckbox.isChecked().catch(() => false);
      if (options.emailNotifications !== isChecked) {
        await this.emailNotificationsCheckbox.click();
      }
    }
  }

  async saveChanges() {
    await this.saveButton.click();
  }

  async isEditFormVisible(): Promise<boolean> {
    return await this.formRoot.isVisible().catch(() => false);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent())?.trim() ?? '';
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  async getSuccessMessage(): Promise<string> {
    return (await this.successMessage.textContent())?.trim() ?? '';
  }
}
