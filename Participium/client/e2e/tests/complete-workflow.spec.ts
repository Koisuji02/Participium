import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/authHelper';
import { DatabaseHelper } from '../helpers/databaseHelper';
import { API_BASE_URL } from '../fixtures/testData';

test.describe('Complete Workflow: Citizen Report to Officer Review', () => {
  let authHelper: AuthHelper;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dbHelper = new DatabaseHelper(page);
  });

  test('Full workflow: Citizen registers, submits reports, officer reviews', async ({ page }) => {
    const timestamp = Date.now();
    
    // Step 1: Register as a citizen
    const citizen = {
      username: `citizen_${timestamp}`,
      firstName: 'Test',
      lastName: 'Citizen',
      email: `citizen_${timestamp}@example.com`,
      password: 'Test@1234',
    };
    
    await authHelper.registerUser(citizen);
    const citizenToken = await authHelper.loginUser(citizen.username, citizen.password);
    expect(citizenToken).toBeTruthy();

    // Step 2: Citizen creates 2 reports (one for approval, one for rejection)
    const reportForApproval = {
      title: `Pothole on Main Street ${timestamp}`,
      description: 'Large pothole causing traffic issues - needs immediate repair',
      category: 'infrastructure',
      latitude: 45.0703,
      longitude: 7.6700,
      anonymity: false,
    };

    const reportForRejection = {
      title: `Damaged Sidewalk ${timestamp}`,
      description: 'Small crack in sidewalk - minor issue',
      category: 'infrastructure',
      latitude: 45.0750,
      longitude: 7.6650,
      anonymity: false,
    };

    const createdReport1 = await dbHelper.createReport(citizenToken, reportForApproval);
    expect(createdReport1).toBeTruthy();
    const approvalReportId = createdReport1.id;

    const createdReport2 = await dbHelper.createReport(citizenToken, reportForRejection);
    expect(createdReport2).toBeTruthy();
    const rejectionReportId = createdReport2.id;

    // Step 3: Admin creates a new officer
    const adminToken = await authHelper.loginOfficer('n.s@comune.it', 'pass');

    const officerUsername = `officer_${timestamp}`;
    
    const newOfficer = {
      username: officerUsername,
      name: 'Test',
      surname: 'Officer',
      email: `officer_${timestamp}@comune.torino.it`,
      password: 'pass',
      Role: 'MUNICIPAL_PUBLIC_RELATIONS_OFFICER',
      Office: 'ORGANIZATION',
    };

    const createOfficerResponse = await page.request.post(`${API_BASE_URL}/officers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: newOfficer,
    });

    expect(createOfficerResponse.ok()).toBeTruthy();

    // Step 4: Officer logs in
    const officerToken = await authHelper.loginOfficer(officerUsername, 'pass');
    expect(officerToken).toBeTruthy();

    // Step 5: Officer approves first report
    const approveResponse = await page.request.patch(`${API_BASE_URL}/officers/reviewdocs/${approvalReportId}`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        state: 'APPROVED',
      },
    });

    expect(approveResponse.ok()).toBeTruthy();

    // Step 6: Officer rejects second report
    const rejectResponse = await page.request.patch(`${API_BASE_URL}/officers/reviewdocs/${rejectionReportId}`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        state: 'REJECTED',
        reason: 'Random reason for rejection',
      },
    });

    expect(rejectResponse.ok()).toBeTruthy();

    // Step 7: Verify approved report appears on public map
    const publicReportsResponse = await page.request.get(`${API_BASE_URL}/reports`);
    const publicReports = await publicReportsResponse.json();
    
    const approvedReportOnMap = publicReports.find((r: any) => r.id === approvalReportId);
    expect(approvedReportOnMap).toBeTruthy();

    // Step 8: Verify rejected report does NOT appear on public map
    const rejectedReportOnMap = publicReports.find((r: any) => r.id === rejectionReportId);
    expect(rejectedReportOnMap).toBeUndefined();
  });
});
