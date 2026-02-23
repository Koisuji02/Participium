import request from "supertest";
import express from "express";
import { publicMessageRouter } from "../../../src/routes/PublicMessageRoutes";
import * as publicMessageController from "../../../src/controllers/publicMessageController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

jest.mock("../../../src/controllers/publicMessageController");

// Mock authenticateToken middleware
jest.mock("@middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { 
      id: 1, 
      username: "testuser", 
      isStaff: false, 
      type: ["user"],
      sessionType: "web"
    };
    next();
  })
}));

// Get the mocked function after jest.mock
const { authenticateToken: mockAuthenticateToken } = require("@middlewares/authMiddleware");

const app = express();
app.use(express.json());
app.use("/api/v1/reports", publicMessageRouter);

describe("PublicMessageRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================== GET /:reportId/public-messages =====================
  describe("GET /:reportId/public-messages", () => {
    it("should return all public messages for a valid report", async () => {
      const mockMessages = [
        {
          id: 1,
          reportId: 123,
          message: "Hello, I need help",
          senderType: "citizen" as const,
          senderId: 1,
          senderName: "John Doe",
          createdAt: new Date("2024-01-01"),
          read: false
        },
        {
          id: 2,
          reportId: 123,
          message: "We are working on it",
          senderType: "officer" as const,
          senderId: 5,
          senderName: "Jane Smith",
          createdAt: new Date("2024-01-02"),
          read: true
        }
      ];

      (publicMessageController.listConversation as jest.Mock).mockResolvedValue(mockMessages);

      const res = await request(app).get("/api/v1/reports/123/public-messages");

      expect(publicMessageController.listConversation).toHaveBeenCalledWith(123);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty("id", 1);
      expect(res.body[0]).toHaveProperty("message", "Hello, I need help");
      expect(res.body[0]).toHaveProperty("senderType", "citizen");
      expect(res.body[1]).toHaveProperty("senderType", "officer");
    });

    it("should return empty array when no messages exist", async () => {
      (publicMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/api/v1/reports/123/public-messages");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return 400 for invalid report ID (NaN)", async () => {
      const res = await request(app).get("/api/v1/reports/invalid/public-messages");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
      expect(publicMessageController.listConversation).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid report ID (non-numeric string)", async () => {
      const res = await request(app).get("/api/v1/reports/abc123/public-messages");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
    });

    it("should handle controller errors", async () => {
      (publicMessageController.listConversation as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const res = await request(app).get("/api/v1/reports/123/public-messages");

      expect(res.status).toBe(500);
    });

    it("should require authentication", async () => {
      mockAuthenticateToken.mockImplementationOnce((req: any, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }, next: any) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const res = await request(app).get("/api/v1/reports/123/public-messages");

      expect(res.status).toBe(401);
    });
  });

  // ===================== POST /:reportId/public-messages =====================
  describe("POST /:reportId/public-messages", () => {
    it("should send a public message as a citizen", async () => {
      const newMessage = {
        id: 3,
        reportId: 123,
        message: "Thank you for the update",
        senderType: "citizen" as const,
        senderId: 1,
        senderName: "John Doe",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: string[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 1, 
          username: "citizen", 
          isStaff: false, 
          type: ["user"]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Thank you for the update" });

      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "citizen",
        1,
        "Thank you for the update"
      );
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", 3);
      expect(res.body).toHaveProperty("message", "Thank you for the update");
      expect(res.body).toHaveProperty("senderType", "citizen");
    });

    it("should send a public message as an officer (TECHNICAL_OFFICE_STAFF)", async () => {
      const newMessage = {
        id: 4,
        reportId: 123,
        message: "We have assigned this to maintenance",
        senderType: "officer" as const,
        senderId: 5,
        senderName: "Officer Smith",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: OfficerRole[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 5, 
          username: "officer", 
          isStaff: true, 
          type: [OfficerRole.TECHNICAL_OFFICE_STAFF]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "We have assigned this to maintenance" });

      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "officer",
        5,
        "We have assigned this to maintenance"
      );
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("senderType", "officer");
    });

    it("should send message as officer (MUNICIPAL_PUBLIC_RELATIONS_OFFICER)", async () => {
      const newMessage = {
        id: 5,
        reportId: 123,
        message: "Response from public relations",
        senderType: "officer" as const,
        senderId: 6,
        senderName: "PR Officer",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: OfficerRole[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 6, 
          username: "profficer", 
          isStaff: true, 
          type: [OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Response from public relations" });

      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "officer",
        6,
        "Response from public relations"
      );
      expect(res.status).toBe(201);
    });

    it("should send message as officer (MUNICIPAL_ADMINISTRATOR)", async () => {
      const newMessage = {
        id: 6,
        reportId: 123,
        message: "Admin response",
        senderType: "officer" as const,
        senderId: 7,
        senderName: "Admin",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: OfficerRole[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 7, 
          username: "admin", 
          isStaff: true, 
          type: [OfficerRole.MUNICIPAL_ADMINISTRATOR]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Admin response" });

      expect(res.status).toBe(201);
      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "officer",
        7,
        "Admin response"
      );
    });

    it("should send message as officer (MAINTAINER)", async () => {
      const newMessage = {
        id: 7,
        reportId: 123,
        message: "Maintainer update",
        senderType: "officer" as const,
        senderId: 8,
        senderName: "Maintainer",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: OfficerRole[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 8, 
          username: "maintainer", 
          isStaff: true, 
          type: [OfficerRole.MAINTAINER]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Maintainer update" });

      expect(res.status).toBe(201);
    });

    it("should send message as officer (external_maintainer)", async () => {
      const newMessage = {
        id: 8,
        reportId: 123,
        message: "External maintainer update",
        senderType: "officer" as const,
        senderId: 9,
        senderName: "External Maintainer",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: string[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 9, 
          username: "extmaintainer", 
          isStaff: true, 
          type: ["external_maintainer"]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "External maintainer update" });

      expect(res.status).toBe(201);
    });

    it("should handle user type as string instead of array", async () => {
      const newMessage = {
        id: 10,
        reportId: 123,
        message: "Message from user with string type",
        senderType: "citizen" as const,
        senderId: 10,
        senderName: "User",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: {
              user: {
                  id: number; username: string; isStaff: boolean; type: string; // string instead of array
              };
          }, res: any, next: () => void) => {
        req.user = { 
          id: 10, 
          username: "user", 
          isStaff: false, 
          type: "user" // string instead of array
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Message from user with string type" });

      expect(res.status).toBe(201);
      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "citizen",
        10,
        "Message from user with string type"
      );
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await request(app)
        .post("/api/v1/reports/invalid/public-messages")
        .send({ message: "Test message" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
      expect(publicMessageController.sendPublicMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when message is missing", async () => {
      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
      expect(publicMessageController.sendPublicMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when message is null", async () => {
      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: null });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should return 400 when message is empty string", async () => {
      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should handle controller errors", async () => {
      (publicMessageController.sendPublicMessage as jest.Mock).mockRejectedValue(
        new Error("Failed to save message")
      );

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Test message" });

      expect(res.status).toBe(500);
    });

    it("should require authentication", async () => {
      mockAuthenticateToken.mockImplementationOnce((req: any, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }, next: any) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Test message" });

      expect(res.status).toBe(401);
    });

    it("should accept message with special characters", async () => {
      const specialMessage = "Hello! @user #123 $100 & more...";
      const newMessage = {
        id: 11,
        reportId: 123,
        message: specialMessage,
        senderType: "citizen" as const,
        senderId: 1,
        senderName: "John Doe",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: specialMessage });

      expect(res.status).toBe(201);
      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "citizen",
        1,
        specialMessage
      );
    });

    it("should accept long messages", async () => {
      const longMessage = "A".repeat(1000);
      const newMessage = {
        id: 12,
        reportId: 123,
        message: longMessage,
        senderType: "citizen" as const,
        senderId: 1,
        senderName: "John Doe",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: longMessage });

      expect(res.status).toBe(201);
    });
  });

  // ===================== Edge Cases =====================
  describe("Edge Cases", () => {
    it("should handle report ID = 0", async () => {
      (publicMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/api/v1/reports/0/public-messages");

      expect(res.status).toBe(200);
      expect(publicMessageController.listConversation).toHaveBeenCalledWith(0);
    });

    it("should handle negative report ID", async () => {
      (publicMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/api/v1/reports/-123/public-messages");

      expect(res.status).toBe(200);
      expect(publicMessageController.listConversation).toHaveBeenCalledWith(-123);
    });

    it("should handle very large report ID", async () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      (publicMessageController.listConversation as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get(`/api/v1/reports/${largeId}/public-messages`);

      expect(res.status).toBe(200);
      expect(publicMessageController.listConversation).toHaveBeenCalledWith(largeId);
    });

    it("should handle user with multiple roles (officer + other)", async () => {
      const newMessage = {
        id: 13,
        reportId: 123,
        message: "Multi-role message",
        senderType: "officer" as const,
        senderId: 11,
        senderName: "Multi Role User",
        createdAt: new Date("2024-01-03"),
        read: false
      };

      (publicMessageController.sendPublicMessage as jest.Mock).mockResolvedValue(newMessage);

      mockAuthenticateToken.mockImplementationOnce((req: { user: { id: number; username: string; isStaff: boolean; type: string[]; }; }, res: any, next: () => void) => {
        req.user = { 
          id: 11, 
          username: "multirole", 
          isStaff: true, 
          type: ["user", OfficerRole.TECHNICAL_OFFICE_STAFF]
        };
        next();
      });

      const res = await request(app)
        .post("/api/v1/reports/123/public-messages")
        .send({ message: "Multi-role message" });

      expect(res.status).toBe(201);
      expect(publicMessageController.sendPublicMessage).toHaveBeenCalledWith(
        123,
        "officer",
        11,
        "Multi-role message"
      );
    });
  });
});
