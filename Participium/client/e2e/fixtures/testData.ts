

export const testUsers = {
  validUser: {
    username: 'e2eTestUser',
    firstName: 'Test',
    lastName: 'User',
    email: 'e2etest@example.com',
    password: 'Test@1234',
  },
  
  anotherUser: {
    username: 'e2eUser2',
    firstName: 'Another',
    lastName: 'User',
    email: 'e2euser2@example.com',
    password: 'Test@5678',
  },
};

export const testOfficers = {
  admin: {
    username: 'n.s@comune.it',
    password: 'pass',
  },
  
  publicRelations: {
    username: 'SeverjanLici',
    password: 'pass',
    role: 'MUNICIPAL_PUBLIC_RELATIONS_OFFICER',
  },
  
  technicalStaff: {
    username: 'SeverjanLici',
    password: 'pass',
    role: 'TECHNICAL_OFFICE_STAFF',
  },
};

export const testReports = {
  validReport: {
    title: 'E2E Test Report - Pothole',
    description: 'This is a test report created by E2E tests. There is a large pothole on Main Street that needs immediate attention.',
    category: 'infrastructure',
    latitude: 45.464211,
    longitude: 9.191383,
    anonymity: false,
  },
  
  anonymousReport: {
    title: 'E2E Anonymous Report',
    description: 'This is an anonymous test report for E2E testing purposes. The park lights are not working.',
    category: 'environment',
    latitude: 45.47,
    longitude: 9.2,
    anonymity: true,
  },
  
  sanitationReport: {
    title: 'E2E Sanitation Issue',
    description: 'Garbage bins are overflowing at the city center. This requires immediate sanitation department attention.',
    category: 'sanitation',
    latitude: 45.475,
    longitude: 9.195,
    anonymity: false,
  },
};

export const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api/v1';
