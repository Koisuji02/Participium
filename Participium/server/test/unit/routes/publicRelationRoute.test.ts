import request from "supertest";
import express, { Express } from "express";
import { PublicRelationRoutes } from "../../../src/routes/PublicRelationRoutes";
import * as officerController from "../../../src/controllers/officerController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

// Mock middleware
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    // Simulate authenticated user
    (req as any).user = {
      id: 1,
      username: "prOfficer",
      type: [OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER],
      isStaff: true,
    };
    next();
  }),
  requireUserType: jest.fn((roles) => (req: any, res: any, next: () => void) => {
    next();
  }),
}));

// Mock controller functions
jest.mock("../../../src/controllers/officerController");

// Get references to mocked functions
import * as authMiddleware from "../../../src/middlewares/authMiddleware";
const mockAuthenticateToken = authMiddleware.authenticateToken as jest.Mock;
const mockRequireUserType = authMiddleware.requireUserType as jest.Mock;

describe("PublicRelationRoutes - Unit Tests", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/public-relation", PublicRelationRoutes);

    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================== GET /retrievedocs =====================
  describe("GET /retrievedocs", () => {
    it("should return 200 and list of reports when officer is authenticated", async () => {
      const mockReports = [
        {
          id: 1,
          title: "Report 1",
          state: "PENDING",
          category: "ROADS_AND_URBAN_FURNISHINGS",
        },
        {
          id: 2,
          title: "Report 2",
          state: "PENDING",
          category: "PUBLIC_LIGHTING",
        },
      ];

      (officerController.retrieveDocs as jest.Mock).mockResolvedValue(mockReports);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReports);
      expect(officerController.retrieveDocs).toHaveBeenCalledWith(1);
      expect(officerController.retrieveDocs).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no reports are available", async () => {
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(officerController.retrieveDocs).toHaveBeenCalledWith(1);
    });

    it("should return 500 when controller throws an error", async () => {
      const errorMessage = "Database connection error";
      (officerController.retrieveDocs as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", errorMessage);
      expect(officerController.retrieveDocs).toHaveBeenCalledWith(1);
    });

    it("should call retrieveDocs with officer ID from token", async () => {
      const mockReports = [{ id: 1, title: "Test Report" }];
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue(mockReports);

      await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(officerController.retrieveDocs).toHaveBeenCalledWith(1);
    });

    it("should return reports assigned to officer and unassigned reports", async () => {
      const mockReports = [
        { id: 1, title: "Assigned to me", assignedOfficerId: 1 },
        { id: 2, title: "Unassigned", assignedOfficerId: null },
      ];

      (officerController.retrieveDocs as jest.Mock).mockResolvedValue(mockReports);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(officerController.retrieveDocs).toHaveBeenCalledWith(1);
    });
  });

  // ===================== POST /assign-report =====================
  describe("POST /assign-report", () => {
    it("should return 200 when report is successfully assigned", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Report assigned successfully" });
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(1, 2);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledTimes(1);
    });

    it("should return 200 when assigning to self", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 5, officerId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Report assigned successfully" });
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(5, 1);
    });

    it("should return 500 when controller throws an error", async () => {
      const errorMessage = "Report not found";
      (officerController.assignReportToOfficer as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 999, officerId: 2 });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", errorMessage);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(999, 2);
    });

    it("should return 500 when officer not found", async () => {
      const errorMessage = "Officer not found";
      (officerController.assignReportToOfficer as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 999 });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", errorMessage);
    });

    it("should return 500 when report is not in PENDING state", async () => {
      const errorMessage = "Only PENDING reports can be assigned";
      (officerController.assignReportToOfficer as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 2 });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", errorMessage);
    });

    it("should handle missing reportId in request body", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ officerId: 2 });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(undefined, 2);
    });

    it("should handle missing officerId in request body", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1 });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(1, undefined);
    });

    it("should handle empty request body", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({});

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should pass correct parameters from request body", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 123, officerId: 456 });

      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(123, 456);
    });

    it("should handle numeric string parameters", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: "10", officerId: "20" });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith("10", "20");
    });
  });

  // ===================== Middleware integration =====================
  describe("Middleware Integration", () => {
    it("should use authenticateToken middleware on GET /retrievedocs", async () => {
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(mockAuthenticateToken).toHaveBeenCalled();
    });

    it("should use authenticateToken middleware on POST /assign-report", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 2 });

      expect(mockAuthenticateToken).toHaveBeenCalled();
    });
  });

  // ===================== Error handling =====================
  describe("Error Handling", () => {
    it("should handle errors thrown in GET /retrievedocs", async () => {
      const customError = new Error("Custom error");
      (officerController.retrieveDocs as jest.Mock).mockRejectedValue(customError);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Custom error");
    });

    it("should handle errors thrown in POST /assign-report", async () => {
      const customError = new Error("Assignment failed");
      (officerController.assignReportToOfficer as jest.Mock).mockRejectedValue(customError);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 2 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Assignment failed");
    });

    it("should propagate errors to error handling middleware", async () => {
      const error = new Error("Test error");
      (officerController.retrieveDocs as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message");
    });
  });

  // ===================== Request/Response validation =====================
  describe("Request/Response Validation", () => {
    it("should accept valid Authorization header for GET /retrievedocs", async () => {
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token-123");

      expect(response.status).toBe(200);
    });

    it("should accept valid Authorization header for POST /assign-report", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token-456")
        .send({ reportId: 1, officerId: 2 });

      expect(response.status).toBe(200);
    });

    it("should return JSON response for GET /retrievedocs", async () => {
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Array);
    });

    it("should return JSON response for POST /assign-report", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 1, officerId: 2 });

      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty("message");
    });

    it("should accept JSON content-type for POST /assign-report", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ reportId: 1, officerId: 2 }));

      expect(response.status).toBe(200);
    });
  });

  // ===================== Edge cases =====================
  describe("Edge Cases", () => {
    it("should handle very large reportId and officerId", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: Number.MAX_SAFE_INTEGER, officerId: Number.MAX_SAFE_INTEGER });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
      );
    });

    it("should handle negative reportId and officerId", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: -1, officerId: -1 });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(-1, -1);
    });

    it("should handle zero values for reportId and officerId", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({ reportId: 0, officerId: 0 });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(0, 0);
    });

    it("should handle retrieveDocs returning large array", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Report ${i}`,
      }));
      (officerController.retrieveDocs as jest.Mock).mockResolvedValue(largeArray);

      const response = await request(app)
        .get("/api/public-relation/retrievedocs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1000);
    });

    it("should handle extra fields in POST request body", async () => {
      (officerController.assignReportToOfficer as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/public-relation/assign-report")
        .set("Authorization", "Bearer valid-token")
        .send({
          reportId: 1,
          officerId: 2,
          extraField1: "ignored",
          extraField2: 123,
        });

      expect(response.status).toBe(200);
      expect(officerController.assignReportToOfficer).toHaveBeenCalledWith(1, 2);
    });
  });
});
