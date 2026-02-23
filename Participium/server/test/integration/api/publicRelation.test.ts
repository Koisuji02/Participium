import "reflect-metadata";
import request from "supertest";
import express, { Express } from "express";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { PublicRelationRoutes } from "../../../src/routes/PublicRelationRoutes";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { ReportState } from "../../../src/models/enums/ReportState";
import * as authService from "../../../src/services/authService";

// Mock auth service
jest.mock("../../../src/services/authService", () => ({
  verifyToken: jest.fn(),
  getSession: jest.fn(),
  saveSession: jest.fn(),
  deleteSession: jest.fn(),
  hashPassword: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
}));

// Mock telegram service
jest.mock("../../../src/services/telegramService", () => ({
  sendTelegramMessage: jest.fn(),
}));

// Declare global token variable
declare global {
  var __currentToken: string | undefined;
}

describe("PublicRelationRoutes - Integration Tests", () => {
  let app: Express;
  let userRepo: UserRepository;
  let officerRepo: OfficerRepository;
  let reportRepo: ReportRepository;

  let prOfficerId: number;
  let techOfficerId: number;
  let citizenId: number;
  let prToken: string;

  beforeAll(async () => {
    await initializeTestDatabase();

    userRepo = new UserRepository();
    officerRepo = new OfficerRepository();
    reportRepo = new ReportRepository();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/api/public-relation", PublicRelationRoutes);

    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
    });

    // Mock verifyToken to capture and use token
    (authService.verifyToken as jest.Mock).mockImplementation((token: string) => {
      global.__currentToken = token;
      
      if (token === "pr-officer-token") {
        return {
          id: prOfficerId,
          username: "prOfficer",
          type: [OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER],
          isStaff: true,
          sessionType: "web",
        };
      }
      
      throw new Error("Invalid token");
    });

    // Mock getSession to return token from global variable
    (authService.getSession as jest.Mock).mockImplementation(async (userId: number, sessionType: string) => {
      if (global.__currentToken) {
        return { token: global.__currentToken, userId, sessionType };
      }
      return null;
    });
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create a PR officer
    const prOfficer = await officerRepo.createOfficer(
      "prOfficer",
      "PR",
      "Officer",
      "pr@example.com",
      "Password@123",
      [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
    );
    prOfficerId = prOfficer.id;
    prToken = "pr-officer-token";

    // Create a technical officer
    const techOfficer = await officerRepo.createOfficer(
      "techOfficer",
      "Tech",
      "Officer",
      "tech@example.com",
      "Password@123",
      [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ROADS_AND_URBAN_FURNISHINGS }]
    );
    techOfficerId = techOfficer.id;

    // Create a citizen
    const citizen = await userRepo.createUser(
      "citizen1",
      "John",
      "Doe",
      "citizen@example.com",
      "Password@123"
    );
    citizenId = citizen.id;
  });

  // ===================== GET /retrievedocs =====================
  describe("GET /retrievedocs", () => {
    it("should return 200 and empty array when no pending reports exist", async () => {
      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return only pending reports (not assigned reports)", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Test Report 1",
        { name: "Location 1", Coordinates: { longitude: 10.1, latitude: 45.1 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Test description 1" }
      );

      // Do NOT assign the report - keep it PENDING
      // await reportRepo.assignReportToOfficer(report1.id, prOfficerId);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: report1.id,
        title: "Test Report 1",
        state: ReportState.PENDING,
      });
    });

    it("should return unassigned pending reports", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Unassigned Report",
        { name: "Location", Coordinates: { longitude: 10.2, latitude: 45.2 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Unassigned" }
      );

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: report.id,
        title: "Unassigned Report",
        state: ReportState.PENDING,
      });
    });

    it("should return only unassigned pending reports", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Pending Report 1",
        { name: "Location 1", Coordinates: { longitude: 10.3, latitude: 45.3 } },
        citizen,
        false,
        OfficeType.WASTE,
        { Description: "Pending 1" }
      );

      const report2 = await reportRepo.createReport(
        "Pending Report 2",
        { name: "Location 2", Coordinates: { longitude: 10.4, latitude: 45.4 } },
        citizen,
        false,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Pending 2" }
      );

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((r: any) => r.id)).toContain(report1.id);
      expect(response.body.map((r: any) => r.id)).toContain(report2.id);
    });

    it("should not return reports assigned to other officers", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Unassigned Report",
        { name: "Location 1", Coordinates: { longitude: 10.5, latitude: 45.5 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Available" }
      );
      // Don't assign report1 - it should be returned

      const report2 = await reportRepo.createReport(
        "Assigned to other",
        { name: "Location 2", Coordinates: { longitude: 10.6, latitude: 45.6 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Other" }
      );
      await reportRepo.assignReportToOfficer(report2.id, techOfficerId);
      // report2 is now ASSIGNED and won't be returned

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(report1.id);
    });

    it("should not return reports in non-PENDING states", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Pending Report",
        { name: "Location 1", Coordinates: { longitude: 10.7, latitude: 45.7 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Pending" }
      );

      const report2 = await reportRepo.createReport(
        "Assigned Report",
        { name: "Location 2", Coordinates: { longitude: 10.8, latitude: 45.8 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Assigned" }
      );
      await reportRepo.updateReportState(report2.id, ReportState.ASSIGNED);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(report1.id);
    });

    it("should return reports with correct structure", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Detailed Report",
        { name: "Main Street", Coordinates: { longitude: 10.9, latitude: 45.9 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Detailed description" }
      );

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("title");
      expect(response.body[0]).toHaveProperty("state");
      expect(response.body[0]).toHaveProperty("category");
      expect(response.body[0]).toHaveProperty("location");
    });
  });

  // ===================== POST /assign-report =====================
  describe("POST /assign-report", () => {
    it("should return 200 when successfully assigning a pending report", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Report to Assign",
        { name: "Location", Coordinates: { longitude: 11.0, latitude: 46.0 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "To be assigned" }
      );

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: techOfficerId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Report assigned successfully" });

      // Verify assignment in database
      const updatedReport = await reportRepo.getReportById(report.id);
      expect(updatedReport.assignedOfficerId).toBe(techOfficerId);
    });

    it("should allow assigning report to self", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Self Assign",
        { name: "Location", Coordinates: { longitude: 11.1, latitude: 46.1 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Self assign" }
      );

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: prOfficerId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Report assigned successfully" });
    });

    it("should return 500 when report is not in PENDING state", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Assigned Report",
        { name: "Location", Coordinates: { longitude: 11.2, latitude: 46.2 } },
        citizen,
        false,
        OfficeType.WASTE,
        { Description: "Already assigned" }
      );
      await reportRepo.updateReportState(report.id, ReportState.ASSIGNED);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: techOfficerId });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Only PENDING reports can be assigned");
    });

    it("should return 500 when report does not exist", async () => {
      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: 99999, officerId: techOfficerId });

      expect(response.status).toBe(500);
    });

    it("should return 500 when officer does not exist", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Test Report",
        { name: "Location", Coordinates: { longitude: 11.3, latitude: 46.3 } },
        citizen,
        false,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Test" }
      );

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: 99999 });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Officer with id '99999' not found");
    });

    it("should return 500 when trying to reassign already assigned report", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Reassign Report",
        { name: "Location", Coordinates: { longitude: 11.5, latitude: 46.5 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Reassign" }
      );

      // First assignment - this changes state to ASSIGNED
      await reportRepo.assignReportToOfficer(report.id, prOfficerId);

      // Try to reassign to different officer - should fail because state is now ASSIGNED
      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: techOfficerId });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Only PENDING reports can be assigned");

      const updatedReport = await reportRepo.getReportById(report.id);
      expect(updatedReport.assignedOfficerId).toBe(prOfficerId); // Still assigned to first officer
    });

    it("should handle numeric string IDs", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "String ID Test",
        { name: "Location", Coordinates: { longitude: 11.6, latitude: 46.6 } },
        citizen,
        false,
        OfficeType.WASTE,
        { Description: "String test" }
      );

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: String(report.id), officerId: String(techOfficerId) });

      expect(response.status).toBe(200);
    });
  });

  // ===================== Integration scenarios =====================
  describe("Integration Scenarios", () => {
    it("should allow retrieving and then assigning a report", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report = await reportRepo.createReport(
        "Full Flow Report",
        { name: "Location", Coordinates: { longitude: 11.7, latitude: 46.7 } },
        citizen,
        false,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Full flow" }
      );

      // Retrieve docs
      const getResponse = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveLength(1);

      // Assign the report
      const postResponse = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report.id, officerId: techOfficerId });

      expect(postResponse.status).toBe(200);

      // Verify it's still in retrieved docs (assigned to self)
      const getResponse2 = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(getResponse2.status).toBe(200);
      // Should not appear anymore since it's assigned to techOfficer, not prOfficer
      expect(getResponse2.body).toHaveLength(0);
    });

    it("should handle multiple reports being assigned", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Report 1",
        { name: "Location 1", Coordinates: { longitude: 11.8, latitude: 46.8 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "First" }
      );

      const report2 = await reportRepo.createReport(
        "Report 2",
        { name: "Location 2", Coordinates: { longitude: 11.9, latitude: 46.9 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Second" }
      );

      const response1 = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report1.id, officerId: techOfficerId });

      const response2 = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", `Bearer ${prToken}`)
        .send({ reportId: report2.id, officerId: prOfficerId });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const updatedReport1 = await reportRepo.getReportById(report1.id);
      const updatedReport2 = await reportRepo.getReportById(report2.id);

      expect(updatedReport1.assignedOfficerId).toBe(techOfficerId);
      expect(updatedReport2.assignedOfficerId).toBe(prOfficerId);
    });

    it("should filter reports correctly after assignments", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report1 = await reportRepo.createReport(
        "Unassigned",
        { name: "Location 1", Coordinates: { longitude: 12.0, latitude: 47.0 } },
        citizen,
        false,
        OfficeType.WASTE,
        { Description: "Unassigned" }
      );

      const report2 = await reportRepo.createReport(
        "Also Unassigned",
        { name: "Location 2", Coordinates: { longitude: 12.1, latitude: 47.1 } },
        citizen,
        false,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Also unassigned" }
      );

      const report3 = await reportRepo.createReport(
        "Assigned to other",
        { name: "Location 3", Coordinates: { longitude: 12.2, latitude: 47.2 } },
        citizen,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        { Description: "Other" }
      );
      await reportRepo.assignReportToOfficer(report3.id, techOfficerId);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", `Bearer ${prToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((r: any) => r.id)).toContain(report1.id);
      expect(response.body.map((r: any) => r.id)).toContain(report2.id);
      expect(response.body.map((r: any) => r.id)).not.toContain(report3.id);
    });
  });
});
