import "reflect-metadata";

// Mock authentication service
jest.mock("../../../src/services/authService", () => {
  const original = jest.requireActual("../../../src/services/authService");
  return {
    ...original,
    saveSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn((userId, sessionType) => {
      // This mock allows any valid JWT token to pass authentication
      // The token validation is done by verifyToken, we just need to return
      // a session that matches whatever token was used in the request
      // We'll use a dynamic approach: extract the token from the current request context
      return Promise.resolve({
        token: (global as any).__currentToken || "mock-token",
        sessionType: sessionType || "web",
        createdAt: Date.now(),
      });
    }),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  };
});

// Middleware to capture the token from requests for our mock
const originalVerifyToken = jest.requireActual("../../../src/services/authService").verifyToken;
jest.spyOn(require("../../../src/services/authService"), "verifyToken").mockImplementation((token) => {
  (global as any).__currentToken = token;
  return originalVerifyToken(token);
});

// Mock socket.io service
jest.mock("../../../src/services/ioService", () => ({
  getIO: jest.fn(() => null),
  setIO: jest.fn(),
}));

import request from "supertest";
import { app } from "../../../src/app";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { PublicMessageRepository } from "../../../src/repositories/PublicMessageRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { generateToken } from "../../../src/services/authService";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { ReportState } from "../../../src/models/enums/ReportState";

