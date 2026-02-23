# End-to-End (E2E) Testing Guide

## Overview

This directory contains end-to-end tests for the Participium application using Playwright. These tests verify the complete user flows from UI interaction to backend API responses.

## Directory Structure

```
e2e/
├── tests/              # Test specifications
│   ├── auth.spec.ts           # User authentication tests
│   ├── reports.spec.ts        # Report creation and display tests
│   └── officer-workflow.spec.ts # Officer review workflow tests
├── pages/              # Page Object Models (POM)
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── MapPage.ts
│   └── OfficerPage.ts
├── helpers/            # Test helper utilities
│   ├── authHelper.ts         # Authentication utilities
│   └── databaseHelper.ts     # Database setup/cleanup
└── fixtures/           # Test data
    └── testData.ts           # Reusable test data
```

## Prerequisites

1. **Install Playwright browsers** (already done):
   ```bash
   npx playwright install chromium
   ```

2. **Backend server must be running**:
   ```bash
   cd ../server
   npm run dev
   ```

3. **Frontend dev server** (automatically started by tests):
   - The tests will start the dev server automatically
   - Or run manually: `npm run dev`

## Running Tests

### Run all E2E tests (headless)
```bash
npm run test:e2e
```

### Run tests with browser visible (headed mode)
```bash
npm run test:e2e:headed
```

### Debug tests interactively
```bash
npm run test:e2e:debug
```

### Run tests with Playwright UI
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/tests/auth.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --grep "login"
```

### View test report
```bash
npm run test:e2e:report
```

## Test Scenarios

### 1. Authentication Tests (`auth.spec.ts`)
- ✅ User registration with valid data
- ✅ User login with valid credentials
- ✅ Login fails with invalid credentials
- ✅ Email validation during registration
- ✅ User logout functionality

### 2. Report Tests (`reports.spec.ts`)
- ✅ View map page with approved reports
- ✅ Create new report via UI
- ✅ Anonymous reports hide user information
- ✅ Map markers are clickable and show details
- ✅ Approved reports appear on public map

### 3. Officer Workflow Tests (`officer-workflow.spec.ts`)
- ✅ Officer login and dashboard access
- ✅ View pending reports
- ✅ Approve a report
- ✅ Reject a report with reason
- ✅ End-to-end flow: user creates → officer approves → appears on map

## Page Object Model (POM)

The tests use Page Object Models for maintainability:

```typescript
// Example usage
import { LoginPage } from '../pages/LoginPage';

const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('username', 'password');
```

### Available Page Objects:
- **LoginPage**: Login form interactions
- **RegisterPage**: User registration
- **MapPage**: Map display and markers
- **OfficerPage**: Officer dashboard and review actions

## Helper Utilities

### AuthHelper
```typescript
import { AuthHelper } from '../helpers/authHelper';

const authHelper = new AuthHelper(page);

// Register via API
await authHelper.registerUser(userData);

// Login via API (faster than UI)
const token = await authHelper.loginUser(username, password);

// Login via UI
await authHelper.loginViaUI(page, username, password);
```

### DatabaseHelper
```typescript
import { DatabaseHelper } from '../helpers/databaseHelper';

const dbHelper = new DatabaseHelper(page);

// Create a report via API
const report = await dbHelper.createReport(token, reportData);

// Get approved reports
const reports = await dbHelper.getApprovedReports();
```

## Test Data

Test data is centralized in `fixtures/testData.ts`:

```typescript
import { testUsers, testReports, testOfficers } from '../fixtures/testData';

// Use predefined test users
const user = testUsers.validUser;

// Use predefined test reports
const report = testReports.validReport;
```

## Configuration

Test configuration is in `playwright.config.ts`:

```typescript
{
  baseURL: 'http://localhost:5173',    // Frontend URL
  timeout: 60000,                       // Test timeout
  retries: process.env.CI ? 2 : 0,     // Retry on CI
  workers: process.env.CI ? 1 : undefined
}
```

### Environment Variables

You can customize the API URL:

```bash
# Linux/Mac
export API_BASE_URL=http://localhost:3000/api/v1

# Windows PowerShell
$env:API_BASE_URL="http://localhost:3000/api/v1"
```

## Best Practices

### 1. **Use unique test data**
```typescript
const uniqueUser = {
  ...testUsers.validUser,
  username: `e2etest_${Date.now()}`,
  email: `e2etest_${Date.now()}@example.com`,
};
```

### 2. **Setup via API, verify via UI**
- Setup (create users, reports) via API for speed
- Verify the UI displays correctly

### 3. **Wait appropriately**
```typescript
// Wait for navigation
await page.waitForURL(/\/map/);

// Wait for element
await page.waitForSelector('.report-card');

// Wait for API response
await page.waitForResponse(response => 
  response.url().includes('/api/v1/reports')
);
```

### 4. **Cleanup test data**
```typescript
test.afterEach(async ({ page }) => {
  // Logout
  await authHelper.logout();
});
```

## Debugging Tests

### 1. **Use Playwright Inspector**
```bash
npm run test:e2e:debug
```

### 2. **Add screenshots**
```typescript
await page.screenshot({ path: 'debug.png' });
```

### 3. **Console logs**
```typescript
page.on('console', msg => console.log('Browser log:', msg.text()));
```

### 4. **Slow down execution**
```bash
npx playwright test --headed --slow-mo=1000
```

## CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    API_BASE_URL: http://localhost:3000/api/v1
```

## Troubleshooting

### Tests are flaky
- Increase timeouts in `playwright.config.ts`
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use `test.fail()` for known flaky tests

### Backend not responding
- Ensure backend is running: `cd ../server && npm run dev`
- Check API_BASE_URL is correct
- Verify database is accessible

### Browser not launching
```bash
# Reinstall browsers
npx playwright install --force
```

### Selectors not found
- Update page objects if UI changed
- Use `await page.pause()` to inspect the page
- Check if elements load asynchronously

## Writing New Tests

1. **Create test file** in `e2e/tests/`
2. **Import necessary page objects and helpers**
3. **Follow the pattern**:

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from '../pages/MyPage';

test.describe('My Feature E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const myPage = new MyPage(page);
    
    // Act
    await myPage.goto();
    await myPage.doSomething();
    
    // Assert
    expect(await myPage.isSuccessful()).toBeTruthy();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

## Support

For issues or questions:
1. Check the test output and screenshots in `test-results/`
2. View the HTML report: `npm run test:e2e:report`
3. Run in debug mode: `npm run test:e2e:debug`
