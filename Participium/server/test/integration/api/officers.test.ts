import "reflect-metadata";

// Mock getSession to return the token passed in the request
const mockGetSession = jest.fn();

jest.mock('@services/authService', () => {
  const original = jest.requireActual('@services/authService');
  return {
    ...original,
    saveSession: jest.fn().mockResolvedValue(undefined),
    getSession: mockGetSession,
    deleteSession: jest.fn().mockResolvedValue(undefined),
  };
});

import request from "supertest";
import { app } from "../../../src/app";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { generateToken } from "../../../src/services/authService";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";

describe("Officer Routes Integration Tests", () => {
  let officerRepo: OfficerRepository;
  let userRepo: UserRepository;
  let reportRepo: ReportRepository;
  let maintainerRepo: MaintainerRepository;
  let adminToken: string;
  let technicalOfficerToken: string;
  let prOfficerToken: string;
  let adminOfficerId: number;
  let technicalOfficerId: number;
  let prOfficerId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    officerRepo = new OfficerRepository();
    userRepo = new UserRepository();
    reportRepo = new ReportRepository();
    maintainerRepo = new MaintainerRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    // Create admin officer
    const adminOfficer = await officerRepo.createOfficer(
      "admin",
      "Admin",
      "Officer",
      "admin@example.com",
      "Password@123",
      [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
    );
    adminOfficerId = adminOfficer.id;

    adminToken = generateToken({
      id: adminOfficer.id,
      username: adminOfficer.username,
      isStaff: true,
      type: [OfficerRole.MUNICIPAL_ADMINISTRATOR]
    });

    // Create technical officer
    const technicalOfficer = await officerRepo.createOfficer(
      "techstaff",
      "Technical",
      "Staff",
      "tech@example.com",
      "Password@123",
      [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
    );
    technicalOfficerId = technicalOfficer.id;

    technicalOfficerToken = generateToken({
      id: technicalOfficer.id,
      username: technicalOfficer.username,
      isStaff: true,
      type: [OfficerRole.TECHNICAL_OFFICE_STAFF]
    });

    // Create PR officer
    const prOfficer = await officerRepo.createOfficer(
      "profficer",
      "PR",
      "Officer",
      "pr@example.com",
      "Password@123",
      [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
    );
    prOfficerId = prOfficer.id;

    prOfficerToken = generateToken({
      id: prOfficer.id,
      username: prOfficer.username,
      isStaff: true,
      type: [OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]
    });

    // Mock getSession to return the generated tokens
    mockGetSession.mockImplementation((userId, sessionType) => {
      let token = adminToken;
      if (userId === technicalOfficerId) token = technicalOfficerToken;
      if (userId === prOfficerId) token = prOfficerToken;

      return Promise.resolve({
        token: token,
        sessionType: sessionType || 'web',
        createdAt: Date.now()
      });
    });
  });

  // ===================== GET /officers/assigned =====================
  describe("GET /api/v1/officers/assigned - Get Assigned Reports", () => {
    it("should return assigned reports for technical officer", async () => {
      const user = await userRepo.createUser("user1", "User", "One", "user1@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Test Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report.id, technicalOfficerId);

      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${technicalOfficerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id", report.id);
    });

    it("should return assigned reports for PR officer", async () => {
      const user = await userRepo.createUser("user2", "User", "Two", "user2@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "PR Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report.id, prOfficerId);

      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${prOfficerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return empty array when no reports assigned", async () => {
      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${technicalOfficerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .get("/api/v1/officers/assigned");

      expect(response.status).toBe(401);
    });

    it("should return 403 for admin officer (wrong role)", async () => {
      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it("should include reports with different states", async () => {
      const user = await userRepo.createUser("user3", "User", "Three", "user3@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report1 = await reportRepo.createReport(
        "Report 1",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report1.id, technicalOfficerId);
      await reportRepo.updateReportState(report1.id, ReportState.IN_PROGRESS);

      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${technicalOfficerToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].state).toBe(ReportState.IN_PROGRESS);
    });
  });

  // ===================== GET /officers/OfficerByOfficeType/:officeType =====================
  describe("GET /api/v1/officers/OfficerByOfficeType/:officeType - Get Officers by Office Type", () => {
    it("should return officers by office type", async () => {
      const response = await request(app)
        .get(`/api/v1/officers/OfficerByOfficeType/${OfficeType.ARCHITECTURAL_BARRIERS}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should work with PR officer authentication", async () => {
      const response = await request(app)
        .get(`/api/v1/officers/OfficerByOfficeType/${OfficeType.ARCHITECTURAL_BARRIERS}`)
        .set("Authorization", `Bearer ${prOfficerToken}`);

      expect(response.status).toBe(200);
    });

    it("should return empty array for office type with no officers", async () => {
      const response = await request(app)
        .get(`/api/v1/officers/OfficerByOfficeType/${OfficeType.OTHER}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .get(`/api/v1/officers/OfficerByOfficeType/${OfficeType.ARCHITECTURAL_BARRIERS}`);

      expect(response.status).toBe(401);
    });

    it("should return 403 for technical officer (wrong role)", async () => {
      const response = await request(app)
        .get(`/api/v1/officers/OfficerByOfficeType/${OfficeType.ARCHITECTURAL_BARRIERS}`)
        .set("Authorization", `Bearer ${technicalOfficerToken}`);

      expect(response.status).toBe(403);
    });

    it("should handle all office types", async () => {
      const officeTypes = [
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.WATER_SUPPLY,
        OfficeType.WASTE,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.OTHER
      ];

      for (const officeType of officeTypes) {
        const response = await request(app)
          .get(`/api/v1/officers/OfficerByOfficeType/${officeType}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  // ===================== PATCH /officers/reviewdocs/:id =====================
  describe("PATCH /api/v1/officers/reviewdocs/:id - Review Document", () => {
    it("should review and approve report", async () => {
      const user = await userRepo.createUser("user4", "User", "Four", "user4@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Review Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("state", ReportState.ASSIGNED);
    });

    it("should review and decline report with reason", async () => {
      const user = await userRepo.createUser("user5", "User", "Five", "user5@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Decline Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          state: ReportState.DECLINED,
          reason: "Not valid"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("state", ReportState.DECLINED);
    });

    it("should work with PR officer", async () => {
      const user = await userRepo.createUser("user6", "User", "Six", "user6@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "PR Review",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${prOfficerToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(200);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .patch("/api/v1/officers/reviewdocs/1")
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(401);
    });

    it("should return 403 for admin officer (wrong role)", async () => {
      const user = await userRepo.createUser("user7", "User", "Seven", "user7@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Admin Review",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent report", async () => {
      const response = await request(app)
        .patch("/api/v1/officers/reviewdocs/99999")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(404);
    });

    it("should handle assigned report with officer assignment", async () => {
      const user = await userRepo.createUser("user8", "User", "Eight", "user8@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Assign Test",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("assignedOfficerId");
    });

    it("should not allow reviewing already resolved report", async () => {
      const user = await userRepo.createUser("user9", "User", "Nine", "user9@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Resolved Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.RESOLVED);

      const response = await request(app)
        .patch(`/api/v1/officers/reviewdocs/${report.id}`)
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          state: ReportState.ASSIGNED
        });

      expect(response.status).toBe(500);
    });
  });

  // ===================== POST /officers/assign-report =====================
  describe("POST /api/v1/officers/assign-report - Assign Report to Maintainer", () => {
    it("should assign report to maintainer", async () => {
      const user = await userRepo.createUser("user10", "User", "Ten", "user10@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Maintainer Assign",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.ASSIGNED);

      const maintainer = await maintainerRepo.createMaintainer(
        "Test Maintainer",
        "maintainer@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          reportId: report.id,
          maintainerId: maintainer.id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Report assigned to maintainer");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .send({
          reportId: 1,
          maintainerId: 1
        });

      expect(response.status).toBe(401);
    });

    it("should return 403 for non-technical officer", async () => {
      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${prOfficerToken}`)
        .send({
          reportId: 1,
          maintainerId: 1
        });

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent report", async () => {
      const maintainer = await maintainerRepo.createMaintainer(
        "Test Maintainer 2",
        "maintainer2@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          reportId: 99999,
          maintainerId: maintainer.id
        });

      expect(response.status).toBe(404);
    });

    it("should return error for non-existent maintainer", async () => {
      const user = await userRepo.createUser("user11", "User", "Eleven", "user11@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Test Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.ASSIGNED);

      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          reportId: report.id,
          maintainerId: 99999
        });

      expect(response.status).toBe(500);
    });

    it("should return error for report in RESOLVED state", async () => {
      const user = await userRepo.createUser("user12", "User", "Twelve", "user12@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report = await reportRepo.createReport(
        "Pending Report",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.RESOLVED);

      const maintainer = await maintainerRepo.createMaintainer(
        "Test Maintainer 3",
        "maintainer3@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          reportId: report.id,
          maintainerId: maintainer.id
        });

      expect(response.status).toBe(500);
    });
  });

  // ===================== Edge Cases =====================
  describe("Edge Cases", () => {
    it("should handle missing reportId in assign-report", async () => {
      const response = await request(app)
        .post("/api/v1/officers/assign-report")
        .set("Authorization", `Bearer ${technicalOfficerToken}`)
        .send({
          maintainerId: 1
        });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle invalid office type format", async () => {
      const response = await request(app)
        .get("/api/v1/officers/OfficerByOfficeType/INVALID_TYPE")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should handle multiple assigned reports for same officer", async () => {
      const user = await userRepo.createUser("user13", "User", "Thirteen", "user13@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.isActive = true;
      await repo.save(user);

      const report1 = await reportRepo.createReport(
        "Report 1",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo1.jpg"] }
      );

      const report2 = await reportRepo.createReport(
        "Report 2",
        { name: "Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Description", Photos: ["photo2.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report1.id, technicalOfficerId);
      await reportRepo.assignReportToOfficer(report2.id, technicalOfficerId);

      const response = await request(app)
        .get("/api/v1/officers/assigned")
        .set("Authorization", `Bearer ${technicalOfficerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });
});