describe("Public Message API Integration Tests", () => {
  let userRepo: UserRepository;
  let reportRepo: ReportRepository;
  let messageRepo: PublicMessageRepository;
  let officerRepo: OfficerRepository;

  let citizenToken: string;
  let citizenId: number;
  let officerToken: string;
  let officerId: number;
  let reportId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    userRepo = new UserRepository();
    reportRepo = new ReportRepository();
    messageRepo = new PublicMessageRepository();
    officerRepo = new OfficerRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    // Create a citizen user
    const citizen = await userRepo.createUser(
      "citizen1",
      "John",
      "Doe",
      "citizen@example.com",
      "Password@123"
    );
    citizenId = citizen.id;
    citizenToken = generateToken({
      id: citizenId,
      username: "citizen1",
      type: ["citizen"],
      sessionType: "web",
    });

    // Create an officer
    const officer = await officerRepo.createOfficer(
      "officer1",
      "Jane",
      "Smith",
      "officer@example.com",
      "Password@123",
      [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ROADS_AND_URBAN_FURNISHINGS }]
    );
    officerId = officer.id;
    officerToken = generateToken({
      id: officerId,
      username: "officer1",
      type: [OfficerRole.TECHNICAL_OFFICE_STAFF],
      sessionType: "web",
    });

    // Create a test report
    const report = await reportRepo.createReport(
      "Test Report",
      { name: "Main Street", Coordinates: { longitude: 10.5, latitude: 45.5 } },
      citizen,
      false,
      OfficeType.ROADS_AND_URBAN_FURNISHINGS,
      { Description: "Test report description" }
    );
    reportId = report.id;
  });

  // ===================== GET /api/v1/reports/:reportId/public-messages =====================
  describe("GET /api/v1/reports/:reportId/public-messages", () => {
    it("should return 401 when no authentication token is provided", async () => {
      const res = await request(app).get(`/api/v1/reports/${reportId}/public-messages`);

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await request(app)
        .get("/api/v1/reports/invalid/public-messages")
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
    });

    it("should return empty array when no messages exist", async () => {
      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return messages for a report as citizen", async () => {
      // Create some messages via API
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "First message from citizen" });

      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Response from officer" });

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        message: "First message from citizen",
        senderType: "citizen",
        senderId: citizenId,
      });
      expect(res.body[1]).toMatchObject({
        message: "Response from officer",
        senderType: "officer",
        senderId: officerId,
      });
    });

    it("should return messages for a report as officer", async () => {
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Officer checking report" });

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        message: "Officer checking report",
        senderType: "officer",
      });
    });

    it("should return messages ordered by creation date", async () => {
      // Create messages via API
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "First message" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Second message" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Third message" });

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].message).toBe("First message");
      expect(res.body[1].message).toBe("Second message");
      expect(res.body[2].message).toBe("Third message");
    });

    it("should include sender information in messages", async () => {
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Message with sender info" });

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("senderName");
    });

    it("should return messages with all required DTO fields", async () => {
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Complete message" });

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("reportId");
      expect(res.body[0]).toHaveProperty("message");
      expect(res.body[0]).toHaveProperty("senderType");
      expect(res.body[0]).toHaveProperty("senderId");
      expect(res.body[0]).toHaveProperty("senderName");
      expect(res.body[0]).toHaveProperty("createdAt");
      expect(res.body[0]).toHaveProperty("read");
    });
  });

  // ===================== POST /api/v1/reports/:reportId/public-messages =====================
  describe("POST /api/v1/reports/:reportId/public-messages", () => {
    it("should return 401 when no authentication token is provided", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .send({ message: "Test message" });

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await request(app)
        .post("/api/v1/reports/invalid/public-messages")
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Test message" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid report ID");
    });

    it("should return 400 when message field is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should return 400 when message field is empty", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing required field: message");
    });

    it("should create a new message from citizen", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Hello from citizen" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        reportId,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: citizenId,
        read: false,
      });
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should create a new message from officer with TECHNICAL_OFFICE_STAFF role", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Hello from technical officer" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        reportId,
        message: "Hello from technical officer",
        senderType: "officer",
        senderId: officerId,
        read: false,
      });
    });

    it("should create a new message from officer with MUNICIPAL_ADMINISTRATOR role", async () => {
      const admin = await officerRepo.createOfficer(
        "admin1",
        "Admin",
        "User",
        "admin@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: OfficeType.ORGANIZATION }]
      );
      const adminToken = generateToken({
        id: admin.id,
        username: "admin1",
        type: [OfficerRole.MUNICIPAL_ADMINISTRATOR],
        sessionType: "web",
      });

      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ message: "Hello from administrator" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        senderType: "officer",
        message: "Hello from administrator",
      });
    });

    it("should create a new message from officer with MUNICIPAL_PUBLIC_RELATIONS_OFFICER role", async () => {
      const prOfficer = await officerRepo.createOfficer(
        "profficer1",
        "PR",
        "Officer",
        "pr@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: OfficeType.ORGANIZATION }]
      );
      const prToken = generateToken({
        id: prOfficer.id,
        username: "profficer1",
        type: [OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER],
        sessionType: "web",
      });

      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${prToken}`)
        .send({ message: "Hello from PR officer" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        senderType: "officer",
        message: "Hello from PR officer",
      });
    });

    it("should create a new message from officer with MAINTAINER role", async () => {
      const maintainer = await officerRepo.createOfficer(
        "maintainer1",
        "Maintainer",
        "User",
        "maintainer@example.com",
        "Password@123",
        [{ role: OfficerRole.MAINTAINER, office: OfficeType.ROADS_AND_URBAN_FURNISHINGS }]
      );
      const maintainerToken = generateToken({
        id: maintainer.id,
        username: "maintainer1",
        type: [OfficerRole.MAINTAINER],
        sessionType: "web",
      });

      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${maintainerToken}`)
        .send({ message: "Hello from maintainer" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        senderType: "officer",
        message: "Hello from maintainer",
      });
    });

    it("should persist message in database", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Persisted message" });

      expect(res.status).toBe(201);

      // Verify message exists in database
      const messages = await messageRepo.listByReport(reportId);
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toBe("Persisted message");
      expect(messages[0].senderType).toBe("citizen");
    });

    it("should handle multiple messages in conversation", async () => {
      // Citizen sends first message
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "First message" });

      // Officer responds
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Officer response" });

      // Citizen replies
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Citizen reply" });

      expect(res.status).toBe(201);

      // Verify all messages exist
      const messages = await messageRepo.listByReport(reportId);
      expect(messages).toHaveLength(3);
      expect(messages[0].message).toBe("First message");
      expect(messages[1].message).toBe("Officer response");
      expect(messages[2].message).toBe("Citizen reply");
    });

    it("should return created message with correct structure", async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Structured message" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(typeof res.body.id).toBe("number");
      expect(res.body).toHaveProperty("reportId", reportId);
      expect(res.body).toHaveProperty("message", "Structured message");
      expect(res.body).toHaveProperty("senderType", "citizen");
      expect(res.body).toHaveProperty("senderId", citizenId);
      expect(res.body).toHaveProperty("senderName");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("read", false);
    });

    it("should handle long message text", async () => {
      const longMessage = "A".repeat(1000);
      
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: longMessage });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe(longMessage);
    });

    it("should handle special characters in message", async () => {
      const specialMessage = "Hello! @#$%^&*() 你好 مرحبا <script>alert('test')</script>";
      
      const res = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: specialMessage });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe(specialMessage);
    });

    it("should handle messages for different reports", async () => {
      // Create second report
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");
      
      const report2 = await reportRepo.createReport(
        "Second Report",
        { name: "Second Street", Coordinates: { longitude: 10.6, latitude: 45.6 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Second report description" }
      );

      // Send message to first report
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Message for report 1" });

      // Send message to second report
      await request(app)
        .post(`/api/v1/reports/${report2.id}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Message for report 2" });

      // Verify messages are separate
      const messages1 = await messageRepo.listByReport(reportId);
      const messages2 = await messageRepo.listByReport(report2.id);

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1[0].message).toBe("Message for report 1");
      expect(messages2[0].message).toBe("Message for report 2");
    });
  });

  // ===================== Cross-cutting tests =====================
  describe("Cross-cutting scenarios", () => {
    it("should allow citizen to read and send messages", async () => {
      // Send message
      const sendRes = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Citizen message" });

      expect(sendRes.status).toBe(201);

      // Read messages
      const getRes = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveLength(1);
    });

    it("should allow officer to read and send messages", async () => {
      // Send message
      const sendRes = await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "Officer message" });

      expect(sendRes.status).toBe(201);

      // Read messages
      const getRes = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveLength(1);
    });

    it("should maintain conversation flow between citizen and officer", async () => {
      // Citizen starts conversation
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "I need help with this issue" });

      // Officer responds
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ message: "We are looking into it" });

      // Citizen follows up
      await request(app)
        .post(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`)
        .send({ message: "Thank you!" });

      // Both can read full conversation
      const citizenView = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${citizenToken}`);

      const officerView = await request(app)
        .get(`/api/v1/reports/${reportId}/public-messages`)
        .set("Authorization", `Bearer ${officerToken}`);

      expect(citizenView.body).toHaveLength(3);
      expect(officerView.body).toHaveLength(3);
      expect(citizenView.body).toEqual(officerView.body);
    });
  });
});
