import "reflect-metadata";
import { initializeTestDatabase, closeTestDatabase, TestDataSource } from "./test-datasource";

describe("Database Connection Test", () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("dovrebbe connettersi al database di test", () => {
    expect(TestDataSource.isInitialized).toBe(true);
  });

  it("dovrebbe usare SQLite in memoria", () => {
    expect(TestDataSource.options.type).toBe("sqlite");
    expect(TestDataSource.options.database).toBe(":memory:");
  });

  it("dovrebbe caricare le entità", () => {
    const entities = TestDataSource.entityMetadatas;
    expect(entities.length).toBeGreaterThan(0);
    
    console.log(`\n✅ Trovate ${entities.length} entità:`);
    entities.forEach(entity => {
      console.log(`   - ${entity.name}`);
    });
  });

  it("dovrebbe poter eseguire una query di base", async () => {
    const result = await TestDataSource.query("SELECT 1 as test");
    expect(result).toBeDefined();
    expect(result[0].test).toBe(1);
  });
});
