import request from "supertest";
import express from "express";
import { officerRouter } from "../../../src/routes/OfficerRoutes";
import * as officerController from "../../../src/controllers/officerController";
import * as maintainerController from "../../../src/controllers/maintainerController";
import { authenticateToken, requireUserType } from "../../../src/middlewares/authMiddleware";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";

jest.mock("../../../src/controllers/officerController");
jest.mock("../../../src/controllers/maintainerController");
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
jest.mock("@dto/Officer", () => ({
  OfficerFromJSON: jest.fn((data) => data),
  OfficerToJSON: jest.fn((data) => data)
}));

const app = express();
app.use(express.json());
app.use("/officers", officerRouter);

// Add error middleware
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500).json({ error: err.message });
});

describe("OfficerRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================== GET /officers/assigned =====================
  describe("GET /officers/assigned", () => {
    it("should return all assigned reports for the authenticated officer", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED },
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS }
      ];
      (officerController.getAssignedReports as jest.Mock).mockResolvedValue(mockReports);

      const res = await request(app).get("/officers/assigned");

      expect(officerController.getAssignedReports).toHaveBeenCalledWith(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReports);
    });

    it("should return empty array when officer has no assigned reports", async () => {
      (officerController.getAssignedReports as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/officers/assigned");

      expect(officerController.getAssignedReports).toHaveBeenCalledWith(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle errors in getAssignedReports", async () => {
      (officerController.getAssignedReports as jest.Mock).mockRejectedValue(
        new Error("Failed to retrieve reports")
      );

      const res = await request(app).get("/officers/assigned");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle database errors gracefully", async () => {
      (officerController.getAssignedReports as jest.Mock).mockRejectedValue(
        new Error("Database connection error")
      );

      const res = await request(app).get("/officers/assigned");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===================== GET /officers/OfficerByOfficeType/:officeType =====================
  describe("GET /officers/OfficerByOfficeType/:officeType", () => {
    it("should return officers filtered by office type", async () => {
      const mockOfficers = [
        { id: 1, username: "officer1", roles: [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }] },
        { id: 2, username: "officer2", roles: [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }] }
      ];
      (officerController.getAllOfficersByOfficeType as jest.Mock).mockResolvedValue(mockOfficers);

      const res = await request(app).get("/officers/OfficerByOfficeType/INFRASTRUCTURE");

      expect(officerController.getAllOfficersByOfficeType).toHaveBeenCalledWith("INFRASTRUCTURE");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOfficers);
    });

    it("should return empty array when no officers match office type", async () => {
      (officerController.getAllOfficersByOfficeType as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/officers/OfficerByOfficeType/ENVIRONMENT");

      expect(officerController.getAllOfficersByOfficeType).toHaveBeenCalledWith("ENVIRONMENT");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle all valid office types", async () => {
      const officeTypes = [
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.WATER_SUPPLY,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.WASTE
      ];

      for (const officeType of officeTypes) {
        (officerController.getAllOfficersByOfficeType as jest.Mock).mockResolvedValue([
          { id: 1, username: "officer1" }
        ]);

        const res = await request(app).get(`/officers/OfficerByOfficeType/${officeType}`);

        expect(officerController.getAllOfficersByOfficeType).toHaveBeenCalledWith(officeType);
        expect(res.status).toBe(200);
      }
    });

    it("should handle errors in getAllOfficersByOfficeType", async () => {
      (officerController.getAllOfficersByOfficeType as jest.Mock).mockRejectedValue(
        new Error("Failed to retrieve officers")
      );

      const res = await request(app).get("/officers/OfficerByOfficeType/INFRASTRUCTURE");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle invalid office type gracefully", async () => {
      (officerController.getAllOfficersByOfficeType as jest.Mock).mockRejectedValue(
        new Error("Invalid office type")
      );

      const res = await request(app).get("/officers/OfficerByOfficeType/INVALID_TYPE");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===================== PATCH /officers/reviewdocs/:id =====================
  describe("PATCH /officers/reviewdocs/:id", () => {
    it("should review document and update state to ASSIGNED", async () => {
      const mockReport = { 
        id: 1, 
        title: "Test Report", 
        state: ReportState.ASSIGNED 
      };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ state: ReportState.ASSIGNED });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1, 
        1, 
        ReportState.ASSIGNED, 
        undefined
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should review document and update state to DECLINED with reason", async () => {
      const mockReport = { 
        id: 1, 
        title: "Test Report", 
        state: ReportState.DECLINED,
        reason: "Inappropriate content"
      };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ 
          state: ReportState.DECLINED, 
          reason: "Inappropriate content" 
        });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1, 
        1, 
        ReportState.DECLINED, 
        "Inappropriate content"
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should handle state change to IN_PROGRESS", async () => {
      const mockReport = { 
        id: 2, 
        title: "Work in Progress", 
        state: ReportState.IN_PROGRESS 
      };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/2")
        .send({ state: ReportState.IN_PROGRESS });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1, 
        2, 
        ReportState.IN_PROGRESS, 
        undefined
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should handle state change to RESOLVED", async () => {
      const mockReport = { 
        id: 3, 
        title: "Resolved Report", 
        state: ReportState.RESOLVED 
      };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/3")
        .send({ state: ReportState.RESOLVED });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1, 
        3, 
        ReportState.RESOLVED, 
        undefined
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should handle state change to SUSPENDED with reason", async () => {
      const mockReport = { 
        id: 4, 
        title: "Suspended Report", 
        state: ReportState.SUSPENDED,
        reason: "Waiting for additional information"
      };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/4")
        .send({ 
          state: ReportState.SUSPENDED, 
          reason: "Waiting for additional information" 
        });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1, 
        4, 
        ReportState.SUSPENDED, 
        "Waiting for additional information"
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should handle non-existent report ID", async () => {
      (officerController.reviewDoc as jest.Mock).mockRejectedValue(
        new Error("Report not found")
      );

      const res = await request(app)
        .patch("/officers/reviewdocs/99999")
        .send({ state: ReportState.ASSIGNED });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle unauthorized review (report not assigned to officer)", async () => {
      (officerController.reviewDoc as jest.Mock).mockRejectedValue(
        new Error("You can only review reports assigned to you")
      );

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ state: ReportState.ASSIGNED });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toContain("review reports assigned to you");
    });

    it("should handle already reviewed report", async () => {
      const error = new Error(JSON.stringify({
        message: "Report with id '1' is already in state 'RESOLVED' and cannot be reviewed again.",
        status: 400
      }));
      (officerController.reviewDoc as jest.Mock).mockRejectedValue(error);

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ state: ReportState.ASSIGNED });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle invalid state value", async () => {
      (officerController.reviewDoc as jest.Mock).mockRejectedValue(
        new Error("Invalid state")
      );

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ state: "INVALID_STATE" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle missing state in request body", async () => {
      (officerController.reviewDoc as jest.Mock).mockResolvedValue({
        id: 1,
        state: undefined
      });

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({});

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        undefined
      );
      expect(res.status).toBe(200);
    });

    it("should handle reason without state", async () => {
      const mockReport = { id: 1, state: ReportState.PENDING };
      (officerController.reviewDoc as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app)
        .patch("/officers/reviewdocs/1")
        .send({ reason: "Some reason" });

      expect(officerController.reviewDoc).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        "Some reason"
      );
      expect(res.status).toBe(200);
    });
  });

  // ===================== POST /officers/assign-report =====================
  describe("POST /officers/assign-report", () => {
    it("should assign report to maintainer successfully", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1, maintainerId: 5 });

      expect(maintainerController.assignReportToMaintainer).toHaveBeenCalledWith(1, 5);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report assigned to maintainer" });
    });

    it("should handle reportId as string and convert to number", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: "10", maintainerId: "20" });

      expect(maintainerController.assignReportToMaintainer).toHaveBeenCalledWith(10, 20);
      expect(res.status).toBe(200);
    });

    it("should handle missing reportId", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Report ID is required")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ maintainerId: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle missing maintainerId", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Maintainer ID is required")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle non-existent report", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Report not found")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 99999, maintainerId: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should handle non-existent maintainer", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Maintainer not found")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1, maintainerId: 99999 });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toContain("Maintainer not found");
    });

    it("should handle report not in ASSIGNED state", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Only ASSIGNED reports can be assigned")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1, maintainerId: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toContain("ASSIGNED reports");
    });

    it("should handle invalid reportId (NaN)", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Invalid report ID")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: "invalid", maintainerId: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle invalid maintainerId (NaN)", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Invalid maintainer ID")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1, maintainerId: "invalid" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle empty request body", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Missing required fields")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle negative reportId", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: -1, maintainerId: 5 });

      expect(maintainerController.assignReportToMaintainer).toHaveBeenCalledWith(-1, 5);
      // Il controller dovrebbe gestire l'errore
      expect(res.status).toBeLessThanOrEqual(500);
    });

    it("should handle zero reportId", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 0, maintainerId: 5 });

      expect(maintainerController.assignReportToMaintainer).toHaveBeenCalledWith(0, 5);
      expect(res.status).toBeLessThanOrEqual(500);
    });

    it("should handle database errors during assignment", async () => {
      (maintainerController.assignReportToMaintainer as jest.Mock).mockRejectedValue(
        new Error("Database connection error")
      );

      const res = await request(app)
        .post("/officers/assign-report")
        .send({ reportId: 1, maintainerId: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ===================== Edge Cases and Security =====================
  describe("Edge Cases and Security", () => {
    it("should handle very large report IDs", async () => {
      (officerController.reviewDoc as jest.Mock).mockResolvedValue({
        id: Number.MAX_SAFE_INTEGER,
        state: ReportState.ASSIGNED
      });

      const res = await request(app)
        .patch(`/officers/reviewdocs/${Number.MAX_SAFE_INTEGER}`)
        .send({ state: ReportState.ASSIGNED });

      expect(res.status).toBeLessThanOrEqual(500);
    });

    it("should handle special characters in officeType parameter", async () => {
      (officerController.getAllOfficersByOfficeType as jest.Mock).mockRejectedValue(
        new Error("Invalid office type")
      );

      const res = await request(app).get("/officers/OfficerByOfficeType/<script>alert('xss')</script>");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle concurrent requests to reviewdocs", async () => {
      (officerController.reviewDoc as jest.Mock).mockResolvedValue({
        id: 1,
        state: ReportState.ASSIGNED
      });

      const requests = [
        request(app).patch("/officers/reviewdocs/1").send({ state: ReportState.ASSIGNED }),
        request(app).patch("/officers/reviewdocs/1").send({ state: ReportState.DECLINED }),
        request(app).patch("/officers/reviewdocs/1").send({ state: ReportState.IN_PROGRESS })
      ];

      const responses = await Promise.all(requests);

      responses.forEach(res => {
        expect(res.status).toBeLessThanOrEqual(500);
      });
    });

    it("should handle malformed JSON in request body", async () => {
      const res = await request(app)
        .post("/officers/assign-report")
        .set("Content-Type", "application/json")
        .send("{ invalid json }");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});