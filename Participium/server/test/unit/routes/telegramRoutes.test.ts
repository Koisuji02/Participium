import request from "supertest";
import express, { Express } from "express";
import { ReportDAO } from "../../../src/models/dao/ReportDAO";
import { FollowDAO } from "../../../src/models/dao/FollowDAO";
import { FaqDAO } from "../../../src/models/dao/FaqDAO";
import { ReportState } from "../../../src/models/enums/ReportState";
import { OfficeType } from "../../../src/models/enums/OfficeType";

// Mock dependencies BEFORE imports that use them
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/FollowRepository");
jest.mock("../../../src/repositories/FaqRepository");
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  requireUserType: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

// Import after mocking
import { telegramRouter } from "../../../src/routes/TelegramRoutes";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { FollowRepository } from "../../../src/repositories/FollowRepository";
import { FaqRepository } from "../../../src/repositories/FaqRepository";
import * as authMiddleware from "../../../src/middlewares/authMiddleware";

describe("Telegram Routes - Unit Tests", () => {
  let app: Express;
  let mockReportRepository: jest.Mocked<ReportRepository>;
  let mockFollowRepository: jest.Mocked<FollowRepository>;
  let mockFaqRepository: jest.Mocked<FaqRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/telegram", telegramRouter);

    // Error handler middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    // Mock repositories
    mockReportRepository = {
      getReportsByUserId: jest.fn(),
    } as any;

    mockFollowRepository = {
      followAllPersonal: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
      unfollowAllByUser: jest.fn(),
    } as any;

    mockFaqRepository = {
      getAllFaqs: jest.fn(),
    } as any;

    (ReportRepository as jest.Mock).mockImplementation(() => mockReportRepository);
    (FollowRepository as jest.Mock).mockImplementation(() => mockFollowRepository);
    (FaqRepository as jest.Mock).mockImplementation(() => mockFaqRepository);

    // Mock auth middleware to pass through
    (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      (req as any).user = { id: 1, username: "testuser", type: ["user"] };
      next();
    });

    (authMiddleware.requireUserType as jest.Mock).mockImplementation(() => (req: any, res: any, next: any) => {
      next();
    });
  });

  describe("GET /telegram/reports", () => {
    it("should return user reports successfully", async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: "Test Report 1",
          state: ReportState.ASSIGNED,
          date: new Date("2024-01-01"),
          category: OfficeType.WASTE,
          anonymity: false,
          location: { name: "Location 1" },
          document: { Description: "Test description" },
          author: { id: 1, username: "testuser" },
        } as ReportDAO,
        {
          id: 2,
          title: "Test Report 2",
          state: ReportState.IN_PROGRESS,
          date: new Date("2024-01-02"),
          category: OfficeType.PUBLIC_LIGHTING,
          anonymity: false,
          location: { name: "Location 2" },
          document: { Description: "Another description" },
          author: { id: 1, username: "testuser" },
        } as ReportDAO,
      ];

      mockReportRepository.getReportsByUserId.mockResolvedValue(mockReports);

      const response = await request(app).get("/telegram/reports");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(mockReportRepository.getReportsByUserId).toHaveBeenCalledWith(1);
    });

    it("should return empty array when user has no reports", async () => {
      mockReportRepository.getReportsByUserId.mockResolvedValue([]);

      const response = await request(app).get("/telegram/reports");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockReportRepository.getReportsByUserId).toHaveBeenCalledWith(1);
    });

    it("should handle repository errors", async () => {
      mockReportRepository.getReportsByUserId.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/telegram/reports");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Database error");
    });

    it("should use authenticated user ID", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        (req as any).user = { id: 42, username: "anotheruser", type: ["user"] };
        next();
      });

      mockReportRepository.getReportsByUserId.mockResolvedValue([]);

      await request(app).get("/telegram/reports");

      expect(mockReportRepository.getReportsByUserId).toHaveBeenCalledWith(42);
    });
  });

  describe("POST /telegram/reports", () => {
    it("should follow all personal reports successfully", async () => {
      const mockFollows: FollowDAO[] = [
        { id: 1, user: { id: 1 } as any, report: { id: 1 } as any, notifyVia: "telegram" } as FollowDAO,
        { id: 2, user: { id: 1 } as any, report: { id: 2 } as any, notifyVia: "telegram" } as FollowDAO,
      ];

      mockFollowRepository.followAllPersonal.mockResolvedValue(mockFollows);

      const response = await request(app).post("/telegram/reports");

      expect(response.status).toBe(201);
      expect(response.body).toBe("Followed all personal reports.");
      expect(mockFollowRepository.followAllPersonal).toHaveBeenCalledWith(1, "telegram");
    });

    it("should handle errors when following all reports", async () => {
      mockFollowRepository.followAllPersonal.mockRejectedValue(new Error("Follow error"));

      const response = await request(app).post("/telegram/reports");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Follow error");
    });

    it("should use authenticated user ID when following all reports", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        (req as any).user = { id: 99, username: "testuser99", type: ["user"] };
        next();
      });

      mockFollowRepository.followAllPersonal.mockResolvedValue([]);

      await request(app).post("/telegram/reports");

      expect(mockFollowRepository.followAllPersonal).toHaveBeenCalledWith(99, "telegram");
    });
  });

  describe("POST /telegram/reports/:reportId", () => {
    it("should follow a specific report successfully", async () => {
      const mockFollow: FollowDAO = {
        id: 1,
        user: { id: 1 } as any,
        report: { id: 5 } as any,
        notifyVia: "telegram",
      } as FollowDAO;

      mockFollowRepository.follow.mockResolvedValue(mockFollow);

      const response = await request(app).post("/telegram/reports/5");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Follow created successfully.");
      expect(mockFollowRepository.follow).toHaveBeenCalledWith(1, 5, "telegram");
    });

    it("should handle invalid report ID", async () => {
      mockFollowRepository.follow.mockRejectedValue(new Error("Report not found"));

      const response = await request(app).post("/telegram/reports/999");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Report not found");
    });

    it("should parse reportId correctly", async () => {
      mockFollowRepository.follow.mockResolvedValue({} as FollowDAO);

      await request(app).post("/telegram/reports/123");

      expect(mockFollowRepository.follow).toHaveBeenCalledWith(1, 123, "telegram");
    });

    it("should handle follow repository errors", async () => {
      mockFollowRepository.follow.mockRejectedValue(new Error("Closed reports cannot be followed"));

      const response = await request(app).post("/telegram/reports/10");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Closed reports cannot be followed");
    });
  });

  describe("DELETE /telegram/reports/:reportId", () => {
    it("should unfollow a specific report successfully", async () => {
      mockFollowRepository.unfollow.mockResolvedValue(undefined);

      const response = await request(app).delete("/telegram/reports/5");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Follow deleted successfully.");
      expect(mockFollowRepository.unfollow).toHaveBeenCalledWith(1, 5, "telegram");
    });

    it("should handle errors when unfollowing", async () => {
      mockFollowRepository.unfollow.mockRejectedValue(new Error("Unfollow error"));

      const response = await request(app).delete("/telegram/reports/5");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Unfollow error");
    });

    it("should parse reportId correctly when unfollowing", async () => {
      mockFollowRepository.unfollow.mockResolvedValue(undefined);

      await request(app).delete("/telegram/reports/456");

      expect(mockFollowRepository.unfollow).toHaveBeenCalledWith(1, 456, "telegram");
    });

    it("should use authenticated user ID when unfollowing", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        (req as any).user = { id: 77, username: "user77", type: ["user"] };
        next();
      });

      mockFollowRepository.unfollow.mockResolvedValue(undefined);

      await request(app).delete("/telegram/reports/10");

      expect(mockFollowRepository.unfollow).toHaveBeenCalledWith(77, 10, "telegram");
    });
  });

  describe("DELETE /telegram/reports", () => {
    it("should unfollow all reports successfully", async () => {
      mockFollowRepository.unfollowAllByUser.mockResolvedValue(undefined);

      const response = await request(app).delete("/telegram/reports");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("All reports unfollowed successfully.");
      expect(mockFollowRepository.unfollowAllByUser).toHaveBeenCalledWith(1, "telegram");
    });

    it("should handle errors when unfollowing all reports", async () => {
      mockFollowRepository.unfollowAllByUser.mockRejectedValue(new Error("Unfollow all error"));

      const response = await request(app).delete("/telegram/reports");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Unfollow all error");
    });

    it("should use authenticated user ID when unfollowing all", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        (req as any).user = { id: 88, username: "user88", type: ["user"] };
        next();
      });

      mockFollowRepository.unfollowAllByUser.mockResolvedValue(undefined);

      await request(app).delete("/telegram/reports");

      expect(mockFollowRepository.unfollowAllByUser).toHaveBeenCalledWith(88, "telegram");
    });
  });

  describe("GET /telegram/faq", () => {
    it("should return all FAQs successfully", async () => {
      const mockFaqs: FaqDAO[] = [
        { id: 1, question: "What is Participium?", answer: "A civic engagement platform" } as FaqDAO,
        { id: 2, question: "How do I report?", answer: "Use the report form" } as FaqDAO,
      ];

      mockFaqRepository.getAllFaqs.mockResolvedValue(mockFaqs);

      const response = await request(app).get("/telegram/faq");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].question).toBe("What is Participium?");
      expect(response.body[1].question).toBe("How do I report?");
      expect(mockFaqRepository.getAllFaqs).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no FAQs exist", async () => {
      mockFaqRepository.getAllFaqs.mockResolvedValue([]);

      const response = await request(app).get("/telegram/faq");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should handle repository errors when fetching FAQs", async () => {
      mockFaqRepository.getAllFaqs.mockRejectedValue(new Error("FAQ fetch error"));

      const response = await request(app).get("/telegram/faq");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("FAQ fetch error");
    });

    it("should return FAQ with all fields", async () => {
      const mockFaq: FaqDAO = {
        id: 1,
        question: "Test question?",
        answer: "Test answer",
      } as FaqDAO;

      mockFaqRepository.getAllFaqs.mockResolvedValue([mockFaq]);

      const response = await request(app).get("/telegram/faq");

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject({
        id: 1,
        question: "Test question?",
        answer: "Test answer",
      });
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication for all routes", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const endpoints = [
        { method: "get", path: "/telegram/reports" },
        { method: "post", path: "/telegram/reports" },
        { method: "post", path: "/telegram/reports/1" },
        { method: "delete", path: "/telegram/reports/1" },
        { method: "delete", path: "/telegram/reports" },
        { method: "get", path: "/telegram/faq" },
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

  });

  describe("Edge Cases", () => {
    it("should handle non-numeric reportId in POST", async () => {
      const response = await request(app).post("/telegram/reports/abc");

      // parseInt will return NaN, which should be handled
      expect(mockFollowRepository.follow).toHaveBeenCalled();
      const calledReportId = (mockFollowRepository.follow as jest.Mock).mock.calls[0][1];
      expect(isNaN(calledReportId)).toBe(true);
    });

    it("should handle non-numeric reportId in DELETE", async () => {
      const response = await request(app).delete("/telegram/reports/xyz");

      expect(mockFollowRepository.unfollow).toHaveBeenCalled();
      const calledReportId = (mockFollowRepository.unfollow as jest.Mock).mock.calls[0][1];
      expect(isNaN(calledReportId)).toBe(true);
    });

    it("should handle missing user in request", async () => {
      (authMiddleware.authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        (req as any).user = undefined;
        next();
      });

      mockReportRepository.getReportsByUserId.mockResolvedValue([]);

      const response = await request(app).get("/telegram/reports");

      expect(mockReportRepository.getReportsByUserId).toHaveBeenCalledWith(undefined);
    });
  });
});
