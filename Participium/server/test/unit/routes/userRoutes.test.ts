import request from "supertest";
import express from "express";
import { userRouter } from "../../../src/routes/UserRoutes";
import * as userController from "../../../src/controllers/userController";
import * as reportController from "../../../src/controllers/reportController";
import * as mailService from "../../../src/services/mailService";
import * as otpService from "../../../src/services/otpService";
import { authenticateToken } from "../../../src/middlewares/authMiddleware";
import { uploadAvatar } from "../../../src/middlewares/uploadMiddleware";
import { FollowRepository } from "../../../src/repositories/FollowRepository";

jest.mock("../../../src/controllers/userController");
jest.mock("../../../src/controllers/reportController");
jest.mock("../../../src/services/mailService");
jest.mock("../../../src/services/otpService");
jest.mock("../../../src/repositories/FollowRepository");
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1, username: "testuser", type: "user" };
    next();
  }),
  requireUserType: jest.fn((types) => (req: any, res: any, next: () => any) => next())
}));
jest.mock("../../../src/middlewares/uploadMiddleware", () => ({
  uploadAvatar: jest.fn((req, res, next) => next())
}));
jest.mock("@dto/User", () => ({
  UserFromJSON: jest.fn((data) => data)
}));

const app = express();
app.use(express.json());
app.use("/users", userRouter);

