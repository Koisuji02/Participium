// Setup globale per tutti i test
import { TestDataSource } from './test-datasource';

// Mock AppDataSource per usare TestDataSource nei test
jest.mock('../../src/database/connection', () => ({
  AppDataSource: TestDataSource,
  initializeDatabase: jest.fn(),
  closeDatabase: jest.fn()
}));

// Aumenta il timeout per i test di integrazione
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Inizializza il database di test
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Chiudi la connessione al database
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
});
