import request from "supertest";
import express from "express";
import { reportRouter } from "../../../src/routes/ReportRoutes";
import * as reportController from "../../../src/controllers/reportController";
import * as statisticsController from "../../../src/controllers/statisticsController";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { NotificationRepository } from "../../../src/repositories/NotificationRepository";
import { FollowRepository } from "../../../src/repositories/FollowRepository";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";
import { ReviewStatus } from "../../../src/models/enums/ReviewStatus";
import { BadRequestError } from "../../../src/utils/utils";

// Create mock functions that can be configured per test
const mockAuthenticateToken = jest.fn();
const mockRequireUserType = jest.fn();

// Mock middlewares
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: (req: any, res: any, next: any) => mockAuthenticateToken(req, res, next),
  requireUserType: (types: any[]) => (req: any, res: any, next: any) => mockRequireUserType(types, req, res, next),
}));

jest.mock("../../../src/middlewares/uploadMiddleware", () => ({
  uploadPhotos: (req: any, res: any, next: any) => {
    // Simula il caricamento di file
    req.files = req.files || [];
    next();
  },
}));

// Mock controller
jest.mock("../../../src/controllers/reportController");
jest.mock("../../../src/controllers/statisticsController");

// Mock repositories
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/NotificationRepository");
jest.mock("../../../src/repositories/FollowRepository");
jest.mock("../../../src/services/mapperService");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/reports", reportRouter);

// Error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || err.status || 500).json({ error: err.message || "Internal Server Error" });
});