describe("UserRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /users/logout", () => {
    it("should call logoutUser and return 200", async () => {
      (userController.logoutUser as jest.Mock).mockResolvedValue(undefined);
      const res = await request(app).get("/users/logout");
      expect(userController.logoutUser).toHaveBeenCalled();
      expect(res.status).toBe(200);
    });

    it("should handle errors in logoutUser", async () => {
      (userController.logoutUser as jest.Mock).mockRejectedValue(new Error("Logout error"));
      const res = await request(app).get("/users/logout");
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /users", () => {
    it("should create a user and return 200", async () => {
      (userController.createUser as jest.Mock).mockResolvedValue({ id: 1, username: "testuser" });
      const res = await request(app)
        .post("/users")
        .send({ username: "testuser", password: "pw" });
      expect(userController.createUser).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, username: "testuser" });
    });

    it("should handle errors in createUser", async () => {
      (userController.createUser as jest.Mock).mockRejectedValue(new Error("Create error"));
      const res = await request(app)
        .post("/users")
        .send({ username: "testuser", password: "pw" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /users/me", () => {
    it("should return user profile", async () => {
      (userController.getMyProfile as jest.Mock).mockResolvedValue({ id: 1, username: "testuser" });
      const res = await request(app).get("/users/me");
      expect(userController.getMyProfile).toHaveBeenCalledWith(1, { includeFollowedReports: false });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, username: "testuser" });
    });

    it("should return user profile with followed reports when include query is set", async () => {
      (userController.getMyProfile as jest.Mock).mockResolvedValue({ 
        id: 1, 
        username: "testuser",
        followedReports: [{ id: 1, title: "Report 1" }]
      });
      
      const res = await request(app).get("/users/me?include=followedReports");
      
      expect(userController.getMyProfile).toHaveBeenCalledWith(1, { includeFollowedReports: true });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("followedReports");
    });

    it("should handle multiple include values in query string", async () => {
      (userController.getMyProfile as jest.Mock).mockResolvedValue({ 
        id: 1, 
        username: "testuser",
        followedReports: []
      });
      
      const res = await request(app).get("/users/me?include=followedReports,other");
      
      expect(userController.getMyProfile).toHaveBeenCalledWith(1, { includeFollowedReports: true });
      expect(res.status).toBe(200);
    });

    it("should not include followed reports when include query is different", async () => {
      (userController.getMyProfile as jest.Mock).mockResolvedValue({ id: 1, username: "testuser" });
      
      const res = await request(app).get("/users/me?include=other");
      
      expect(userController.getMyProfile).toHaveBeenCalledWith(1, { includeFollowedReports: false });
      expect(res.status).toBe(200);
    });

    it("should handle errors in getMyProfile", async () => {
      (userController.getMyProfile as jest.Mock).mockRejectedValue(new Error("Profile error"));
      const res = await request(app).get("/users/me");
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /users/me", () => {
    it("should update user profile", async () => {
      (userController.updateMyProfile as jest.Mock).mockResolvedValue({ id: 1, telegramUsername: "tg" });
      const res = await request(app)
        .patch("/users/me")
        .send({ telegramUsername: "tg", emailNotifications: "true" });
      expect(userController.updateMyProfile).toHaveBeenCalledWith(1, {
        telegramUsername: "tg",
        emailNotifications: true,
        avatarPath: undefined
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, telegramUsername: "tg" });
    });

    it("should handle emailNotifications as boolean true", async () => {
      (userController.updateMyProfile as jest.Mock).mockResolvedValue({ id: 1 });
      const res = await request(app)
        .patch("/users/me")
        .send({ emailNotifications: true });
      expect(userController.updateMyProfile).toHaveBeenCalledWith(1, {
        telegramUsername: undefined,
        emailNotifications: true,
        avatarPath: undefined
      });
      expect(res.status).toBe(200);
    });

    it("should handle emailNotifications as string false", async () => {
      (userController.updateMyProfile as jest.Mock).mockResolvedValue({ id: 1 });
      const res = await request(app)
        .patch("/users/me")
        .send({ emailNotifications: "false" });
      expect(userController.updateMyProfile).toHaveBeenCalledWith(1, {
        telegramUsername: undefined,
        emailNotifications: false,
        avatarPath: undefined
      });
      expect(res.status).toBe(200);
    });

    it("should handle emailNotifications as undefined", async () => {
      (userController.updateMyProfile as jest.Mock).mockResolvedValue({ id: 1 });
      const res = await request(app)
        .patch("/users/me")
        .send({ telegramUsername: "tg" });
      expect(userController.updateMyProfile).toHaveBeenCalledWith(1, {
        telegramUsername: "tg",
        emailNotifications: undefined,
        avatarPath: undefined
      });
      expect(res.status).toBe(200);
    });

    it("should handle avatar upload with file", async () => {
      const mockUpload = jest.fn((req, res, next) => {
        req.file = { filename: "avatar.png" };
        next();
      });
      jest.spyOn(require("../../../src/middlewares/uploadMiddleware"), "uploadAvatar").mockImplementation(mockUpload);

      (userController.updateMyProfile as jest.Mock).mockResolvedValue({ id: 1, avatarPath: "/uploads/avatars/avatar.png" });
      
      const res = await request(app)
        .patch("/users/me")
        .send({ telegramUsername: "tg" });

      expect(userController.updateMyProfile).toHaveBeenCalledWith(1, {
        telegramUsername: "tg",
        emailNotifications: undefined,
        avatarPath: "/uploads/avatars/avatar.png"
      });
      expect(res.status).toBe(200);
    });

    it("should handle errors in updateMyProfile", async () => {
      (userController.updateMyProfile as jest.Mock).mockRejectedValue(new Error("Update error"));
      const res = await request(app)
        .patch("/users/me")
        .send({ telegramUsername: "tg" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /users/me/info", () => {
    it("should return user info from req.user", async () => {
      const res = await request(app).get("/users/me/info");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, type: "user", username: "testuser" });
    });
  });

  describe("POST /users/generateotp", () => {
    it("should generate OTP and send email", async () => {
      (userController.isActive as jest.Mock).mockResolvedValue(false);
      (otpService.generateOtp as jest.Mock).mockResolvedValue("123456");
      (mailService.sendMail as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/users/generateotp")
        .send({ email: "test@example.com" });

      expect(userController.isActive).toHaveBeenCalledWith("test@example.com");
      expect(otpService.generateOtp).toHaveBeenCalledWith("test@example.com");
      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: "Your Participium OTP code",
        text: "OTP code: 123456 (valid for 30 minutes)",
        html: "<p>OTP code: <b>123456</b></p><p>Valid for 30 minutes.</p>"
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ sent: true });
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/users/generateotp")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Provide email" });
    });

    it("should return 400 if account is already active", async () => {
      (userController.isActive as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/users/generateotp")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Account is already active" });
    });

    it("should handle errors in generateotp", async () => {
      (userController.isActive as jest.Mock).mockRejectedValue(new Error("OTP error"));

      const res = await request(app)
        .post("/users/generateotp")
        .send({ email: "test@example.com" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /users/verifyotp", () => {
    it("should verify OTP and activate account", async () => {
      (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
      (userController.activateAccount as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/users/verifyotp")
        .send({ email: "test@example.com", code: "123456" });

      expect(otpService.verifyOtp).toHaveBeenCalledWith("test@example.com", "123456");
      expect(userController.activateAccount).toHaveBeenCalledWith("test@example.com");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: true });
    });

    it("should return 400 if email or code is missing", async () => {
      const res1 = await request(app)
        .post("/users/verifyotp")
        .send({ email: "test@example.com" });

      expect(res1.status).toBe(400);
      expect(res1.body).toEqual({ error: "Provide email and code" });

      const res2 = await request(app)
        .post("/users/verifyotp")
        .send({ code: "123456" });

      expect(res2.status).toBe(400);
      expect(res2.body).toEqual({ error: "Provide email and code" });
    });

    it("should return 401 if OTP is invalid or expired", async () => {
      (otpService.verifyOtp as jest.Mock).mockResolvedValue(false);

      const res = await request(app)
        .post("/users/verifyotp")
        .send({ email: "test@example.com", code: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ valid: false, error: "Invalid or expired OTP" });
    });

    it("should handle errors in verifyotp", async () => {
      (otpService.verifyOtp as jest.Mock).mockRejectedValue(new Error("Verify error"));

      const res = await request(app)
        .post("/users/verifyotp")
        .send({ email: "test@example.com", code: "123456" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /users/me/followed-reports", () => {
    let mockFollowRepo: jest.Mocked<FollowRepository>;

    beforeEach(() => {
      mockFollowRepo = {
        getFollowedReportsByUser: jest.fn(),
      } as any;

      (FollowRepository as jest.Mock).mockImplementation(() => mockFollowRepo);
    });

    it("should return list of followed reports successfully", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: "ASSIGNED" },
        { id: 2, title: "Report 2", state: "IN_PROGRESS" },
      ];

      const mockMappedReports = [
        { id: 1, title: "Report 1", state: "ASSIGNED", author: { id: 1 } },
        { id: 2, title: "Report 2", state: "IN_PROGRESS", author: { id: 2 } },
      ];

      mockFollowRepo.getFollowedReportsByUser.mockResolvedValue(mockReports as any);
      (reportController.getReport as jest.Mock)
        .mockResolvedValueOnce(mockMappedReports[0])
        .mockResolvedValueOnce(mockMappedReports[1]);

      const res = await request(app).get("/users/me/followed-reports");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockFollowRepo.getFollowedReportsByUser).toHaveBeenCalledWith(1);
      expect(reportController.getReport).toHaveBeenCalledTimes(2);
      expect(reportController.getReport).toHaveBeenCalledWith(1);
      expect(reportController.getReport).toHaveBeenCalledWith(2);
    });

    it("should return empty array when user follows no reports", async () => {
      mockFollowRepo.getFollowedReportsByUser.mockResolvedValue([]);

      const res = await request(app).get("/users/me/followed-reports");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(reportController.getReport).not.toHaveBeenCalled();
    });

    it("should handle errors when getting followed reports", async () => {
      mockFollowRepo.getFollowedReportsByUser.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/users/me/followed-reports");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle errors when mapping reports", async () => {
      const mockReports = [{ id: 1, title: "Report 1" }];
      
      mockFollowRepo.getFollowedReportsByUser.mockResolvedValue(mockReports as any);
      (reportController.getReport as jest.Mock).mockRejectedValue(new Error("Report not found"));

      const res = await request(app).get("/users/me/followed-reports");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});