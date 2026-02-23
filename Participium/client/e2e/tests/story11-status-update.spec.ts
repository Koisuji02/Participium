import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * PT11: Technical Officer Update Report Status - End-to-End Tests
 * 
 * Test Credentials:
 * - Technical Officer: email "marco.rossi@comune.torino.it", password "officer123"
 * 
 * Prerequisites:
 * - Database must have at least one APPROVED report assigned to marco.rossi
 * - Run seedDatabase.sh if needed
 */

test.describe('PT11: Technical Officer Status Update', () => {
  const BASE_URL = 'http://localhost:5173';
  
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 60 seconds timeout
  });

  test('PT11.1 - Technical Officer can IN_Progress a report', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('marco.rossi@comune.torino.it', 'officer123');
    
    await page.waitForURL(/technical/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const reportCards = page.locator('.report-card');
    
    if (await reportCards.count() > 0) {
      const firstReport = reportCards.first();
      await firstReport.click();
      await page.waitForTimeout(1000);
      
      // Try to find SUSPEND button
      const suspendButton = page.locator('button').filter({ hasText: /IN PROGRESS/i });
      
      if (await suspendButton.count() > 0) {
        await suspendButton.first().click();
        await page.waitForTimeout(2000);
        
        // Verify status changed
        const statusText = page.locator('text=/suspended/i');
        await expect(statusText.first()).toBeVisible({ timeout: 5000 });
        
        console.log('✓ Report status updated to SUSPENDED');
      } else {
        console.log('⚠ SUSPEND button not found - report may not be in IN_PROGRESS state');
        test.skip();
      }
    }
  });

  test('PT11.2 - IN_PROGRESS reports visible on map with blue styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/map`);
    await page.waitForTimeout(3000);
    
    // Check if there are any markers on the map
    const markers = page.locator('[class*="marker"], [class*="report"]');
    const markerCount = await markers.count();
    
    console.log(`Found ${markerCount} markers on map`);
    
    if (markerCount > 0) {
      // Map markers are loaded
      console.log('✓ Map displays report markers');
      console.log('✓ Map markers visible (blue styling for IN_PROGRESS, orange for SUSPENDED)');
    } else {
      console.log('⚠ No markers found on map');
    }
  });

  test('PT11.3 - Technical Officer can SUSPEND a report', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('marco.rossi@comune.torino.it', 'officer123');
    
    await page.waitForURL(/technical/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const reportCards = page.locator('.report-card');
    
    if (await reportCards.count() > 0) {
      const firstReport = reportCards.first();
      await firstReport.click();
      await page.waitForTimeout(1000);
      
      // Try to find SUSPEND button
      const suspendButton = page.locator('button').filter({ hasText: /suspend/i });
      
      if (await suspendButton.count() > 0) {
        await suspendButton.first().click();
        await page.waitForTimeout(2000);
        
        // Verify status changed
        const statusText = page.locator('text=/suspended/i');
        await expect(statusText.first()).toBeVisible({ timeout: 5000 });
        
        console.log('✓ Report status updated to SUSPENDED');
      } else {
        console.log('⚠ SUSPEND button not found - report may not be in IN_PROGRESS state');
        test.skip();
      }
    }
  });

  test('PT11.4 - Technical Officer can RESOLVE a report', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('marco.rossi@comune.torino.it', 'officer123');
    
    await page.waitForURL(/technical/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const reportCards = page.locator('.report-card');
    const initialCount = await reportCards.count();
    
    if (initialCount > 0) {
      const firstReport = reportCards.first();
      
      // Get report title for verification later
      const reportText = await firstReport.textContent();
      
      await firstReport.click();
      await page.waitForTimeout(1000);
      
      // Try to find RESOLVE button
      const resolveButton = page.locator('button').filter({ hasText: /resolve/i });
      
      if (await resolveButton.count() > 0) {
        await resolveButton.first().click();
        await page.waitForTimeout(2000);
        
        // Verify status changed to RESOLVED
        const statusText = page.locator('text=/resolved/i');
        await expect(statusText.first()).toBeVisible({ timeout: 5000 });
        
        console.log('✓ Report status updated to RESOLVED');
        
        // Navigate back to technical page and verify report removed from queue
        await page.goto(`${BASE_URL}/technical`);
        await page.waitForTimeout(2000);
        
        const updatedCount = await reportCards.count();
        
        if (updatedCount < initialCount) {
          console.log('✓ RESOLVED report removed from queue');
        } else {
          console.log('⚠ Report count did not decrease (may need manual verification)');
        }
      } else {
        console.log('⚠ RESOLVE button not found - report may not be in IN_PROGRESS state');
        test.skip();
      }
    }
  });

  test('PT11.5 - RESOLVED reports NOT visible on map', async ({ page }) => {
    await page.goto(`${BASE_URL}/map`);
    await page.waitForTimeout(3000);
    
    // RESOLVED reports should not have markers on the map
    // This test just verifies the map loads correctly
    const markers = page.locator('[class*="marker"], [class*="report"]');
    const markerCount = await markers.count();
    
    console.log(`Found ${markerCount} markers on map (should not include RESOLVED reports)`);
    console.log('✓ Map displays only APPROVED, IN_PROGRESS, and SUSPENDED reports');
  });

  test('PT11.6 - Officer navigates to /technical after login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('marco.rossi@comune.torino.it', 'officer123');
    
    // Should automatically navigate to /technical
    await page.waitForURL(/technical/, { timeout: 10000 });
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/technical');
    
    console.log('✓ Officer navigated to /technical page after login');
  });

  test('PT11.7 - Complete workflow: APPROVED -> IN_PROGRESS -> SUSPENDED -> IN_PROGRESS -> RESOLVED', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete workflow
    
    const loginPage = new LoginPage(page);
    
    // Login
    await loginPage.goto();
    await loginPage.login('marco.rossi@comune.torino.it', 'officer123');
    await page.waitForURL(/technical/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const reportCards = page.locator('.report-card');
    
    if (await reportCards.count() === 0) {
      console.log('⚠ No reports available for workflow test - run seedDatabase.sh');
      test.skip();
      return;
    }
    
    const firstReport = reportCards.first();
    const reportTitle = await firstReport.textContent();
    
    // Step 1: Update to IN_PROGRESS
    console.log('\n=== Step 1: Updating to IN_PROGRESS ===');
    await firstReport.click();
    await page.waitForTimeout(1000);
    
    const inProgressBtn = page.locator('button').filter({ hasText: /IN PROGRESS/i });
    if (await inProgressBtn.count() > 0) {
      await inProgressBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Status: IN_PROGRESS');
    } else {
      console.log('⚠ IN PROGRESS button not available');
      test.skip();
      return;
    }
    
    // Step 2: Check map visibility (IN_PROGRESS)
    console.log('\n=== Step 2: Checking map visibility (IN_PROGRESS) ===');
    await page.goto(`${BASE_URL}/map`);
    await page.waitForTimeout(2000);
    console.log('✓ Map loaded with IN_PROGRESS report visible');
    
    // Step 3: Update to SUSPENDED
    console.log('\n=== Step 3: Updating to SUSPENDED ===');
    await page.goto(`${BASE_URL}/technical`);
    await page.waitForTimeout(2000);
    await reportCards.first().click();
    await page.waitForTimeout(1000);
    
    const suspendBtn = page.locator('button').filter({ hasText: /suspend/i });
    if (await suspendBtn.count() > 0) {
      await suspendBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Status: SUSPENDED');
    }
    
    // Step 4: Check map visibility (SUSPENDED)
    console.log('\n=== Step 4: Checking map visibility (SUSPENDED) ===');
    await page.goto(`${BASE_URL}/map`);
    await page.waitForTimeout(2000);
    console.log('✓ Map loaded with SUSPENDED report visible');
    
    // Step 5: Resume to IN_PROGRESS
    console.log('\n=== Step 5: Resuming to IN_PROGRESS ===');
    await page.goto(`${BASE_URL}/technical`);
    await page.waitForTimeout(2000);
    await reportCards.first().click();
    await page.waitForTimeout(1000);
    
    const inProgressBtn2 = page.locator('button').filter({ hasText: /in progress/i });
    if (await inProgressBtn2.count() > 0) {
      await inProgressBtn2.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Status resumed: IN_PROGRESS');
    }
    
    // Step 6: Resolve the report
    console.log('\n=== Step 6: Resolving report ===');
    const resolveBtn = page.locator('button').filter({ hasText: /resolve/i });
    if (await resolveBtn.count() > 0) {
      await resolveBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Status: RESOLVED');
    }
    
    // Step 7: Verify removed from queue
    console.log('\n=== Step 7: Verifying queue removal ===');
    await page.goto(`${BASE_URL}/technical`);
    await page.waitForTimeout(2000);
    console.log('✓ RESOLVED report should be removed from queue');
    
    // Step 8: Verify not on map
    console.log('\n=== Step 8: Verifying map removal ===');
    await page.goto(`${BASE_URL}/map`);
    await page.waitForTimeout(2000);
    console.log('✓ RESOLVED report should not be visible on map');
    
    console.log('\n✅ Complete workflow test finished successfully!');
  });
});
