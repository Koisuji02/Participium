import { Page, Locator } from '@playwright/test';

/**
 * Map Page Object Model
 * Represents the map page where approved reports are displayed
 */
export class MapPage {
  readonly page: Page;
  readonly map: Locator;
  readonly markers: Locator;
  readonly searchBox: Locator;
  readonly filterButton: Locator;
  readonly createReportButton: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.map = page.locator('.leaflet-container, #map');
    this.markers = page.locator('.leaflet-marker-icon');
    this.searchBox = page.locator('input[type="search"], input[placeholder*="Search"]');
    this.filterButton = page.locator('button:has-text("Filter")');
    this.createReportButton = page.locator('button:has-text("Create Report"), button:has-text("New Report")');
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu');
  }

  async goto() {
    await this.page.goto('/map');
  }

  async waitForMapToLoad() {
    await this.map.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getMarkerCount(): Promise<number> {
    return await this.markers.count();
  }

  async clickMarker(index: number = 0) {
    await this.markers.nth(index).click();
  }

  async searchLocation(query: string) {
    await this.searchBox.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async clickCreateReport() {
    await this.createReportButton.click();
  }

  async isMapVisible(): Promise<boolean> {
    return await this.map.isVisible();
  }
}
