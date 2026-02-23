import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserDAO } from "../../src/models/dao/UserDAO";
import { OfficerDAO } from "../../src/models/dao/OfficerDAO";
import { ReportDAO } from "../../src/models/dao/ReportDAO";
import { OfficerRole } from "../../src/models/enums/OfficerRole";
import { OfficeType } from "../../src/models/enums/OfficeType";
import { RoleDAO } from "../../src/models/dao/RoleDAO";
import { MaintainerDAO } from "../../src/models/dao/MaintainerDAO";
import { NotificationDAO } from "../../src/models/dao/NotificationDAO";
import { InternalMessageDAO } from "../../src/models/dao/InternalMessageDAO";
import { FollowDAO } from "../../src/models/dao/FollowDAO";
import { PublicMessageDAO } from "../../src/models/dao/PublicMessageDAO";
// Database in memoria SQLite per i test
export const TestDataSource = new DataSource({
  type: "sqlite",
  database: ":memory:",
  dropSchema: true,
  entities: [UserDAO, OfficerDAO, ReportDAO, RoleDAO, MaintainerDAO, NotificationDAO, InternalMessageDAO, FollowDAO, PublicMessageDAO],
  synchronize: true,
  logging: false // Abilito per vedere cosa succede
});

export async function initializeTestDatabase() {
  if (!TestDataSource.isInitialized) {
    // console.log("🔄 Inizializzazione database di test...");
    await TestDataSource.initialize();
    
    // Verifica che il database sia stato inizializzato correttamente
    const entities = TestDataSource.entityMetadatas;
    // console.log("✅ Database di test inizializzato con successo");
    // console.log(`📊 Database type: ${TestDataSource.options.type}`);
    // console.log(`📁 Database: ${TestDataSource.options.database}`);
    // console.log(`📦 Entità caricate: ${entities.length}`);
    
    if (entities.length > 0) {
      // console.log("📋 Lista entità:");
      entities.forEach(entity => {
        // console.log(`   - ${entity.name} (tabella: ${entity.tableName})`);
      });
    } else {
      // console.warn("⚠️ ATTENZIONE: Nessuna entità caricata!");
    }
  }
  return TestDataSource;
}

export async function closeTestDatabase() {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
    // console.log("Test database closed");
  }
}

export async function clearDatabase() {
  if (TestDataSource.isInitialized) {
    const queryRunner = TestDataSource.createQueryRunner();
    
    try {
      // Disable foreign key constraints
      await queryRunner.query('PRAGMA foreign_keys = OFF;');
      
      const entities = TestDataSource.entityMetadatas;
      
      for (const entity of entities) {
        const repository = TestDataSource.getRepository(entity.name);
        await repository.clear();
      }
      
      // Re-enable foreign key constraints
      await queryRunner.query('PRAGMA foreign_keys = ON;');
    } finally {
      await queryRunner.release();
    }
  }
}
