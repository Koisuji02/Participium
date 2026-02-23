import "reflect-metadata";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { NotificationRepository } from "../../../src/repositories/NotificationRepository";
import * as officerController from "../../../src/controllers/officerController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";

describe("Officer Controller Integration Tests", () => {
  let officerRepo: OfficerRepository;
  let reportRepo: ReportRepository;
  let userRepo: UserRepository;
  let notificationRepo: NotificationRepository;

  beforeAll(async () => {
    await initializeTestDatabase();
    officerRepo = new OfficerRepository();
    reportRepo = new ReportRepository();
    userRepo = new UserRepository();
    notificationRepo = new NotificationRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ===================== getAllOfficers =====================
  describe("getAllOfficers", () => {
    it("should return all officers with their roles", async () => {
      await officerRepo.createOfficer(
        "officer1",
        "Officer",
        "One",
        "officer1@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      await officerRepo.createOfficer(
        "officer2",
        "Officer",
        "Two",
        "officer2@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const officers = await officerController.getAllOfficers();

      expect(officers.length).toBe(2);
      expect(officers[0].roles).toBeDefined();
      expect(officers[1].roles).toBeDefined();
    });

    it("should return empty array when no officers exist", async () => {
      const officers = await officerController.getAllOfficers();
      expect(officers.length).toBe(0);
    });

    it("should return officers with multiple roles", async () => {
      await officerRepo.createOfficer(
        "multirole",
        "Multi",
        "Role",
        "multirole@example.com",
        "Password@123",
        [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      );

      const officers = await officerController.getAllOfficers();

      expect(officers.length).toBe(1);
      expect(officers[0].roles?.length).toBe(2);
    });
  });

  // ===================== getAllOfficersByOfficeType =====================
  describe("getAllOfficersByOfficeType", () => {
    it("should return officers for specific office type", async () => {
      await officerRepo.createOfficer(
        "infra1",
        "Infrastructure",
        "Officer",
        "infra1@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      await officerRepo.createOfficer(
        "env1",
        "Environment",
        "Officer",
        "env1@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }]
      );

      const officers = await officerController.getAllOfficersByOfficeType(OfficeType.ARCHITECTURAL_BARRIERS);

      expect(officers.length).toBe(1);
      expect(officers[0].roles?.[0]?.office).toBe(OfficeType.ARCHITECTURAL_BARRIERS);
    });

    it("should return empty array when no officers for office type", async () => {
      const officers = await officerController.getAllOfficersByOfficeType(OfficeType.ROADS_AND_URBAN_FURNISHINGS);
      expect(officers.length).toBe(0);
    });
  });

  // ===================== getOfficer =====================
  describe("getOfficer", () => {
    it("should return officer by email", async () => {
      await officerRepo.createOfficer(
        "testofficer",
        "Test",
        "Officer",
        "test@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const officer = await officerController.getOfficer("test@example.com");

      expect(officer).toBeDefined();
      expect(officer.email).toBe("test@example.com");
      expect(officer.name).toBe("Test");
    });

    it("should throw error when officer not found", async () => {
      await expect(officerController.getOfficer("nonexistent@example.com"))
        .rejects.toThrow("Officer with email 'nonexistent@example.com' not found");
    });
  });

  // ===================== createOfficer =====================
  describe("createOfficer", () => {
    it("should create officer with single role", async () => {
      const officerDto: any = {
        username: "newofficer",
        name: "New",
        surname: "Officer",
        email: "new@example.com",
        password: "Password@123",
        roles: [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      };

      const result = await officerController.createOfficer(officerDto);

      expect(result).toBeDefined();
      expect(result.email).toBe("new@example.com");
      expect(result.roles?.length).toBe(1);
    });

    it("should create officer with multiple roles", async () => {
      const officerDto: any = {
        username: "multiofficer",
        name: "Multi",
        surname: "Officer",
        email: "multi@example.com",
        password: "Password@123",
        roles: [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };

      const result = await officerController.createOfficer(officerDto);

      expect(result).toBeDefined();
      expect(result.roles?.length).toBe(2);
    });

    it("should throw error when no roles provided", async () => {
      const officerDto: any = {
        username: "noroles",
        name: "No",
        surname: "Roles",
        email: "noroles@example.com",
        password: "Password@123",
        roles: []
      };

      await expect(officerController.createOfficer(officerDto))
        .rejects.toThrow("At least one role is required to create an officer");
    });

    it("should throw error when email already exists", async () => {
      const officerDto: any = {
        username: "officer1",
        name: "Officer",
        surname: "One",
        email: "duplicate@example.com",
        password: "Password@123",
        roles: [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      };

      await officerController.createOfficer(officerDto);

      const officerDto2: any = {
        username: "officer2",
        name: "Officer",
        surname: "Two",
        email: "duplicate@example.com",
        password: "Password@123",
        roles: [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      };

      await expect(officerController.createOfficer(officerDto2))
        .rejects.toThrow("Officer with email 'duplicate@example.com' already exists");
    });
  });

  // ===================== updateOfficer =====================
  describe("updateOfficer", () => {
    it("should update officer details", async () => {
      const officer = await officerRepo.createOfficer(
        "updateme",
        "Old",
        "Name",
        "update@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const updateDto: any = {
        id: officer.id,
        username: "updated",
        name: "New",
        surname: "Name",
        email: "update@example.com",
        roles: [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      };

      const result = await officerController.updateOfficer(updateDto);

      expect(result.username).toBe("updated");
      expect(result.name).toBe("New");
    });

    it("should update officer roles", async () => {
      const officer = await officerRepo.createOfficer(
        "changerole",
        "Change",
        "Role",
        "changerole@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const updateDto: any = {
        id: officer.id,
        username: "changerole",
        name: "Change",
        surname: "Role",
        email: "changerole@example.com",
        roles: [
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      };

      const result = await officerController.updateOfficer(updateDto);

      expect(result.roles?.length).toBe(2);
    });
  });

  // ===================== addRoleToOfficer =====================
  describe("addRoleToOfficer", () => {
    it("should add new role to officer", async () => {
      const officer = await officerRepo.createOfficer(
        "addrole",
        "Add",
        "Role",
        "addrole@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const result = await officerController.addRoleToOfficer(
        officer.id,
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        OfficeType.ARCHITECTURAL_BARRIERS
      );

      expect(result.roles?.length).toBe(2);
    });

    it("should not add duplicate role", async () => {
      const officer = await officerRepo.createOfficer(
        "duprole",
        "Dup",
        "Role",
        "duprole@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const result = await officerController.addRoleToOfficer(
        officer.id,
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        OfficeType.ARCHITECTURAL_BARRIERS
      );

      expect(result.roles?.length).toBe(1);
    });
  });

  // ===================== removeRoleFromOfficer =====================
  describe("removeRoleFromOfficer", () => {
    it("should remove role from officer", async () => {
      const officer = await officerRepo.createOfficer(
        "removerole",
        "Remove",
        "Role",
        "removerole@example.com",
        "Password@123",
        [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      );

      const result = await officerController.removeRoleFromOfficer(
        officer.id,
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        OfficeType.ARCHITECTURAL_BARRIERS
      );

      expect(result.roles?.length).toBe(1);
      expect(result.roles?.[0]?.role).toBe(OfficerRole.MUNICIPAL_ADMINISTRATOR);
    });

    it("should reset reports when removing technical office staff role", async () => {
      const user = await userRepo.createUser("user1", "User", "One", "user1@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "techstaff",
        "Tech",
        "Staff",
        "techstaff@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const report = await reportRepo.createReport(
        "Test Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Test", Photos: ["/photo.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report.id, officer.id);

      await officerController.removeRoleFromOfficer(
        officer.id,
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        OfficeType.ARCHITECTURAL_BARRIERS
      );

      const updatedReport = await reportRepo.getReportById(report.id);
      expect(updatedReport.state).toBe(ReportState.PENDING);
      expect(updatedReport.assignedOfficerId).toBeNull();
    });
  });

  // ===================== assignReportToOfficer =====================
  describe("assignReportToOfficer", () => {
    it("should assign pending report to officer", async () => {
      const user = await userRepo.createUser("user2", "User", "Two", "user2@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "assignofficer",
        "Assign",
        "Officer",
        "assign@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const report = await reportRepo.createReport(
        "Assign Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Assign", Photos: ["/photo.jpg"] }
      );

      await officerController.assignReportToOfficer(report.id, officer.id);

      const updatedReport = await reportRepo.getReportById(report.id);
      expect(updatedReport.assignedOfficerId).toBe(officer.id);
      expect(updatedReport.state).toBe(ReportState.ASSIGNED);
    });

    it("should throw error when report is not pending", async () => {
      const user = await userRepo.createUser("user3", "User", "Three", "user3@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "officer3",
        "Officer",
        "Three",
        "officer3@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const report = await reportRepo.createReport(
        "Non-Pending Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Non-pending", Photos: ["/photo.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.RESOLVED);

      await expect(officerController.assignReportToOfficer(report.id, officer.id))
        .rejects.toThrow();
    });
  });

  // ===================== retrieveDocs =====================
  describe("retrieveDocs", () => {
    it("should retrieve all pending reports for officer", async () => {
      const user = await userRepo.createUser("user4", "User", "Four", "user4@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "retrieve",
        "Retrieve",
        "Officer",
        "retrieve@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      await reportRepo.createReport(
        "Pending Report 1",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Pending 1", Photos: ["/photo1.jpg"] }
      );

      await reportRepo.createReport(
        "Pending Report 2",
        { Coordinates: { latitude: 45.1, longitude: 7.1 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Pending 2", Photos: ["/photo2.jpg"] }
      );

      const reports = await officerController.retrieveDocs(officer.id);

      expect(reports.length).toBe(2);
      expect(reports.every(r => r.state === ReportState.PENDING)).toBe(true);
    });

    it("should return empty array when no pending reports", async () => {
      const officer = await officerRepo.createOfficer(
        "nopending",
        "No",
        "Pending",
        "nopending@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const reports = await officerController.retrieveDocs(officer.id);

      expect(reports.length).toBe(0);
    });
  });

  // ===================== getAssignedReports =====================
  describe("getAssignedReports", () => {
    it("should return reports assigned to officer", async () => {
      const user = await userRepo.createUser("user5", "User", "Five", "user5@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "assigned",
        "Assigned",
        "Officer",
        "assigned@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const report = await reportRepo.createReport(
        "Assigned Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Assigned", Photos: ["/photo.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report.id, officer.id);

      const reports = await officerController.getAssignedReports(officer.id);

      expect(reports.length).toBe(1);
      expect(reports[0].id).toBe(report.id);
    });
  });

  // ===================== reviewDoc =====================
  describe("reviewDoc", () => {
    it("should approve report and change state to ASSIGNED", async () => {
      const user = await userRepo.createUser("user6", "User", "Six", "user6@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "reviewer",
        "Reviewer",
        "Officer",
        "reviewer@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      );

      const report = await reportRepo.createReport(
        "Review Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Review", Photos: ["/photo.jpg"] }
      );

      const result = await officerController.reviewDoc(officer.id, report.id, ReportState.ASSIGNED);

      expect(result.state).toBe(ReportState.ASSIGNED);
    });

    it("should decline report with reason", async () => {
      const user = await userRepo.createUser("user7", "User", "Seven", "user7@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "decliner",
        "Decliner",
        "Officer",
        "decliner@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      );

      const report = await reportRepo.createReport(
        "Decline Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Decline", Photos: ["/photo.jpg"] }
      );

      const result = await officerController.reviewDoc(
        officer.id,
        report.id,
        ReportState.DECLINED,
        "Not valid"
      );

      expect(result.state).toBe(ReportState.DECLINED);
    });

    it("should throw error when report already resolved", async () => {
      const user = await userRepo.createUser("user9", "User", "Nine", "user9@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "officer9",
        "Officer",
        "Nine",
        "officer9@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      );

      const report = await reportRepo.createReport(
        "Resolved Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Resolved", Photos: ["/photo.jpg"] }
      );

      await reportRepo.updateReportState(report.id, ReportState.RESOLVED);

      await expect(officerController.reviewDoc(officer.id, report.id, ReportState.ASSIGNED))
        .rejects.toThrow();
    });
  });

  // ===================== deleteOfficer =====================
  describe("deleteOfficer", () => {
    it("should delete officer successfully", async () => {
      const officer = await officerRepo.createOfficer(
        "deleteme",
        "Delete",
        "Me",
        "deleteme@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      await officerController.deleteOfficer(officer.id);

      await expect(officerRepo.getOfficerById(officer.id))
        .rejects.toThrow(`Officer with id '${officer.id}' not found`);
    });

    it("should reset assigned reports when deleting technical office staff", async () => {
      const user = await userRepo.createUser("user10", "User", "Ten", "user10@example.com", "Password@123");
      
      const officer = await officerRepo.createOfficer(
        "deletetechstaff",
        "Delete",
        "TechStaff",
        "deletetechstaff@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const report = await reportRepo.createReport(
        "Delete Officer Report",
        { Coordinates: { latitude: 45.0, longitude: 7.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Delete", Photos: ["/photo.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report.id, officer.id);

      await officerController.deleteOfficer(officer.id);

      const updatedReport = await reportRepo.getReportById(report.id);
      expect(updatedReport.state).toBe(ReportState.PENDING);
      expect(updatedReport.assignedOfficerId).toBeNull();
    });
  });
});