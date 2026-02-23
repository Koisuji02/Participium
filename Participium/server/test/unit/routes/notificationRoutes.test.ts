import request from "supertest";
import express from "express";
import { notificationRouter } from "../../../src/routes/NotificationRoutes";
import { NotificationRepository } from "../../../src/repositories/NotificationRepository";

jest.mock("../../../src/repositories/NotificationRepository");
jest.mock("@middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1, username: "testuser" };
    next();
  }),
  requireUserType: jest.fn(() => (req: any, res: any, next: () => any) => next())
}));

const app = express();
app.use(express.json());
app.use("/notifications", notificationRouter);

describe("NotificationRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /notifications", () => {
    it("should return all notifications for user", async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          reportId: 10,
          type: "REPORT_APPROVED",
          message: "Your report has been approved",
          createdAt: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          userId: 1,
          reportId: 11,
          type: "REPORT_DECLINED",
          message: "Your report has been declined",
          createdAt: new Date().toISOString(),
          read: true
        }
      ];
      (NotificationRepository.prototype.listByUser as jest.Mock).mockResolvedValue(mockNotifications);

      const res = await request(app).get("/notifications");
      expect(NotificationRepository.prototype.listByUser).toHaveBeenCalledWith(1, false);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty("id", 1);
      expect(res.body[1]).toHaveProperty("id", 2);
    });

    it("should filter unread notifications when unreadOnly=true", async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          reportId: 10,
          type: "REPORT_APPROVED",
          message: "Your report has been approved",
          createdAt: new Date().toISOString(),
          read: false
        }
      ];
      (NotificationRepository.prototype.listByUser as jest.Mock).mockResolvedValue(mockNotifications);

      const res = await request(app).get("/notifications?unreadOnly=true");
      expect(NotificationRepository.prototype.listByUser).toHaveBeenCalledWith(1, true);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].read).toBe(false);
    });

    it("should handle errors in listByUser", async () => {
      (NotificationRepository.prototype.listByUser as jest.Mock).mockRejectedValue(new Error("List error"));
      const res = await request(app).get("/notifications");
      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("should mark notification as read", async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        reportId: 10,
        type: "REPORT_APPROVED",
        message: "Your report has been approved",
        createdAt: new Date().toISOString(),
        read: true
      };
      (NotificationRepository.prototype.markRead as jest.Mock).mockResolvedValue(mockNotification);

      const res = await request(app).patch("/notifications/1/read");
      expect(NotificationRepository.prototype.markRead).toHaveBeenCalledWith(1, 1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, read: true });
    });

    it("should handle errors in markRead", async () => {
      (NotificationRepository.prototype.markRead as jest.Mock).mockRejectedValue(new Error("Mark error"));
      const res = await request(app).patch("/notifications/1/read");
      expect(res.status).toBe(500);
    });
  });
});