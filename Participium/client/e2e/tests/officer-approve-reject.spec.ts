import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/authHelper';
import { DatabaseHelper } from '../helpers/databaseHelper';
import { API_BASE_URL } from '../fixtures/testData';

test.describe('Officer Report Review', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper(page);
  });

  test('Officer can approve a report and it appears on the map', async ({ page }) => {
    const userToken = await authHelper.loginUser('testuser', 'password123');
    
    const reportData = {
      title: `Approve Test ${Date.now()}`,
      description: 'This report should be approved and appear on the map',
      category: 'infrastructure',
      latitude: 45.0703,
      longitude: 7.6869,
      anonymity: false,
    };

    const createdReport = await dbHelper.createReport(userToken, reportData);
    expect(createdReport).toBeTruthy();
    const reportId = createdReport.id;

    const officerToken = await authHelper.loginOfficer('SeverjanLici', 'pass');
    
    const approveResponse = await page.request.patch(`${API_BASE_URL}/officers/reviewdocs/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        state: 'APPROVED',
      },
    });

    expect(approveResponse.ok()).toBeTruthy();

    const allReportsResponse = await page.request.get(`${API_BASE_URL}/reports`);
    const allReports = await allReportsResponse.json();
    
    const approvedReport = allReports.find((r: any) => r.id === reportId);
    expect(approvedReport).toBeTruthy();
  });

  test('Officer can reject a report and it does not appear on the map', async ({ page }) => {
    const userToken = await authHelper.loginUser('testuser', 'password123');
    
    const reportData = {
      title: `Reject Test ${Date.now()}`,
      description: 'This report should be rejected and not appear on the map',
      category: 'environment',
      latitude: 45.0750,
      longitude: 7.6900,
      anonymity: false,
    };

    const createdReport = await dbHelper.createReport(userToken, reportData);
    expect(createdReport).toBeTruthy();
    const reportId = createdReport.id;

    const officerToken = await authHelper.loginOfficer('SeverjanLici', 'pass');
    
    const rejectResponse = await page.request.patch(`${API_BASE_URL}/officers/reviewdocs/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        state: 'REJECTED',
        reason: 'Test rejection: This report does not meet requirements',
      },
    });

    expect(rejectResponse.ok()).toBeTruthy();

    const allReportsResponse = await page.request.get(`${API_BASE_URL}/reports`);
    const allReports = await allReportsResponse.json();
    
    const rejectedReport = allReports.find((r: any) => r.id === reportId);
    expect(rejectedReport).toBeUndefined();
  });
});
