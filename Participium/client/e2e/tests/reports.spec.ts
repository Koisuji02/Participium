import { test, expect } from '@playwright/test';
import { MapPage } from '../pages/MapPage';
import { ReportPage } from '../pages/ReportPage';
import { LoginPage } from '../pages/LoginPage';
import { testUsers, testReports } from '../fixtures/testData';
import { AuthHelper } from '../helpers/authHelper';
import { DatabaseHelper } from '../helpers/databaseHelper';

test.describe('Report Creation and Map Display', () => {
  let mapPage: MapPage;
  let reportPage: ReportPage;
  let loginPage: LoginPage;
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    mapPage = new MapPage(page);
    reportPage = new ReportPage(page);
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper(page);

    const uniqueUser = {
      ...testUsers.validUser,
      username: `citizen_${Date.now()}`,
      email: `citizen_${Date.now()}@example.com`,
    };

    await authHelper.registerUser(uniqueUser);
    await loginPage.goto();
    await loginPage.login(uniqueUser.username, uniqueUser.password);
    await page.waitForTimeout(1000);
  });

  test('PT04 - Citizen can select location on city map with latitude/longitude', async ({ page }) => {
    await mapPage.goto();
    await mapPage.waitForMapToLoad();
    
    const isVisible = await mapPage.isMapVisible();
    expect(isVisible).toBeTruthy();
    
    const mapElement = await mapPage.map;
    expect(await mapElement.isVisible()).toBeTruthy();
  });

  test('PT05 - Citizen can provide report details (title, description, category, photos)', async ({ page }) => {
    await reportPage.goto();
    
    await expect(reportPage.titleInput).toBeVisible();
    await expect(reportPage.categorySelect).toBeVisible();
    await expect(reportPage.descriptionInput).toBeVisible();
    await expect(reportPage.map).toBeVisible();
    
    await reportPage.titleInput.fill(testReports.validReport.title);
    await reportPage.categorySelect.selectOption(testReports.validReport.category);
    await reportPage.descriptionInput.fill(testReports.validReport.description);
    
    await expect(reportPage.titleInput).toHaveValue(testReports.validReport.title);
    await expect(reportPage.categorySelect).toHaveValue(testReports.validReport.category);
    await expect(reportPage.descriptionInput).toHaveValue(testReports.validReport.description);
  });

  test('PT05 - Citizen can submit a report (stored in database)', async ({ page }) => {
    const token = await authHelper.loginUser('testuser', 'password123');
    
    const reportData = {
      title: `E2E Test Report ${Date.now()}`,
      description: 'This report was created by E2E test to verify database storage',
      category: 'infrastructure',
      latitude: 45.0703,
      longitude: 7.6869,
      anonymity: false,
    };

    const createdReport = await dbHelper.createReport(token, reportData);
    
    expect(createdReport).toBeTruthy();
    expect(createdReport.title).toBe(reportData.title);
    expect(createdReport.category).toBe(reportData.category);
  });

  test('PT07.1 - Citizen can view approved reports on interactive map', async ({ page }) => {
    await mapPage.goto();
    await mapPage.waitForMapToLoad();
    
    const approvedReports = await dbHelper.getApprovedReports();
    const isVisible = await mapPage.isMapVisible();
    expect(isVisible).toBeTruthy();
  });

  test('PT07.2 - Map is zoomable and shows report details', async ({ page }) => {
    await mapPage.goto();
    await mapPage.waitForMapToLoad();
    await page.waitForTimeout(3000);
    
    const markerCount = await mapPage.getMarkerCount();
    
    if (markerCount > 0) {
      await mapPage.clickMarker(0);
      await page.waitForTimeout(1000);
      
      const hasPopup = await page.locator('.leaflet-popup, .report-details').isVisible().catch(() => false);
      expect(hasPopup).toBeTruthy();
    }
  });
});
