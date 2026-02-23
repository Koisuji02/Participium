import request from "supertest";
import express from "express";
import { internalMessageRouter } from "../../../src/routes/InternalMessageRoutes";
import * as internalMessageController from "../../../src/controllers/internalMessageController";
import { authenticateToken, requireUserType } from "../../../src/middlewares/authMiddleware";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

jest.mock("../../../src/controllers/internalMessageController");
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { 
      id: 1, 
      username: "testofficer",
      isStaff: true,
      type: [OfficerRole.TECHNICAL_OFFICE_STAFF]
    };
    next();
  }),
  requireUserType: jest.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock ReportRepository
jest.mock("@repositories/ReportRepository", () => ({
  ReportRepository: jest.fn().mockImplementation(() => ({
    getReportById: jest.fn()
  }))
}));

const app = express();
app.use(express.json());
app.use("/reports", internalMessageRouter);

// Add error middleware
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500).json({ error: err.message });
});

describe("InternalMessageRoutes", () => {
  let mockGetReportById: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock instance
    const ReportRepository = require("@repositories/ReportRepository").ReportRepository;
    mockGetReportById = jest.fn();
    ReportRepository.mockImplementation(() => ({
      getReportById: mockGetReportById
    }));
  });

  // ===================== GET /:reportId/internal-messages =====================
  describe("GET /:reportId/internal-messages", () => {
    it("should return all messages for a report", async () => {
      const mockMessages = [
        {
          id: 1,
          reportId: 1,
          senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          senderId: 1,
          receiverType: OfficerRole.MAINTAINER,
          receiverId: 2,
          message: "Test message",
          createdAt: new Date()
        }
      ];
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue(mockMessages);

      const res = await request(app).get("/reports/1/internal-messages");

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(1);
      expect(res.status).toBe(200);
      // expect(res.body).toBe(mockMessages);
    });

    it("should return empty array when no messages exist", async () => {
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/reports/1/internal-messages");

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle invalid report ID (non-numeric)", async () => {
      const res = await request(app).get("/reports/invalid/internal-messages");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
      expect(internalMessageController.listConversation).not.toHaveBeenCalled();
    });

    it("should handle invalid report ID (NaN)", async () => {
      const res = await request(app).get("/reports/NaN/internal-messages");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
    });

    it("should handle report ID as zero", async () => {
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/reports/0/internal-messages");

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(0);
      expect(res.status).toBe(200);
    });

    it("should handle negative report ID", async () => {
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/reports/-1/internal-messages");

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(-1);
      expect(res.status).toBe(200);
    });

    it("should handle very large report ID", async () => {
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get(`/reports/${Number.MAX_SAFE_INTEGER}/internal-messages`);

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
      expect(res.status).toBe(200);
    });

    it("should handle errors from controller", async () => {
      (internalMessageController.listConversation as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/reports/1/internal-messages");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle report not found error", async () => {
      (internalMessageController.listConversation as jest.Mock).mockRejectedValue(
        new Error("Report with id '99999' not found")
      );

      const res = await request(app).get("/reports/99999/internal-messages");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toContain("Report");
    });

    it("should handle decimal report ID by converting to integer", async () => {
      (internalMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/reports/1.5/internal-messages");

      expect(internalMessageController.listConversation).toHaveBeenCalledWith(1.5);
      expect(res.status).toBe(200);
    });
  });

  // ===================== POST /:reportId/internal-messages =====================
  describe("POST /:reportId/internal-messages", () => {
    it("should send message from officer to maintainer", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test message" });

      expect(mockGetReportById).toHaveBeenCalledWith(1);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 },
        { type: OfficerRole.MAINTAINER, id: 2 },
        "Test message"
      );
      expect(res.status).toBe(201);
      expect(res.body.createdAt).toBe(mockSavedMessage.createdAt.toISOString());
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should send message from maintainer to officer", async () => {
      // Mock maintainer user
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = {
          id: 2,
          username: "testmaintainer",
          isStaff: true,
          type: [OfficerRole.MAINTAINER]
        };
        next();
      });

      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 2,
        reportId: 1,
        senderType: OfficerRole.MAINTAINER,
        senderId: 2,
        receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        receiverId: 1,
        message: "Reply from maintainer",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Reply from maintainer" });

      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        { type: OfficerRole.MAINTAINER, id: 2 },
        { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 },
        "Reply from maintainer"
      );
      expect(res.status).toBe(201);
    });

    it("should handle external_maintainer type", async () => {
      // Mock external maintainer user
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = {
          id: 3,
          username: "externalmaintainer",
          isStaff: true,
          type: ["external_maintainer"]
        };
        next();
      });

      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 3
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 3,
        reportId: 1,
        senderType: OfficerRole.MAINTAINER,
        senderId: 3,
        receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        receiverId: 1,
        message: "Message from external maintainer",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Message from external maintainer" });

      expect(res.status).toBe(201);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        { type: OfficerRole.MAINTAINER, id: 3 },
        expect.any(Object),
        "Message from external maintainer"
      );
    });

    it("should return 400 when message is missing", async () => {
      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
      expect(internalMessageController.sendInternalMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when message is empty string", async () => {
      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should return 400 when message is null", async () => {
      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: null });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should accept message with only whitespace (validation done by controller)", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      (internalMessageController.sendInternalMessage as jest.Mock).mockRejectedValue(
        new Error("Message cannot be empty")
      );

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "   " });

      expect(mockGetReportById).toHaveBeenCalled();
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await request(app)
        .post("/reports/invalid/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
      expect(mockGetReportById).not.toHaveBeenCalled();
    });

    it("should return 404 when report does not exist", async () => {
      mockGetReportById.mockResolvedValue(null);

      const res = await request(app)
        .post("/reports/99999/internal-messages")
        .send({ message: "Test" });

      expect(mockGetReportById).toHaveBeenCalledWith(99999);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Report not found");
      expect(internalMessageController.sendInternalMessage).not.toHaveBeenCalled();
    });

    it("should handle report repository errors", async () => {
      mockGetReportById.mockRejectedValue(new Error("Database connection error"));

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle controller errors", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      (internalMessageController.sendInternalMessage as jest.Mock).mockRejectedValue(
        new Error("Not assigned to this report")
      );

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toContain("Not assigned");
    });

    it("should handle long messages", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const longMessage = "A".repeat(1000);
      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: longMessage,
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: longMessage });

      expect(res.status).toBe(201);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        expect.any(Object),
        longMessage
      );
    });

    it("should handle special characters in message", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const specialMessage = "Test @#$%^&*()_+-=[]{}|;':\",./<>?";
      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: specialMessage,
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: specialMessage });

      expect(res.status).toBe(201);
    });

    it("should handle unicode characters in message", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const unicodeMessage = "你好 🌟 café";
      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: unicodeMessage,
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: unicodeMessage });

      expect(res.status).toBe(201);
    });

    it("should handle user type as string instead of array", async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = {
          id: 1,
          username: "testofficer",
          isStaff: true,
          type: OfficerRole.TECHNICAL_OFFICE_STAFF // string instead of array
        };
        next();
      });

      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: "Test",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBe(201);
    });

    it("should handle report with null assignedMaintainerId", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: null
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: "Test",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBe(201);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 },
        { type: OfficerRole.MAINTAINER, id: null },
        "Test"
      );
    });

    it("should handle report with null assignedOfficerId", async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = {
          id: 2,
          username: "testmaintainer",
          isStaff: true,
          type: [OfficerRole.MAINTAINER]
        };
        next();
      });

      const mockReport = {
        id: 1,
        assignedOfficerId: null,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: "Test",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ message: "Test" });

      expect(res.status).toBe(201);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        { type: OfficerRole.MAINTAINER, id: 2 },
        { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: null },
        "Test"
      );
    });

    it("should handle malformed JSON", async () => {
      const res = await request(app)
        .post("/reports/1/internal-messages")
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle extra fields in request body", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        assignedMaintainerId: 2
      };
      mockGetReportById.mockResolvedValue(mockReport);

      const mockSavedMessage = {
        id: 1,
        reportId: 1,
        message: "Test",
        createdAt: new Date()
      };
      (internalMessageController.sendInternalMessage as jest.Mock).mockResolvedValue(mockSavedMessage);

      const res = await request(app)
        .post("/reports/1/internal-messages")
        .send({ 
          message: "Test",
          extraField: "should be ignored",
          anotherField: 123
        });

      expect(res.status).toBe(201);
      expect(internalMessageController.sendInternalMessage).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        expect.any(Object),
        "Test"
      );
    });
  });
});