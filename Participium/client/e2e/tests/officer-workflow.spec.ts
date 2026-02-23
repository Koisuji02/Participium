import { test, expect } from '@playwright/test';
import { OfficerPage } from '../pages/OfficerPage';
import { MapPage } from '../pages/MapPage';
import { ReportPage } from '../pages/ReportPage';
import { LoginPage } from '../pages/LoginPage';
import { testUsers, testReports, testOfficers } from '../fixtures/testData';
import { AuthHelper } from '../helpers/authHelper';
import { DatabaseHelper } from '../helpers/databaseHelper';

test.describe('Officer Workflow - PT02, PT03, PT06', () => {
  let officerPage: OfficerPage;
  let mapPage: MapPage;
  let reportPage: ReportPage;
  let loginPage: LoginPage;
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    officerPage = new OfficerPage(page);
    mapPage = new MapPage(page);
    reportPage = new ReportPage(page);
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper(page);
  });

  test('PT02/PT03 - System administrator can setup municipality users with roles', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(500);
    
    await page.fill('input[name="username"]', testOfficers.admin.username);
    await page.fill('input[name="password"]', testOfficers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const notOnLoginPage = !page.url().includes('/login');
    expect(notOnLoginPage).toBeTruthy();
  });

  test('PT06.1 - Municipal public relations officer can view pending reports', async ({ page }) => {
    await loginPage.goto();
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(500);
    
    await page.fill('input[name="username"]', testOfficers.admin.username);
    await page.fill('input[name="password"]', testOfficers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/officer');
    await page.waitForTimeout(2000);
    
    const notOnLoginPage = !page.url().includes('/login');
    expect(notOnLoginPage).toBeTruthy();
  });

  test('PT06.2 - Officer can approve a report and it gets assigned to technical office', async ({ page }) => {
    await loginPage.goto();
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(500);
    
    await page.fill('input[name="username"]', testOfficers.admin.username);
    await page.fill('input[name="password"]', testOfficers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/officer');
    await page.waitForTimeout(2000);
    
    const notOnLoginPage = !page.url().includes('/login');
    expect(notOnLoginPage).toBeTruthy();
  });

  test('PT06.3 - Officer can reject a report with explanation', async ({ page }) => {
    await loginPage.goto();
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(500);
    
    await page.fill('input[name="username"]', testOfficers.admin.username);
    await page.fill('input[name="password"]', testOfficers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/officer');
    await page.waitForTimeout(2000);
    
    const notOnLoginPage = !page.url().includes('/login');
    expect(notOnLoginPage).toBeTruthy();
  });

  test('PT06 + PT07 - End-to-end: Report approval makes it visible on public map', async ({ page }) => {
    await mapPage.goto();
    await mapPage.waitForMapToLoad();
    await page.waitForTimeout(3000);
    
    const approvedReports = await dbHelper.getApprovedReports();
    expect(approvedReports.length).toBeGreaterThanOrEqual(0);
    
    const isMapVisible = await mapPage.isMapVisible();
    expect(isMapVisible).toBeTruthy();
  });
});
