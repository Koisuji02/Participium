import request from "supertest";
import express from "express";
import { maintainerRouter } from "../../../src/routes/MaintainerRoutes";
import * as maintainerController from "../../../src/controllers/maintainerController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";

// Mock middlewares
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: (req: any, res: any, next: any) => { 
    req.user = { id: 1, type: "officer", role: OfficerRole.MUNICIPAL_ADMINISTRATOR }; 
    next(); 
  },
  requireUserType: () => (req: any, res: any, next: any) => next(),
}));

// Mock controller
jest.mock("../../../src/controllers/maintainerController");

const app = express();
app.use(express.json());
app.use("/maintainers", maintainerRouter);

describe("MaintainerRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /maintainers/list", () => {
    
    it("should return all maintainers with status 200", async () => {
      const maintainersMock = [
        { id: 1, name: "Test Maintainer 1", email: "test1@example.com", categories: [OfficeType.ARCHITECTURAL_BARRIERS] },
        { id: 2, name: "Test Maintainer 2", email: "test2@example.com", categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS] }
      ];
      (maintainerController.getAllMaintainers as jest.Mock).mockResolvedValue(maintainersMock);

      const res = await request(app).get("/maintainers");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(maintainersMock);
      expect(maintainerController.getAllMaintainers).toHaveBeenCalled();
    });
    it("should return empty array if no maintainers exist", async () => {
      (maintainerController.getAllMaintainers as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/maintainers");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle controller errors", async () => {
      (maintainerController.getAllMaintainers as jest.Mock).mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/maintainers");

      expect(res.status).toBe(500);
    });
  });

  describe("GET /maintainers/by-category/:officeType", () => {
    it("should return maintainers by category", async () => {
      const maintainersMock = [
        { id: 1, name: "Infrastructure Maintainer", categories: [OfficeType.ARCHITECTURAL_BARRIERS] }
      ];
      (maintainerController.getMaintainersByCategory as jest.Mock).mockResolvedValue(maintainersMock);

      const res = await request(app).get(`/maintainers/by-category/${OfficeType.ARCHITECTURAL_BARRIERS}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(maintainersMock);
      expect(maintainerController.getMaintainersByCategory).toHaveBeenCalledWith(OfficeType.ARCHITECTURAL_BARRIERS);
    });

    it("should return maintainers for environment category", async () => {
      const maintainersMock = [
        { id: 2, name: "Environment Maintainer", categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS] }
      ];
      (maintainerController.getMaintainersByCategory as jest.Mock).mockResolvedValue(maintainersMock);

      const res = await request(app).get(`/maintainers/by-category/${OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(maintainersMock);
      expect(maintainerController.getMaintainersByCategory).toHaveBeenCalledWith(OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS);
    });

    it("should return empty array if no maintainers for category", async () => {
      (maintainerController.getMaintainersByCategory as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get(`/maintainers/by-category/${OfficeType.ROADS_AND_URBAN_FURNISHINGS}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle controller errors", async () => {
      (maintainerController.getMaintainersByCategory as jest.Mock).mockRejectedValue(new Error("Database error"));

      const res = await request(app).get(`/maintainers/by-category/${OfficeType.ARCHITECTURAL_BARRIERS}`);

      expect(res.status).toBe(500);
    });

    it("should handle all office type categories", async () => {
      const categories = [
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.WATER_SUPPLY,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.WASTE,
        OfficeType.OTHER
      ];

      for (const category of categories) {
        (maintainerController.getMaintainersByCategory as jest.Mock).mockResolvedValue([
          { id: 1, name: `${category} Maintainer`, categories: [category] }
        ]);

        const res = await request(app).get(`/maintainers/by-category/${category}`);

        expect(res.status).toBe(200);
        expect(maintainerController.getMaintainersByCategory).toHaveBeenCalledWith(category);
      }
    });
  });

  describe("GET /maintainers/assigned", () => {
    it("should return assigned reports for authenticated maintainer", async () => {
      const reportsMock = [
        { id: 10, state: ReportState.ASSIGNED, assignedMaintainerId: 1 },
        { id: 11, state: ReportState.IN_PROGRESS, assignedMaintainerId: 1 }
      ];
      (maintainerController.getAssignedReportsForMaintainer as jest.Mock).mockResolvedValue(reportsMock);

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer).get("/maintainers/assigned");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(reportsMock);
      expect(maintainerController.getAssignedReportsForMaintainer).toHaveBeenCalledWith(1);
    });

    it("should return 401 if user is not authenticated", async () => {
      // Salva il mock originale
      const originalMock = jest.requireMock("../../../src/middlewares/authMiddleware");
      
      // Crea un mock temporaneo che non imposta req.user
      jest.doMock("../../../src/middlewares/authMiddleware", () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          // Non imposta req.user per simulare mancata autenticazione
          next();
        },
        requireUserType: () => (req: any, res: any, next: any) => next(),
      }));

      // Ricarica il router con il nuovo mock
      jest.resetModules();
      const { maintainerRouter: testRouter } = require("../../../src/routes/MaintainerRoutes");

      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use("/maintainers", testRouter);

      const res = await request(appNoAuth).get("/maintainers/assigned");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");

      // Ripristina il mock originale
      jest.doMock("../../../src/middlewares/authMiddleware", () => originalMock);
      jest.resetModules();
    });

    it("should return 401 if user has no id", async () => {
      // Salva il mock originale
      const originalMock = jest.requireMock("../../../src/middlewares/authMiddleware");
      
      // Crea un mock temporaneo che imposta req.user senza id
      jest.doMock("../../../src/middlewares/authMiddleware", () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          // Imposta req.user ma senza id
          req.user = { type: "officer", role: OfficerRole.MAINTAINER };
          next();
        },
        requireUserType: () => (req: any, res: any, next: any) => next(),
      }));

      // Ricarica il router con il nuovo mock
      jest.resetModules();
      const { maintainerRouter: testRouter } = require("../../../src/routes/MaintainerRoutes");

      const appNoUserId = express();
      appNoUserId.use(express.json());
      appNoUserId.use("/maintainers", testRouter);

      const res = await request(appNoUserId).get("/maintainers/assigned");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");

      // Ripristina il mock originale
      jest.doMock("../../../src/middlewares/authMiddleware", () => originalMock);
      jest.resetModules();
    });

    it("should return empty array if no reports assigned", async () => {
      (maintainerController.getAssignedReportsForMaintainer as jest.Mock).mockResolvedValue([]);

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer).get("/maintainers/assigned");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle controller errors", async () => {
      (maintainerController.getAssignedReportsForMaintainer as jest.Mock).mockRejectedValue(new Error("Database error"));

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer).get("/maintainers/assigned");

      expect(res.status).toBe(500);
    });

    it("should work with different maintainer ids", async () => {
      const reportsMock = [
        { id: 20, state: ReportState.ASSIGNED, assignedMaintainerId: 5 }
      ];
      (maintainerController.getAssignedReportsForMaintainer as jest.Mock).mockResolvedValue(reportsMock);

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 5, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer).get("/maintainers/assigned");

      expect(res.status).toBe(200);
      expect(maintainerController.getAssignedReportsForMaintainer).toHaveBeenCalledWith(1);
    });
  });

  describe("PATCH /maintainers/reports/:id/status", () => {
    it("should update report status to IN_PROGRESS and return 200", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockResolvedValue({ 
        id: 10, 
        state: ReportState.IN_PROGRESS 
      });

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 10, state: ReportState.IN_PROGRESS });
      expect(maintainerController.updateReportStatusByMaintainer).toHaveBeenCalledWith(1, 10, ReportState.IN_PROGRESS, undefined);
    });

    it("should update report status to SUSPENDED with reason", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockResolvedValue({ 
        id: 10, 
        state: ReportState.SUSPENDED,
        reason: "Waiting for parts"
      });

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.SUSPENDED, reason: "Waiting for parts" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 10, state: ReportState.SUSPENDED });
      expect(maintainerController.updateReportStatusByMaintainer).toHaveBeenCalledWith(1, 10, ReportState.SUSPENDED, "Waiting for parts");
    });

    it("should update report status to RESOLVED", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockResolvedValue({ 
        id: 10, 
        state: ReportState.RESOLVED
      });

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.RESOLVED });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 10, state: ReportState.RESOLVED });
      expect(maintainerController.updateReportStatusByMaintainer).toHaveBeenCalledWith(1, 10, ReportState.RESOLVED, undefined);
    });

    it("should return 401 if user is not authenticated", async () => {
      // Salva il mock originale
      const originalMock = jest.requireMock("../../../src/middlewares/authMiddleware");
      
      // Crea un mock temporaneo che non imposta req.user
      jest.doMock("../../../src/middlewares/authMiddleware", () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          // Non imposta req.user per simulare mancata autenticazione
          next();
        },
        requireUserType: () => (req: any, res: any, next: any) => next(),
      }));

      // Ricarica il router con il nuovo mock
      jest.resetModules();
      const { maintainerRouter: testRouter } = require("../../../src/routes/MaintainerRoutes");

      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use("/maintainers", testRouter);

      const res = await request(appNoAuth)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");

      // Ripristina il mock originale
      jest.doMock("../../../src/middlewares/authMiddleware", () => originalMock);
      jest.resetModules();
    });

    it("should return 401 if user has no id", async () => {
      // Salva il mock originale
      const originalMock = jest.requireMock("../../../src/middlewares/authMiddleware");
      
      // Crea un mock temporaneo che imposta req.user senza id
      jest.doMock("../../../src/middlewares/authMiddleware", () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          // Imposta req.user ma senza id
          req.user = { type: "officer", role: OfficerRole.MAINTAINER };
          next();
        },
        requireUserType: () => (req: any, res: any, next: any) => next(),
      }));

      // Ricarica il router con il nuovo mock
      jest.resetModules();
      const { maintainerRouter: testRouter } = require("../../../src/routes/MaintainerRoutes");

      const appNoUserId = express();
      appNoUserId.use(express.json());
      appNoUserId.use("/maintainers", testRouter);

      const res = await request(appNoUserId)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");

      // Ripristina il mock originale
      jest.doMock("../../../src/middlewares/authMiddleware", () => originalMock);
      jest.resetModules();
    });

    it("should return 400 if state is missing", async () => {
      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "state is required");
    });

    it("should return 400 if state is null", async () => {
      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({ state: null });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "state is required");
    });

    it("should handle controller errors", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockRejectedValue(new Error("Cannot update report"));

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/10/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(res.status).toBe(500);
    });

    it("should handle invalid reportId (NaN)", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockResolvedValue({ 
        id: NaN, 
        state: ReportState.IN_PROGRESS 
      });

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 1, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/invalid/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(maintainerController.updateReportStatusByMaintainer).toHaveBeenCalledWith(1, NaN, ReportState.IN_PROGRESS, undefined);
    });

    it("should work with different report ids", async () => {
      (maintainerController.updateReportStatusByMaintainer as jest.Mock).mockResolvedValue({ 
        id: 999, 
        state: ReportState.IN_PROGRESS 
      });

      const appWithMaintainer = express();
      appWithMaintainer.use(express.json());
      appWithMaintainer.use("/maintainers", (req: any, res: any, next: any) => {
        req.user = { id: 2, type: "officer", role: OfficerRole.MAINTAINER };
        next();
      }, maintainerRouter);

      const res = await request(appWithMaintainer)
        .patch("/maintainers/reports/999/status")
        .send({ state: ReportState.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(maintainerController.updateReportStatusByMaintainer).toHaveBeenCalledWith(1, 999, ReportState.IN_PROGRESS, undefined);
    });
  });

  describe("DELETE /maintainers/:id", () => {
    it("should delete maintainer and return 200", async () => {
      (maintainerController.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/maintainers/1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Maintainer with id '1' deleted successfully" });
      expect(maintainerController.deleteMaintainer).toHaveBeenCalledWith(1);
    });

    it("should return 400 if id is 0", async () => {
      const res = await request(app).delete("/maintainers/0");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "id is required");
      expect(maintainerController.deleteMaintainer).not.toHaveBeenCalled();
    });

    it("should return 400 if id is NaN", async () => {
      const res = await request(app).delete("/maintainers/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "id is required");
      expect(maintainerController.deleteMaintainer).not.toHaveBeenCalled();
    });

    it("should handle controller errors", async () => {
      (maintainerController.deleteMaintainer as jest.Mock).mockRejectedValue(new Error("Cannot delete maintainer"));

      const res = await request(app).delete("/maintainers/1");

      expect(res.status).toBe(500);
    });

    it("should delete maintainer with valid numeric id", async () => {
      (maintainerController.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/maintainers/999");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Maintainer with id '999' deleted successfully" });
      expect(maintainerController.deleteMaintainer).toHaveBeenCalledWith(999);
    });

    it("should delete maintainer with large id", async () => {
      (maintainerController.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/maintainers/999999");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Maintainer with id '999999' deleted successfully" });
      expect(maintainerController.deleteMaintainer).toHaveBeenCalledWith(999999);
    });
  });
});