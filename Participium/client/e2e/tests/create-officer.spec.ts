import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/authHelper';
import { API_BASE_URL } from '../fixtures/testData';

test.describe('Create Test Officer', () => {
  test('Create a new test officer account', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    
    const adminToken = await authHelper.loginOfficer('n.s@comune.it', 'pass');
    expect(adminToken).toBeTruthy();

    const timestamp = Date.now();
    const newOfficer = {
      username: `test_officer_${timestamp}`,
      name: 'Test',
      surname: 'Officer',
      email: `test.officer.${timestamp}@comune.torino.it`,
      password: 'TestOfficer123',
      Role: 'MUNICIPAL_PUBLIC_RELATIONS_OFFICER',
      Office: 'SANITATION'
    };
    
    const response = await page.request.post(`${API_BASE_URL}/officers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: newOfficer
    });

    if (response.status() === 200) {
      const responseBody = await response.json();
      expect(responseBody.email).toBe(newOfficer.email);
    } else if (response.status() === 409 || response.status() === 400) {
      // Officer already exists
    } else {
      throw new Error(`Failed to create officer: ${response.status()}`);
    }

    const officerToken = await authHelper.loginOfficer(newOfficer.email, newOfficer.password);
    expect(officerToken).toBeTruthy();
  });
});
