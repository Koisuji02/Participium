import request from "supertest";
import express from "express";
import { AdminRouter } from "../../../src/routes/AdminRoutes";
import { officerRouter } from "../../../src/routes/OfficerRoutes";
import { maintainerRouter } from "../../../src/routes/MaintainerRoutes";
import * as officerController from "../../../src/controllers/officerController";
import * as maintainerController from "../../../src/controllers/maintainerController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";

// Mock middlewares
jest.mock("../../../src/middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1, type: "officer", role: OfficerRole.MUNICIPAL_ADMINISTRATOR };
    next();
  }),
  requireUserType: () => (req: any, res: any, next: any) => next(),
}));

// Mock controllers
jest.mock("../../../src/controllers/officerController");
jest.mock("../../../src/controllers/maintainerController");

// Mock DTO converters
jest.mock("@dto/Officer", () => ({
  OfficerFromJSON: jest.fn((data) => data),
  OfficerToJSON: jest.fn((data) => data)
}));

const app = express();
app.use(express.json());

app.use("/officers", officerRouter);
app.use("/admin", AdminRouter);
app.use("/maintainers", maintainerRouter);

describe("AdminRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /officers", () => {
  
    it("should create a new officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officer1",
        name: "Officer",
        surname: "One",
        email: "officer@example.com"
      };
      (officerController.createOfficer as jest.Mock).mockResolvedValue(mockOfficer);

      const res = await request(app)
        .post("/officers")
        .send({
          username: "officer1",
          name: "Officer",
          surname: "One",
          email: "officer@example.com",
          password: "password123"
        });

      expect(res.status).toBe(200);
      expect(officerController.createOfficer).toHaveBeenCalled();
      expect(res.body).toEqual(mockOfficer);
    });
    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/officers")
        .send({
          username: "officer1",
          name: "Officer",
          surname: "One",
          password: "password123"
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "email is required" });
    });


    it("should handle errors from controller", async () => {
      (officerController.createOfficer as jest.Mock).mockRejectedValue(new Error("Create error"));

      const res = await request(app)
        .post("/admin")
        .send({
          username: "officer1",
          name: "Officer",
          surname: "One",
          email: "officer@example.com",
          password: "password123"
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /officers", () => {
    
    it("should return all officers", async () => {
      const mockOfficers = [
        { id: 1, username: "officer1", email: "officer1@example.com" },
        { id: 2, username: "officer2", email: "officer2@example.com" }
      ];
      (officerController.getAllOfficers as jest.Mock).mockResolvedValue(mockOfficers);

      const res = await request(app).get("/officers");

      expect(res.status).toBe(200);
      expect(officerController.getAllOfficers).toHaveBeenCalled();
      expect(res.body).toEqual(mockOfficers);
    });
    

    it("should handle errors from controller", async () => {
      (officerController.getAllOfficers as jest.Mock).mockRejectedValue(new Error("Get all error"));

      const res = await request(app).get("/officers");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /officers", () => {
    
    it("should update an officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officer1",
        name: "Updated",
        surname: "Officer",
        email: "officer@example.com"
      };
      (officerController.updateOfficer as jest.Mock).mockResolvedValue(mockOfficer);

      const res = await request(app)
        .patch("/officers/1")
        .send({
          id: 1,
          name: "Updated"
        });

      expect(res.status).toBe(200);
      expect(officerController.updateOfficer).toHaveBeenCalled();
      expect(res.body).toEqual(mockOfficer);
    });

    it("should handle errors from controller", async () => {
      (officerController.updateOfficer as jest.Mock).mockRejectedValue(new Error("Update error"));

      const res = await request(app)
        .patch("/admin")
        .send({ id: 1, name: "Updated" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /admin/role/add", () => {
    it("should add a role to an officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officer1",
        roles: [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      };
      (officerController.addRoleToOfficer as jest.Mock).mockResolvedValue(mockOfficer);

      const res = await request(app)
        .patch("/admin/role/add")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(200);
      expect(officerController.addRoleToOfficer).toHaveBeenCalledWith(1, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficeType.ARCHITECTURAL_BARRIERS);
      expect(res.body).toEqual(mockOfficer);
    });

    it("should return 400 if officerId is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/add")
        .send({
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should return 400 if role is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/add")
        .send({
          officerId: 1,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should return 400 if officeType is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/add")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should handle errors from controller", async () => {
      (officerController.addRoleToOfficer as jest.Mock).mockRejectedValue(new Error("Add role error"));

      const res = await request(app)
        .patch("/admin/role/add")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /admin/role/remove", () => {
    it("should remove a role from an officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officer1",
        roles: []
      };
      (officerController.removeRoleFromOfficer as jest.Mock).mockResolvedValue(mockOfficer);

      const res = await request(app)
        .patch("/admin/role/remove")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(200);
      expect(officerController.removeRoleFromOfficer).toHaveBeenCalledWith(1, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficeType.ARCHITECTURAL_BARRIERS);
      expect(res.body).toEqual(mockOfficer);
    });

    it("should return 400 if officerId is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/remove")
        .send({
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should return 400 if role is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/remove")
        .send({
          officerId: 1,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should return 400 if officeType is missing", async () => {
      const res = await request(app)
        .patch("/admin/role/remove")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "officerId, role and officeType are required" });
    });

    it("should handle errors from controller", async () => {
      (officerController.removeRoleFromOfficer as jest.Mock).mockRejectedValue(new Error("Remove role error"));

      const res = await request(app)
        .patch("/admin/role/remove")
        .send({
          officerId: 1,
          role: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("DELETE /officers/:id", () => {
    
    it("should delete an officer", async () => {
      (officerController.deleteOfficer as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete("/officers/1");

      expect(res.status).toBe(200);
      expect(officerController.deleteOfficer).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ message: "Officer with id '1' deleted successfully" });
    });
    it("should return 400 if id is invalid", async () => {
      const res = await request(app).delete("/officers/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id is required" });
    });


    it("should handle errors from controller", async () => {
      (officerController.deleteOfficer as jest.Mock).mockRejectedValue(new Error("Delete error"));

      const res = await request(app).delete("/officers/1");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /maintainers", () => {
    
    it("should create a new maintainer", async () => {
      const mockMaintainer = {
        id: 1,
        name: "Maintainer One",
        email: "maintainer@example.com",
        categories: [OfficeType.ARCHITECTURAL_BARRIERS],
        active: true
      };
      (maintainerController.createMaintainer as jest.Mock).mockResolvedValue(mockMaintainer);

      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          email: "maintainer@example.com",
          password: "password123",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS],
          active: true
        });

      expect(res.status).toBe(200);
      expect(maintainerController.createMaintainer).toHaveBeenCalledWith(
        "Maintainer One",
        "maintainer@example.com",
        "password123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );
      expect(res.body).toEqual(mockMaintainer);
    });

    it("should return 400 if name is missing", async () => {
      const res = await request(app)
        .post("/maintainers")
        .send({
          email: "maintainer@example.com",
          password: "password123",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS]
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "name, email, password, categories are required" });
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          password: "password123",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS]
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "name, email, password, categories are required" });
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          email: "maintainer@example.com",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS]
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "name, email, password, categories are required" });
    });

    it("should return 400 if categories is missing", async () => {
      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          email: "maintainer@example.com",
          password: "password123"
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "name, email, password, categories are required" });
    });

    it("should default active to true if not provided", async () => {
      const mockMaintainer = {
        id: 1,
        name: "Maintainer One",
        email: "maintainer@example.com",
        categories: [OfficeType.ARCHITECTURAL_BARRIERS],
        active: true
      };
      (maintainerController.createMaintainer as jest.Mock).mockResolvedValue(mockMaintainer);

      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          email: "maintainer@example.com",
          password: "password123",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS]
        });

      expect(res.status).toBe(200);
      expect(maintainerController.createMaintainer).toHaveBeenCalledWith(
        "Maintainer One",
        "maintainer@example.com",
        "password123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );
    });

    
    it("should handle errors from controller", async () => {
      (maintainerController.createMaintainer as jest.Mock).mockRejectedValue(new Error("Create maintainer error"));

      const res = await request(app)
        .post("/maintainers")
        .send({
          name: "Maintainer One",
          email: "maintainer@example.com",
          password: "password123",
          categories: [OfficeType.ARCHITECTURAL_BARRIERS]
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /maintainers/:id", () => {
    
    it("should update a maintainer", async () => {
      const mockMaintainer = {
        id: 1,
        name: "Updated Maintainer",
        email: "maintainer@example.com",
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS],
        active: false
      };
      (maintainerController.updateMaintainer as jest.Mock).mockResolvedValue(mockMaintainer);

      const res = await request(app)
        .patch("/maintainers/1")
        .send({
          name: "Updated Maintainer",
          categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS],
          active: false
        });

      expect(res.status).toBe(200);
      expect(maintainerController.updateMaintainer).toHaveBeenCalledWith(1, {
        name: "Updated Maintainer",
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS],
        active: false
      });
      expect(res.body).toEqual(mockMaintainer);
    });

    it("should handle errors from controller", async () => {
      (maintainerController.updateMaintainer as jest.Mock).mockRejectedValue(new Error("Update maintainer error"));

      const res = await request(app)
        .patch("/maintainers/1")
        .send({ name: "Updated Maintainer" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});