describe("ReportRoutes", () => {
  let mockReportRepo: jest.Mocked<ReportRepository>;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockFollowRepo: jest.Mocked<FollowRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth setup for regular user
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 1, type: "user" };
      next();
    });

    mockRequireUserType.mockImplementation((types: any[], req: any, res: any, next: any) => {
      if (types.includes(req.user?.type) || types.some((t: any) => req.user?.type?.includes?.(t))) {
        next();
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
    });

    mockReportRepo = {
      getReportById: jest.fn(),
      getApprovedReports: jest.fn(),
      updateReport: jest.fn(),
    } as any;

    mockNotificationRepo = {
      createOfficerMessageNotification: jest.fn(),
    } as any;

    mockFollowRepo = {
      getFollowersOfReport: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
    } as any;

    (ReportRepository as jest.Mock).mockImplementation(() => mockReportRepo);
    (NotificationRepository as jest.Mock).mockImplementation(() => mockNotificationRepo);
    (FollowRepository as jest.Mock).mockImplementation(() => mockFollowRepo);
  });

  // ===================== POST /reports =====================
  describe("POST /reports", () => {
    it("should upload a report successfully with all fields", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        category: OfficeType.ARCHITECTURAL_BARRIERS,
        anonymity: false,
        state: ReportState.PENDING,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Test Report",
          category: OfficeType.ARCHITECTURAL_BARRIERS,
          description: "Test description",
          latitude: "45.0703",
          longitude: "7.6869",
          anonymity: false,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
      expect(reportController.uploadReport).toHaveBeenCalled();
    });

    it("should upload anonymous report", async () => {
      const mockReport = {
        id: 2,
        title: "Anonymous Report",
        category: OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        anonymity: true,
        state: ReportState.PENDING,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Anonymous Report",
          category: OfficeType.ROADS_AND_URBAN_FURNISHINGS,
          description: "Anonymous description",
          anonymity: "1",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymity: true,
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report with anonymity as true boolean", async () => {
      const mockReport = {
        id: 3,
        title: "Test Report",
        category: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        anonymity: true,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Test Report",
          category: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
          anonymity: true,
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymity: true,
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report with anonymity as string 'true'", async () => {
      const mockReport = {
        id: 4,
        title: "Test Report",
        category: OfficeType.WATER_SUPPLY,
        anonymity: true,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Test Report",
          category: OfficeType.WATER_SUPPLY,
          anonymity: "true",
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          anonymity: true,
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report with coordinates", async () => {
      const mockReport = {
        id: 5,
        title: "Report with location",
        category: OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Report with location",
          category: OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
          latitude: "45.1234",
          longitude: "7.5678",
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            Coordinates: {
              latitude: 45.1234,
              longitude: 7.5678,
            },
          },
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report without coordinates when not provided", async () => {
      const mockReport = {
        id: 6,
        title: "Report without location",
        category: OfficeType.OTHER,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Report without location",
          category: OfficeType.OTHER,
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          location: undefined,
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report without coordinates when only latitude provided", async () => {
      const mockReport = {
        id: 7,
        title: "Partial location",
        category: OfficeType.ARCHITECTURAL_BARRIERS,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Partial location",
          category: OfficeType.ARCHITECTURAL_BARRIERS,
          latitude: "45.1234",
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          location: undefined,
        }),
        expect.any(Array),
        1
      );
    });

    it("should upload report without coordinates when only longitude provided", async () => {
      const mockReport = {
        id: 8,
        title: "Partial location",
        category: OfficeType.ARCHITECTURAL_BARRIERS,
      };

      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Partial location",
          category: OfficeType.ARCHITECTURAL_BARRIERS,
          longitude: "7.5678",
        });

      expect(res.status).toBe(200);
      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.objectContaining({
          location: undefined,
        }),
        expect.any(Array),
        1
      );
    });

    it("should handle controller errors", async () => {
      (reportController.uploadReport as jest.Mock).mockRejectedValue(new Error("Upload failed"));

      const res = await request(app)
        .post("/reports")
        .send({
          title: "Test Report",
          category: OfficeType.ARCHITECTURAL_BARRIERS,
        });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("should pass userId from authenticated user", async () => {
      const mockReport = { id: 9, title: "Test" };
      (reportController.uploadReport as jest.Mock).mockResolvedValue(mockReport);

      await request(app)
        .post("/reports")
        .send({
          title: "Test",
          category: OfficeType.ARCHITECTURAL_BARRIERS,
        });

      expect(reportController.uploadReport).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        1 // userId from mock
      );
    });
  });

  // ===================== GET /reports =====================
  describe("GET /reports", () => {
    it("should return all reports with status 200", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED },
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS },
      ];

      (reportController.getReports as jest.Mock).mockResolvedValue(mockReports);

      const res = await request(app).get("/reports");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReports);
      expect(reportController.getReports).toHaveBeenCalled();
    });

    it("should return empty array if no reports exist", async () => {
      (reportController.getReports as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/reports");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle controller errors", async () => {
      (reportController.getReports as jest.Mock).mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/reports");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== GET /reports/:id =====================
  describe("GET /reports/:id", () => {
    it("should return a report by ID successfully", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        author: { id: 1, username: "testuser" },
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      (reportController.getReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
      expect(reportController.getReport).toHaveBeenCalledWith(1);
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await request(app).get("/reports/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
    });

    it("should return 404 when report is not found", async () => {
      mockReportRepo.getReportById.mockResolvedValue(null as any);

      const res = await request(app).get("/reports/999");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Report not found");
    });

    it("should handle errors with not found message", async () => {
      mockReportRepo.getReportById.mockResolvedValue({ id: 1 } as any);
      (reportController.getReport as jest.Mock).mockRejectedValue(new Error("Report with id 1 not found"));

      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Report not found");
    });

    it("should handle other errors", async () => {
      mockReportRepo.getReportById.mockResolvedValue({ id: 1 } as any);
      (reportController.getReport as jest.Mock).mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== PATCH /reports/:id/approve =====================
  describe("PATCH /reports/:id/approve", () => {
    beforeEach(() => {
      // Mock officer user
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER };
        next();
      });
    });

    it("should approve a report successfully", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        reviewStatus: ReviewStatus.PENDING,
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      mockReportRepo.updateReport.mockResolvedValue({ ...mockReport, reviewStatus: ReviewStatus.APPROVED } as any);

      const res = await request(app)
        .patch("/reports/1/approve")
        .send({ explanation: "Report is valid" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Report approved successfully");
      expect(mockReportRepo.updateReport).toHaveBeenCalled();
    });

    it("should approve a report without explanation", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        reviewStatus: ReviewStatus.PENDING,
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      mockReportRepo.updateReport.mockResolvedValue({ ...mockReport, reviewStatus: ReviewStatus.APPROVED } as any);

      const res = await request(app)
        .patch("/reports/1/approve")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Report approved successfully");
    });

    it("should return 404 when report is not found", async () => {
      mockReportRepo.getReportById.mockResolvedValue(null as any);

      const res = await request(app)
        .patch("/reports/1/approve")
        .send({ explanation: "Report is valid" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Report not found");
    });

    it("should handle errors during approval", async () => {
      mockReportRepo.getReportById.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .patch("/reports/1/approve")
        .send({ explanation: "Report is valid" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== PATCH /reports/:id/decline =====================
  describe("PATCH /reports/:id/decline", () => {
    beforeEach(() => {
      // Mock officer user
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER };
        next();
      });
    });

    it("should decline a report successfully with explanation", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        reviewStatus: ReviewStatus.PENDING,
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      mockReportRepo.updateReport.mockResolvedValue({ ...mockReport, reviewStatus: ReviewStatus.DECLINED, explanation: "Invalid report" } as any);

      const res = await request(app)
        .patch("/reports/1/decline")
        .send({ explanation: "Invalid report" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Report declined successfully");
      expect(mockReportRepo.updateReport).toHaveBeenCalled();
    });

    it("should return 400 when explanation is missing", async () => {
      const res = await request(app)
        .patch("/reports/1/decline")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Explanation is required when declining a report");
    });

    it("should return 400 when explanation is empty string", async () => {
      const res = await request(app)
        .patch("/reports/1/decline")
        .send({ explanation: "   " });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Explanation is required when declining a report");
    });

    it("should return 404 when report is not found", async () => {
      mockReportRepo.getReportById.mockResolvedValue(null as any);

      const res = await request(app)
        .patch("/reports/1/decline")
        .send({ explanation: "Invalid report" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Report not found");
    });

    it("should handle errors during decline", async () => {
      mockReportRepo.getReportById.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .patch("/reports/1/decline")
        .send({ explanation: "Invalid report" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== POST /reports/:id/message =====================
  describe("POST /reports/:id/message", () => {
    beforeEach(() => {
      // Mock officer user
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: OfficerRole.TECHNICAL_OFFICE_STAFF };
        next();
      });
    });

    it("should send message to report author successfully", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        author: { id: 2, username: "testuser" },
      };

      const mockNotification = {
        id: 1,
        type: "OFFICER_MESSAGE",
        message: "Message from officer #1: Hello user",
        reportId: 1,
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      mockNotificationRepo.createOfficerMessageNotification.mockResolvedValue(mockNotification as any);

      const res = await request(app)
        .post("/reports/1/message")
        .send({ message: "Hello user" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", 1);
      expect(res.body).toHaveProperty("type", "OFFICER_MESSAGE");
      expect(mockNotificationRepo.createOfficerMessageNotification).toHaveBeenCalledWith(mockReport, 1, "Hello user");
    });

    it("should return 400 when message is missing", async () => {
      const res = await request(app)
        .post("/reports/1/message")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "message is required");
    });

    it("should return 400 when message is empty string", async () => {
      const res = await request(app)
        .post("/reports/1/message")
        .send({ message: "   " });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "message is required");
    });

    it("should return info message for anonymous report", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        author: null,
        anonymity: true,
      };

      mockReportRepo.getReportById.mockResolvedValue(mockReport as any);
      mockNotificationRepo.createOfficerMessageNotification.mockResolvedValue(null);

      const res = await request(app)
        .post("/reports/1/message")
        .send({ message: "Hello user" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("info", "No notification created (anonymous report).");
    });

    it("should handle errors during message send", async () => {
      mockReportRepo.getReportById.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/reports/1/message")
        .send({ message: "Hello user" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== GET /reports/:id/followers =====================
  describe("GET /reports/:id/followers", () => {
    beforeEach(() => {
      // Mock officer user
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: OfficerRole.MUNICIPAL_ADMINISTRATOR };
        next();
      });
    });

    it("should return list of followers successfully", async () => {
      const mockUsers = [
        { id: 1, username: "user1", email: "user1@test.com" },
        { id: 2, username: "user2", email: "user2@test.com" },
      ];

      mockFollowRepo.getFollowersOfReport.mockResolvedValue(mockUsers as any);

      const mockMapperService = require("../../../src/services/mapperService");
      mockMapperService.mapUserDAOToDTO = jest.fn((user) => user);

      const res = await request(app).get("/reports/1/followers");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockFollowRepo.getFollowersOfReport).toHaveBeenCalledWith(1);
    });

    it("should return empty array when no followers", async () => {
      mockFollowRepo.getFollowersOfReport.mockResolvedValue([]);

      const mockMapperService = require("../../../src/services/mapperService");
      mockMapperService.mapUserDAOToDTO = jest.fn((user) => user);

      const res = await request(app).get("/reports/1/followers");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle errors when getting followers", async () => {
      mockFollowRepo.getFollowersOfReport.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/reports/1/followers");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== POST /reports/:id/follow =====================
  describe("POST /reports/:id/follow", () => {
    beforeEach(() => {
      // Mock regular user (already set in main beforeEach, but explicit here)
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: "user" };
        next();
      });
    });

    it("should follow a report successfully", async () => {
      const mockFollow = {
        id: 1,
        user: { id: 1 },
        report: { id: 1 },
        createdAt: new Date(),
      };

      mockFollowRepo.follow.mockResolvedValue(mockFollow as any);

      const res = await request(app).post("/reports/1/follow");

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", 1);
      expect(res.body).toHaveProperty("userId", 1);
      expect(res.body).toHaveProperty("reportId", 1);
      expect(mockFollowRepo.follow).toHaveBeenCalledWith(1, 1);
    });

    it("should handle errors during follow", async () => {
      mockFollowRepo.follow.mockRejectedValue(new Error("Already following"));

      const res = await request(app).post("/reports/1/follow");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== DELETE /reports/:id/follow =====================
  describe("DELETE /reports/:id/follow", () => {
    beforeEach(() => {
      // Mock regular user (already set in main beforeEach, but explicit here)
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, type: "user" };
        next();
      });
    });

    it("should unfollow a report successfully", async () => {
      mockFollowRepo.unfollow.mockResolvedValue(undefined);

      const res = await request(app).delete("/reports/1/follow");

      expect(res.status).toBe(204);
      expect(mockFollowRepo.unfollow).toHaveBeenCalledWith(1, 1);
    });

    it("should handle errors during unfollow", async () => {
      mockFollowRepo.unfollow.mockRejectedValue(new Error("Not following"));

      const res = await request(app).delete("/reports/1/follow");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ===================== GET /reports/stats =====================
  describe("GET /reports/stats", () => {
    const mockGetStatistics = statisticsController.getStatistics as jest.MockedFunction<typeof statisticsController.getStatistics>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return statistics without any query parameters", async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 10, approvedReports: 8, rejectedReports: 2 },
        { date: '2026-01-04', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    });

    it("should return statistics with fromDate parameter", async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 8, approvedReports: 7, rejectedReports: 1 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?fromDate=2026-01-01");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith("2026-01-01", undefined, undefined, undefined);
    });

    it("should return statistics with toDate parameter", async () => {
      const mockStats = [
        { date: '2026-01-03', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?toDate=2026-01-31");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, "2026-01-31", undefined, undefined);
    });

    it("should return statistics with period parameter - daily", async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 3, approvedReports: 2, rejectedReports: 1 },
        { date: '2026-01-04', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?period=daily");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, "daily", undefined);
    });

    it("should return statistics with period parameter - weekly", async () => {
      const mockStats = [
        { date: '2026-W01', totalReports: 15, approvedReports: 12, rejectedReports: 3 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?period=weekly");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, "weekly", undefined);
    });

    it("should return statistics with period parameter - monthly", async () => {
      const mockStats = [
        { date: '2026-01', totalReports: 50, approvedReports: 40, rejectedReports: 10 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?period=monthly");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, "monthly", undefined);
    });

    it("should return statistics with period parameter - yearly", async () => {
      const mockStats = [
        { date: '2026', totalReports: 500, approvedReports: 400, rejectedReports: 100 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get("/reports/stats?period=yearly");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, "yearly", undefined);
    });

    it("should return statistics with category parameter", async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 8, approvedReports: 7, rejectedReports: 1 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get(`/reports/stats?category=${OfficeType.WASTE}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, OfficeType.WASTE);
    });

    it("should return statistics with both period and category parameters", async () => {
      const mockStats = [
        { date: '2026-01', totalReports: 25, approvedReports: 20, rejectedReports: 5 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get(`/reports/stats?period=monthly&category=${OfficeType.WASTE}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, "monthly", OfficeType.WASTE);
    });

    it("should return statistics with all parameters", async () => {
      const mockStats = [
        { date: '2026-01-15', totalReports: 10, approvedReports: 8, rejectedReports: 2 }
      ];

      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get(`/reports/stats?fromDate=2026-01-01&toDate=2026-01-31&period=daily&category=${OfficeType.WASTE}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(mockGetStatistics).toHaveBeenCalledWith("2026-01-01", "2026-01-31", "daily", OfficeType.WASTE);
    });

    it("should work with different category types", async () => {
      const categories = [
        OfficeType.WATER_SUPPLY,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.OTHER
      ];

      for (const category of categories) {
        const mockStats = [
          { date: '2026-01-05', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
        ];
        mockGetStatistics.mockResolvedValue(mockStats);

        const res = await request(app).get(`/reports/stats?category=${category}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockStats);
        expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, category);
      }
    });

    it("should handle controller validation errors for invalid period", async () => {
      mockGetStatistics.mockRejectedValue(new BadRequestError("Invalid period. Must be one of: daily, weekly, monthly, yearly"));

      const res = await request(app).get("/reports/stats?period=invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle controller errors for invalid category", async () => {
      mockGetStatistics.mockRejectedValue(new BadRequestError("Invalid category"));

      const res = await request(app).get("/reports/stats?category=invalid_category");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle internal server errors from controller", async () => {
      mockGetStatistics.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/reports/stats");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("should return empty array gracefully", async () => {
      mockGetStatistics.mockResolvedValue([]);

      const res = await request(app).get("/reports/stats");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle query parameters case-sensitively", async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];
      mockGetStatistics.mockResolvedValue(mockStats);

      const res = await request(app).get(`/reports/stats?category=${OfficeType.WASTE}`);

      expect(res.status).toBe(200);
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, OfficeType.WASTE);
    });
  });
});