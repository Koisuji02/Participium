import { Page, Locator } from '@playwright/test';

/**
 * Officer Page Object Model
 * Represents the officer dashboard for reviewing reports
 */
export class OfficerPage {
  readonly page: Page;
  readonly pendingReportsTab: Locator;
  readonly reportsList: Locator;
  readonly reportCard: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly reasonTextarea: Locator;
  readonly assignButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pendingReportsTab = page.locator('button:has-text("Pending"), [data-tab="pending"]');
    this.reportsList = page.locator('.reports-list, [data-testid="reports-list"]');
    this.reportCard = page.locator('.report-card, [data-testid="report-card"]');
    this.approveButton = page.locator('button:has-text("Approve")');
    this.rejectButton = page.locator('button:has-text("Reject"), button:has-text("Decline")');
    this.reasonTextarea = page.locator('textarea[name="reason"], textarea[placeholder*="reason"]');
    this.assignButton = page.locator('button:has-text("Assign")');
    this.logoutButton = page.locator('button:has-text("Logout")');
  }

  async goto() {
    await this.page.goto('/officer');
  }

  async viewPendingReports() {
    await this.pendingReportsTab.click();
  }

  async getReportCount(): Promise<number> {
    return await this.reportCard.count();
  }

  async selectReport(index: number = 0) {
    await this.reportCard.nth(index).click();
  }

  async approveReport() {
    await this.approveButton.click();
  }

  async rejectReport(reason: string) {
    await this.rejectButton.click();
    await this.reasonTextarea.fill(reason);
    await this.page.locator('button:has-text("Confirm"), button[type="submit"]').click();
  }

  async assignReport(officerName: string) {
    await this.assignButton.click();
    await this.page.locator(`select[name="officer"], [role="combobox"]`).selectOption(officerName);
    await this.page.locator('button:has-text("Assign"), button[type="submit"]').click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
