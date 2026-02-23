import { AppDataSource } from "@database";
import { ReportDAO } from "@models/dao/ReportDAO";

async function clearReports() {
  try {
    console.log("🗑️  Clearing all reports from database...");
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const reportRepo = AppDataSource.getRepository(ReportDAO);
    
    // Get all reports
    const reports = await reportRepo.find();
    console.log(`Found ${reports.length} reports to delete`);
    
    // Delete all reports
    await reportRepo.remove(reports);
    
    console.log("✅ All reports cleared successfully!");
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error("❌ Error clearing reports:", error);
    process.exit(1);
  }
}

clearReports();
