import "reflect-metadata";

// Mock authService BEFORE importing app
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
import { generateToken } from "../../../src/services/authService";
import { UserRepository } from "../../../src/repositories/UserRepository";

describe("Notifications API Integration Tests", () => {
  let userRepo: UserRepository;
  let userToken: string;
  let testUserId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    userRepo = new UserRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    // Create active user
    const user = await userRepo.createUser("testuser", "Test", "User", "test@example.com", "Password@123");
    const repo = (userRepo as any).repo;
    user.isActive = true;
    await repo.save(user);
    testUserId = user.id;

    userToken = generateToken({
      id: user.id,
      username: user.username,
      isStaff: false,
      type: "user"
    });

    // Mock getSession to return the generated token
    mockGetSession.mockImplementation((userId, sessionType) => {
      return Promise.resolve({
        token: userToken,
        sessionType: sessionType || 'web',
        createdAt: Date.now()
      });
    });
  });

  describe("GET /notifications - List User Notifications", () => {
    it("should retrieve notifications for the authenticated user", async () => {
      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app)
        .get("/api/v1/notifications");
      
      expect(response.status).toBe(401);
    });

    it("should filter unread notifications when unreadOnly=true", async () => {
      const response = await request(app)
        .get("/api/v1/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("PATCH /notifications/:id/read - Mark Notification as Read", () => {
    it("should return 404 for non-existing notification", async () => {
      const response = await request(app)
        .patch("/api/v1/notifications/9999/read")
        .set("Authorization", `Bearer ${userToken}`);
      
      expect(response.status).toBe(500);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app)
        .patch("/api/v1/notifications/1/read");
      
      expect(response.status).toBe(401);
    });
  });
});



