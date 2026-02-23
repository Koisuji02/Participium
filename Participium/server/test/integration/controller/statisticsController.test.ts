import "reflect-metadata";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { getStatistics } from "../../../src/controllers/statisticsController";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";
import { BadRequestError } from "../../../src/utils/utils";

describe("StatisticsController - Integration Tests", () => {
  let userRepo: UserRepository;
  let reportRepo: ReportRepository;
  let userId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    userRepo = new UserRepository();
    reportRepo = new ReportRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create a test user
    const user = await userRepo.createUser(
      "testuser",
      "Test",
      "User",
      "test@example.com",
      "Password@123"
    );
    userId = user.id;
  });

  // ===================== getStatistics - No filters =====================
  describe("getStatistics - No filters", () => {
    it("should return empty array when no reports exist", async () => {
      const result = await getStatistics();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it("should return statistics grouped by date when reports exist", async () => {
      const user = await userRepo.getUserById(userId);

      // Create reports in different states with unique IDs
      const report1 = await reportRepo.createReport(
        "Waste Report 1",
        { name: "Location A", Coordinates: { longitude: 10.51, latitude: 45.51 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Waste issue 1" }
      );
      report1.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report1);

      const report2 = await reportRepo.createReport(
        "Lighting Report 2",
        { name: "Location B", Coordinates: { longitude: 10.62, latitude: 45.62 } },
        user,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Lighting issue 2" }
      );
      report2.state = ReportState.RESOLVED;
      await reportRepo.updateReport(report2);

      const report3 = await reportRepo.createReport(
        "Declined Report 3",
        { name: "Location C", Coordinates: { longitude: 10.73, latitude: 45.73 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Declined issue 3" }
      );
      report3.state = ReportState.DECLINED;
      await reportRepo.updateReport(report3);

      const result = await getStatistics();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check structure of first result
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('totalReports');
      expect(result[0]).toHaveProperty('approvedReports');
      expect(result[0]).toHaveProperty('rejectedReports');

      // Since all reports are created today, we should have one entry
      expect(result[0].totalReports).toBe(3);
      expect(result[0].approvedReports).toBe(2); // ASSIGNED + RESOLVED
      expect(result[0].rejectedReports).toBe(1); // DECLINED
    });
  });

  // ===================== getStatistics - Period filters =====================
  describe("getStatistics - Period filters", () => {
    it("should return daily statistics", async () => {
      const user = await userRepo.getUserById(userId);

      const report = await reportRepo.createReport(
        "Report 1",
        { name: "Location 1", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Issue 1" }
      );
      report.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report);

      const result = await getStatistics(undefined, undefined, 'daily');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Date format should be YYYY-MM-DD
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return weekly statistics", async () => {
      const user = await userRepo.getUserById(userId);

      const report = await reportRepo.createReport(
        "Report",
        { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Issue" }
      );
      report.state = ReportState.IN_PROGRESS;
      await reportRepo.updateReport(report);

      const result = await getStatistics(undefined, undefined, 'weekly');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Date format should be YYYY-WWW (e.g., 2026-W01)
      expect(result[0].date).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("should return monthly statistics", async () => {
      const user = await userRepo.getUserById(userId);

      const report = await reportRepo.createReport(
        "Report",
        { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Issue" }
      );
      report.state = ReportState.SUSPENDED;
      await reportRepo.updateReport(report);

      const result = await getStatistics(undefined, undefined, 'monthly');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Date format should be YYYY-MM
      expect(result[0].date).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should return yearly statistics", async () => {
      const user = await userRepo.getUserById(userId);

      const report = await reportRepo.createReport(
        "Report",
        { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Issue" }
      );
      report.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report);

      const result = await getStatistics(undefined, undefined, 'yearly');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Date format should be YYYY
      expect(result[0].date).toMatch(/^\d{4}$/);
    });
  });

  // ===================== getStatistics - Category filter only =====================
  describe("getStatistics - Category filter only", () => {
    it("should return count for specific category when reports exist", async () => {
      const user = await userRepo.getUserById(userId);

      // Create 3 WASTE reports explicitly
      const report1 = await reportRepo.createReport(
        "Waste Report 1",
        { name: "Location 1", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Waste issue 1" }
      );
      report1.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report1);

      const report2 = await reportRepo.createReport(
        "Waste Report 2",
        { name: "Location 2", Coordinates: { longitude: 11.5, latitude: 46.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Waste issue 2" }
      );
      report2.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report2);

      const report3 = await reportRepo.createReport(
        "Waste Report 3",
        { name: "Location 3", Coordinates: { longitude: 12.5, latitude: 47.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Waste issue 3" }
      );
      report3.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report3);

      // Create 1 PUBLIC_LIGHTING report (should not be counted)
      const otherReport = await reportRepo.createReport(
        "Lighting Report",
        { name: "Other Location", Coordinates: { longitude: 11.0, latitude: 46.0 } },
        user,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Lighting issue" }
      );
      otherReport.state = ReportState.IN_PROGRESS;
      await reportRepo.updateReport(otherReport);

      const result = await getStatistics(undefined, undefined, undefined, OfficeType.WASTE);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(3);
    });

    it("should return empty array when category has no reports", async () => {
      const result = await getStatistics(undefined, undefined, undefined, OfficeType.WATER_SUPPLY);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it("should return array structure when category is specified", async () => {
      const result = await getStatistics(undefined, undefined, undefined, OfficeType.WASTE);

      expect(Array.isArray(result)).toBe(true);
    });

    it("should work with all category types", async () => {
      const user = await userRepo.getUserById(userId);

      // Test multiple categories
      const categories = [
        OfficeType.WATER_SUPPLY,
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.WASTE,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.OTHER
      ];

      for (const category of categories) {
        await clearDatabase();
        const newUser = await userRepo.createUser(
          `user_${category}`,
          "Test",
          "User",
          `test_${category}@example.com`,
          "Password@123"
        );

        const report = await reportRepo.createReport(
          `Report for ${category}`,
          { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
          newUser,
          false,
          category,
          { Description: "Issue" }
        );
        report.state = ReportState.ASSIGNED;
        await reportRepo.updateReport(report);

        const result = await getStatistics(undefined, undefined, undefined, category);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].totalReports).toBe(1);
      }
    });
  });

  // ===================== getStatistics - Both period and category =====================
  describe("getStatistics - Both period and category filters", () => {
    it("should return filtered count and trends when both parameters provided", async () => {
      const user = await userRepo.getUserById(userId);

      // Create 5 WASTE reports explicitly
      const reports = [];
      for (let i = 0; i < 5; i++) {
        const report = await reportRepo.createReport(
          `Waste Report Number ${i + 1}`,
          { name: `Waste Location ${i + 1}`, Coordinates: { longitude: 10.5 + i * 0.5, latitude: 45.5 + i * 0.5 } },
          user,
          false,
          OfficeType.WASTE,
          { Description: `Waste specific issue ${i + 1}` }
        );
        report.state = ReportState.ASSIGNED;
        const saved = await reportRepo.updateReport(report);
        reports.push(saved);
      }

      // Create PUBLIC_LIGHTING reports (should not be counted)
      const otherReport = await reportRepo.createReport(
        "Lighting Report",
        { name: "Other Location", Coordinates: { longitude: 11.0, latitude: 46.0 } },
        user,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Lighting issue" }
      );
      otherReport.state = ReportState.IN_PROGRESS;
      await reportRepo.updateReport(otherReport);

      const result = await getStatistics(undefined, undefined, 'monthly', OfficeType.WASTE);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(5);
      expect(result[0].date).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should handle all period types with category filter", async () => {
      const periods: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];

      for (const period of periods) {
        const user = await userRepo.getUserById(userId);
        
        const report = await reportRepo.createReport(
          `Report for ${period}`,
          { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
          user,
          false,
          OfficeType.WASTE,
          { Description: "Issue" }
        );
        report.state = ReportState.ASSIGNED;
        await reportRepo.updateReport(report);

        const result = await getStatistics(undefined, undefined, period, OfficeType.WASTE);

        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('date');
          expect(result[0]).toHaveProperty('totalReports');
        }

        // Clean up for next iteration
        await clearDatabase();
        const newUser = await userRepo.createUser(
          `user_${period}`,
          "Test",
          "User",
          `test_${period}@example.com`,
          "Password@123"
        );
        userId = newUser.id;
      }
    });
  });

  // ===================== getStatistics - Input validation =====================
  describe("getStatistics - Input validation", () => {
    it("should throw BadRequestError for invalid period", async () => {
      await expect(getStatistics(undefined, undefined, 'invalid' as any)).rejects.toThrow(BadRequestError);
      await expect(getStatistics(undefined, undefined, 'invalid' as any)).rejects.toThrow('Invalid period. Must be one of: daily, weekly, monthly, yearly');
    });

    it("should throw BadRequestError for invalid category", async () => {
      await expect(getStatistics(undefined, undefined, undefined, 'invalid_category' as any)).rejects.toThrow(BadRequestError);
      await expect(getStatistics(undefined, undefined, undefined, 'invalid_category' as any)).rejects.toThrow('Invalid category');
    });

    it("should validate period even with valid category", async () => {
      await expect(getStatistics(undefined, undefined, 'day' as any, OfficeType.WASTE)).rejects.toThrow(BadRequestError);
    });

    it("should validate category even with valid period", async () => {
      await expect(getStatistics(undefined, undefined, 'monthly', 'not_a_category' as any)).rejects.toThrow(BadRequestError);
    });
  });

  // ===================== getStatistics - Edge cases =====================
  describe("getStatistics - Edge cases", () => {
    it("should return zero counts when applicable", async () => {
      const user = await userRepo.getUserById(userId);

      // Create only PENDING reports
      const report = await reportRepo.createReport(
        "Pending Report",
        { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        user,
        false,
        OfficeType.WASTE,
        { Description: "Pending issue" }
      );
      // PENDING is the default state

      const result = await getStatistics();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(1);
      expect(result[0].approvedReports).toBe(0);
      expect(result[0].rejectedReports).toBe(0);
    });

    it("should handle anonymous reports correctly", async () => {      
      const report = await reportRepo.createReport(
        "Anonymous Report",
        { name: "Location", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        null,
        true,
        OfficeType.WASTE,
        { Description: "Anonymous issue" }
      );
      report.state = ReportState.ASSIGNED;
      await reportRepo.updateReport(report);

      const result = await getStatistics(undefined, undefined, undefined, OfficeType.WASTE);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(1);
    });

    it("should handle multiple reports on same day", async () => {
      const user = await userRepo.getUserById(userId);

      // Create multiple reports on the same day
      const reports = [];
      for (let i = 0; i < 5; i++) {
        const report = await reportRepo.createReport(
          `Multiple Daily Report ${i + 1}`,
          { name: `Daily Location ${i + 1}`, Coordinates: { longitude: 10.5 + i * 0.3, latitude: 45.5 + i * 0.3 } },
          user,
          false,
          OfficeType.WASTE,
          { Description: `Daily issue number ${i + 1}` }
        );
        report.state = ReportState.ASSIGNED;
        const saved = await reportRepo.updateReport(report);
        reports.push(saved);
      }

      const result = await getStatistics(undefined, undefined, 'daily');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(5);
    });

  });

  // ===================== getStatistics - Real data scenarios =====================
  describe("getStatistics - Real data scenarios", () => {
    it("should count all report states in totalReports", async () => {
      const user = await userRepo.getUserById(userId);

      const states = [
        ReportState.PENDING,
        ReportState.ASSIGNED,
        ReportState.IN_PROGRESS,
        ReportState.SUSPENDED,
        ReportState.RESOLVED,
        ReportState.DECLINED
      ];

      // Create reports sequentially with very unique identifiers
      const reports = [];
      for (let i = 0; i < states.length; i++) {
        const state = states[i];
        const report = await reportRepo.createReport(
          `State Test Report ${state} Number ${i}`,
          { name: `State Location ${state} ${i}`, Coordinates: { longitude: 10.5 + i * 0.25, latitude: 45.5 + i * 0.25 } },
          user,
          false,
          OfficeType.WASTE,
          { Description: `Specific issue for state ${state} number ${i}` }
        );
        report.state = state;
        const saved = await reportRepo.updateReport(report);
        reports.push(saved);
      }

      const result = await getStatistics();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].totalReports).toBe(6);
      expect(result[0].approvedReports).toBe(4); // ASSIGNED, IN_PROGRESS, SUSPENDED, RESOLVED
      expect(result[0].rejectedReports).toBe(1); // DECLINED
    });

  });
});
