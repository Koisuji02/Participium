# Participium Unit Tests

## Overview
Comprehensive unit test suite covering user stories PT01-PT07 for the Participium civic engagement platform.

## Test Coverage

### PT01: User Registration (5 tests)
- ✅ Validates required fields (firstName, lastName, email, password)
- ✅ Email format validation
- ✅ Password minimum length (6 characters)
- ✅ Authentication token storage
- ✅ User role assignment (citizen)

### PT02-PT03: Municipality User Setup and Roles (4 tests)
- ✅ Multiple user roles support (citizen, officer, municipal_administrator)
- ✅ Officer role assignment
- ✅ Municipal administrator role assignment
- ✅ Role permission differentiation

### PT04: Map Location Selection (6 tests)
- ✅ Turin default coordinates (45.0703, 7.6869)
- ✅ Latitude validation within Turin bounds
- ✅ Longitude validation within Turin bounds
- ✅ Location rejection outside boundaries
- ✅ Selected location storage
- ✅ Coordinate precision (6 decimal places)

### PT05: Report Details and Classification (8 tests)
- ✅ Title field requirement
- ✅ Description minimum length (30 characters)
- ✅ Category selection from predefined list
- ✅ All 6 categories validated (infrastructure, environment, safety, sanitation, transport, other)
- ✅ Minimum 1 photo requirement
- ✅ Maximum 3 photos limit
- ✅ Photo file type validation (JPG, PNG, WebP)
- ✅ Location data requirement

### PT06: Officer Report Review (8 tests)
- ✅ PENDING state support
- ✅ APPROVED state support
- ✅ DECLINED state support
- ✅ Rejection explanation requirement
- ✅ Optional approval message
- ✅ Category-based technical office assignment
- ✅ Approval notification creation
- ✅ Rejection notification with reason

### PT07: Interactive Map and Clustering (10 tests)
- ✅ Report markers display on map
- ✅ Report clustering when zoomed out (zoom < 17)
- ✅ Individual reports when zoomed in (zoom ≥ 17)
- ✅ Cumulative count on cluster markers
- ✅ Report title and reporter name display
- ✅ Anonymous reporter handling
- ✅ Map zoom functionality (12-18)
- ✅ Turin city boundary restrictions
- ✅ OpenStreetMap as base layer
- ✅ Category color coding

### Integration Tests (2 tests)
- ✅ Full citizen workflow: register → submit report → view on map
- ✅ Full officer workflow: login → review report → approve/reject

## Test Statistics
- **Total Tests**: 43
- **Passed**: 43 ✅
- **Failed**: 0 ❌
- **Coverage**: All user stories PT01-PT07

## Running Tests

### Run all tests
```powershell
npm test
```

### Run tests with UI
```powershell
npm run test:ui
```

### Generate coverage report
```powershell
npm run test:coverage
```

### Watch mode (auto-rerun on file changes)
Tests run in watch mode by default with `npm test`

## Test Framework
- **Test Runner**: Vitest 4.0.12
- **Testing Library**: @testing-library/react
- **Assertions**: @testing-library/jest-dom
- **Environment**: jsdom (browser simulation)
- **Coverage**: v8 provider

## Test Files
- `src/test/UserStories.test.ts` - Main test suite for PT01-PT07
- `src/test/setup.ts` - Test environment configuration
- `vitest.config.ts` - Vitest configuration

## Key Testing Patterns

### Business Logic Testing
Tests focus on validating business rules and requirements rather than implementation details:
- Form validation rules
- Data constraints (min/max values, required fields)
- State transitions
- Role-based permissions

### Mocked Dependencies
- localStorage (for auth tokens and roles)
- Leaflet maps (for geolocation functionality)
- window.matchMedia (for responsive UI)

### Test Isolation
Each test is independent and can run in any order. The test setup includes automatic cleanup after each test.

## Requirements Validation

### PT01: Registration is required before submitting reports ✅
Tests verify that user data (name, username) is properly validated and stored.

### PT02-PT03: Municipality users can be set up with different roles ✅
Tests confirm support for citizen, officer, and municipal administrator roles with proper differentiation.

### PT04: Reports must be tied to a specific location ✅
Tests validate that latitude/longitude coordinates are required and within Turin city boundaries.

### PT05: Mandatory fields are enforced ✅
Tests verify title, description (min 30 chars), category, and photos (min 1, max 3) requirements.

### PT06: Rejected reports must include an explanation ✅
Tests confirm that decline actions require a message, and approved reports are assigned to appropriate offices.

### PT07: Map should be zoomable with clustering ✅
Tests validate clustering at zoom < 17, individual markers at zoom ≥ 17, and proper report visualization.

## Continuous Integration
These tests are ready to be integrated into CI/CD pipelines:
- Fast execution (~17ms test time)
- No external dependencies required
- Exit codes properly set for CI systems

## Future Enhancements
- E2E tests with Playwright or Cypress
- API integration tests
- Component interaction tests with user-event
- Accessibility (a11y) tests
- Performance benchmarks

## Troubleshooting

### Tests not running
Ensure dependencies are installed:
```powershell
npm install
```

### Import errors
Check that all paths use relative imports and match the project structure.

### Mock issues
Review `src/test/setup.ts` for mock configurations if localStorage or window APIs behave unexpectedly.

## Contributing
When adding new tests:
1. Follow existing naming conventions
2. Group related tests in `describe` blocks
3. Use clear, descriptive test names starting with "should"
4. Maintain test isolation (no shared state between tests)
5. Update this README with new test counts

## Contact
For questions about the test suite, refer to the inline comments in the test files or consult the Participium development team.
