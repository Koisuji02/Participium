import "reflect-metadata";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { NotificationRepository } from "../../../src/repositories/NotificationRepository";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";
import * as maintainerController from "../../../src/controllers/maintainerController";
import * as mapperService from "../../../src/services/mapperService";

// Mock delle repository
jest.mock("../../../src/repositories/MaintainerRepository");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/NotificationRepository");
jest.mock("../../../src/services/mapperService");

describe("MaintainerController Integration", () => {
  const maintainerMock = {
    id: 1,
    name: "Test Maintainer",
    email: "test@example.com",
    password: "hashedPassword",
    categories: [OfficeType.ARCHITECTURAL_BARRIERS],
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================== createMaintainer =====================
  describe("createMaintainer", () => {
    it("should create a new maintainer with all fields", async () => {
      (MaintainerRepository.prototype.createMaintainer as jest.Mock).mockResolvedValue(maintainerMock);

      const result = await maintainerController.createMaintainer(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        maintainerMock.categories,
        maintainerMock.active
      );

      expect(MaintainerRepository.prototype.createMaintainer).toHaveBeenCalledWith(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        maintainerMock.categories,
        maintainerMock.active
      );
      expect(result).toEqual(maintainerMock);
    });

    it("should create maintainer with default active=true", async () => {
      const activeMaintainer = { ...maintainerMock, active: true };
      (MaintainerRepository.prototype.createMaintainer as jest.Mock).mockResolvedValue(activeMaintainer);

      const result = await maintainerController.createMaintainer(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        maintainerMock.categories
      );

      expect(MaintainerRepository.prototype.createMaintainer).toHaveBeenCalledWith(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        maintainerMock.categories,
        true
      );
      expect(result.active).toBe(true);
    });

    it("should create inactive maintainer", async () => {
      const inactiveMaintainer = { ...maintainerMock, active: false };
      (MaintainerRepository.prototype.createMaintainer as jest.Mock).mockResolvedValue(inactiveMaintainer);

      const result = await maintainerController.createMaintainer(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        maintainerMock.categories,
        false
      );

      expect(result.active).toBe(false);
    });

    it("should create maintainer with multiple categories", async () => {
      const multiCategoryMaintainer = {
        ...maintainerMock,
        categories: [OfficeType.ARCHITECTURAL_BARRIERS, OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS],
      };
      (MaintainerRepository.prototype.createMaintainer as jest.Mock).mockResolvedValue(multiCategoryMaintainer);

      const result = await maintainerController.createMaintainer(
        maintainerMock.name,
        maintainerMock.email,
        "plainPassword",
        [OfficeType.ARCHITECTURAL_BARRIERS, OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS],
        true
      );

      expect(result.categories).toHaveLength(3);
    });
  });

  // ===================== getMaintainersByCategory =====================
  describe("getMaintainersByCategory", () => {
    it("should return maintainers for a specific category", async () => {
      (MaintainerRepository.prototype.getMaintainersByCategory as jest.Mock).mockResolvedValue([maintainerMock]);

      const result = await maintainerController.getMaintainersByCategory(OfficeType.ARCHITECTURAL_BARRIERS);

      expect(MaintainerRepository.prototype.getMaintainersByCategory).toHaveBeenCalledWith(OfficeType.ARCHITECTURAL_BARRIERS);
      expect(result).toEqual([maintainerMock]);
    });

    it("should return empty array if no maintainers for category", async () => {
      (MaintainerRepository.prototype.getMaintainersByCategory as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getMaintainersByCategory(OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS);

      expect(result).toEqual([]);
    });

    it("should work with all office types", async () => {
      const officeTypes = [
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.WATER_SUPPLY,
        OfficeType.WASTE,
        OfficeType.OTHER,
      ];

      for (const officeType of officeTypes) {
        (MaintainerRepository.prototype.getMaintainersByCategory as jest.Mock).mockResolvedValue([maintainerMock]);

        const result = await maintainerController.getMaintainersByCategory(officeType);

        expect(MaintainerRepository.prototype.getMaintainersByCategory).toHaveBeenCalledWith(officeType);
        expect(result).toEqual([maintainerMock]);
      }
    });
  });

  // ===================== getAllMaintainers =====================
  describe("getAllMaintainers", () => {
    it("should return all maintainers", async () => {
      const maintainersMock = [maintainerMock, { ...maintainerMock, id: 2, email: "test2@example.com" }];
      (MaintainerRepository.prototype.getAllMaintainers as jest.Mock).mockResolvedValue(maintainersMock);

      const result = await maintainerController.getAllMaintainers();

      expect(MaintainerRepository.prototype.getAllMaintainers).toHaveBeenCalled();
      expect(result).toEqual(maintainersMock);
      expect(result).toHaveLength(2);
    });

    it("should return empty array if no maintainers", async () => {
      (MaintainerRepository.prototype.getAllMaintainers as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getAllMaintainers();

      expect(result).toEqual([]);
    });
  });

  // ===================== getMaintainerById =====================
  describe("getMaintainerById", () => {
    it("should return maintainer by id", async () => {
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(maintainerMock);

      const result = await maintainerController.getMaintainerById(1);

      expect(MaintainerRepository.prototype.getMaintainerById).toHaveBeenCalledWith(1);
      expect(result).toEqual(maintainerMock);
    });

    it("should handle non-existent maintainer", async () => {
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(null);

      const result = await maintainerController.getMaintainerById(999);

      expect(result).toBeNull();
    });
  });

  // ===================== getMaintainerByEmail =====================
  describe("getMaintainerByEmail", () => {
    it("should return maintainer by email", async () => {
      (MaintainerRepository.prototype.getMaintainerByEmail as jest.Mock).mockResolvedValue(maintainerMock);

      const result = await maintainerController.getMaintainerByEmail("test@example.com");

      expect(MaintainerRepository.prototype.getMaintainerByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toEqual(maintainerMock);
    });

    it("should handle non-existent email", async () => {
      (MaintainerRepository.prototype.getMaintainerByEmail as jest.Mock).mockResolvedValue(null);

      const result = await maintainerController.getMaintainerByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  // ===================== updateMaintainer =====================
  describe("updateMaintainer", () => {
    it("should update maintainer name", async () => {
      const updatedMaintainer = { ...maintainerMock, name: "Updated Name" };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, { name: "Updated Name" });

      expect(MaintainerRepository.prototype.updateMaintainer).toHaveBeenCalledWith(1, { name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
    });

    it("should update maintainer email", async () => {
      const updatedMaintainer = { ...maintainerMock, email: "newemail@example.com" };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, { email: "newemail@example.com" });

      expect(result.email).toBe("newemail@example.com");
    });

    it("should update maintainer categories", async () => {
      const updatedMaintainer = { ...maintainerMock, categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS] };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, {
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS],
      });

      expect(result.categories).toEqual([OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS]);
    });

    it("should update maintainer active status", async () => {
      const updatedMaintainer = { ...maintainerMock, active: false };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, { active: false });

      expect(result.active).toBe(false);
    });

    it("should update multiple fields at once", async () => {
      const updatedMaintainer = {
        ...maintainerMock,
        name: "New Name",
        email: "new@example.com",
        active: false,
      };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, {
        name: "New Name",
        email: "new@example.com",
        active: false,
      });

      expect(result.name).toBe("New Name");
      expect(result.email).toBe("new@example.com");
      expect(result.active).toBe(false);
    });
  });

  // ===================== assignReportToMaintainer =====================
  describe("assignReportToMaintainer", () => {
    it("should assign report to maintainer successfully", async () => {
      const reportMock = { id: 10, state: ReportState.ASSIGNED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(maintainerMock);
      (ReportRepository.prototype.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.assignReportToMaintainer(10, 1);

      expect(ReportRepository.prototype.getReportById).toHaveBeenCalledWith(10);
      expect(MaintainerRepository.prototype.getMaintainerById).toHaveBeenCalledWith(1);
      expect(ReportRepository.prototype.assignReportToMaintainer).toHaveBeenCalledWith(10, 1);
    });

    it("should throw error if report is DECLINED", async () => {
      const reportMock = { id: 10, state: ReportState.DECLINED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(maintainerController.assignReportToMaintainer(10, 1)).rejects.toThrow(
        "Cannot assign resolved or declined reports"
      );
    });

    it("should throw error if report is RESOLVED", async () => {
      const reportMock = { id: 10, state: ReportState.RESOLVED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(maintainerController.assignReportToMaintainer(10, 1)).rejects.toThrow(
        "Cannot assign resolved or declined reports"
      );
    });

    it("should throw error if maintainer does not exist", async () => {
      const reportMock = { id: 10, state: ReportState.ASSIGNED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(null);

      await expect(maintainerController.assignReportToMaintainer(10, 1)).rejects.toThrow("Maintainer not found");
    });
  });

  // ===================== getAssignedReportsForMaintainer =====================
  describe("getAssignedReportsForMaintainer", () => {
    it("should return assigned reports for maintainer", async () => {
      const reportsMock = [
        { id: 1, title: "Report 1", state: ReportState.IN_PROGRESS, assignedMaintainerId: 1 },
        { id: 2, title: "Report 2", state: ReportState.ASSIGNED, assignedMaintainerId: 1 },
      ];

      const mappedReports = reportsMock.map((r) => ({ ...r, mapped: true }));

      (ReportRepository.prototype.getReportsByMaintainerId as jest.Mock).mockResolvedValue(reportsMock);
      (mapperService.mapReportDAOToDTO as jest.Mock).mockImplementation((report) => ({ ...report, mapped: true }));

      const result = await maintainerController.getAssignedReportsForMaintainer(1);

      expect(ReportRepository.prototype.getReportsByMaintainerId).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("mapped", true);
    });

    it("should return empty array if no reports assigned", async () => {
      (ReportRepository.prototype.getReportsByMaintainerId as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getAssignedReportsForMaintainer(1);

      expect(result).toEqual([]);
    });
  });

  // ===================== updateReportStatusByMaintainer =====================
  describe("updateReportStatusByMaintainer", () => {
    it("should update report to IN_PROGRESS successfully", async () => {
      const reportMock = {
        id: 10,
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 1,
        author: { id: 5, username: "user5" },
      };
      const updatedReport = { ...reportMock, state: ReportState.IN_PROGRESS };
      const notificationMock = { id: 100, type: "STATUS_CHANGE" };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReport);
      (NotificationRepository.prototype.createStatusChangeNotification as jest.Mock).mockResolvedValue(
        notificationMock
      );
      (mapperService.mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...updatedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS);

      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(10, ReportState.IN_PROGRESS, undefined);
      expect(NotificationRepository.prototype.createStatusChangeNotification).toHaveBeenCalledWith(updatedReport);
      expect(result).toHaveProperty("mapped", true);
    });

    it("should update report to SUSPENDED with reason", async () => {
      const reportMock = {
        id: 11,
        state: ReportState.IN_PROGRESS,
        assignedMaintainerId: 1,
        author: { id: 5 },
      };
      const updatedReport = { ...reportMock, state: ReportState.SUSPENDED, reason: "Waiting for parts" };
      const notificationMock = { id: 101, type: "STATUS_CHANGE" };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReport);
      (NotificationRepository.prototype.createStatusChangeNotification as jest.Mock).mockResolvedValue(
        notificationMock
      );
      (mapperService.mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...updatedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(
        1,
        11,
        ReportState.SUSPENDED,
        "Waiting for parts"
      );

      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(
        11,
        ReportState.SUSPENDED,
        "Waiting for parts"
      );
      expect(result).toHaveProperty("mapped", true);
    });

    it("should update report to RESOLVED successfully", async () => {
      const reportMock = {
        id: 12,
        state: ReportState.IN_PROGRESS,
        assignedMaintainerId: 1,
        author: { id: 5 },
      };
      const updatedReport = { ...reportMock, state: ReportState.RESOLVED };
      const notificationMock = { id: 102, type: "STATUS_CHANGE" };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReport);
      (NotificationRepository.prototype.createStatusChangeNotification as jest.Mock).mockResolvedValue(
        notificationMock
      );
      (mapperService.mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...updatedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(1, 12, ReportState.RESOLVED);

      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(12, ReportState.RESOLVED, undefined);
      expect(result).toHaveProperty("mapped", true);
    });

    it("should throw error if report not assigned to maintainer", async () => {
      const reportMock = {
        id: 13,
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 2, // Different maintainer
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 13, ReportState.IN_PROGRESS)
      ).rejects.toThrow("You can only update reports assigned to you as maintainer");
    });

    it("should throw error if report is already RESOLVED", async () => {
      const reportMock = {
        id: 14,
        state: ReportState.RESOLVED,
        assignedMaintainerId: 1,
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 14, ReportState.IN_PROGRESS)
      ).rejects.toThrow();
    });

    it("should throw error if report is already DECLINED", async () => {
      const reportMock = {
        id: 15,
        state: ReportState.DECLINED,
        assignedMaintainerId: 1,
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 15, ReportState.IN_PROGRESS)
      ).rejects.toThrow();
    });

    it("should throw error for invalid target state (PENDING)", async () => {
      const reportMock = {
        id: 16,
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 1,
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(maintainerController.updateReportStatusByMaintainer(1, 16, ReportState.PENDING)).rejects.toThrow(
        "Invalid target state for maintainer"
      );
    });

    it("should throw error for invalid target state (DECLINED)", async () => {
      const reportMock = {
        id: 17,
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 1,
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(maintainerController.updateReportStatusByMaintainer(1, 17, ReportState.DECLINED)).rejects.toThrow(
        "Invalid target state for maintainer"
      );
    });

    it("should throw error if report is not in operational state (PENDING)", async () => {
      const reportMock = {
        id: 18,
        state: ReportState.PENDING,
        assignedMaintainerId: 1,
      };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 18, ReportState.IN_PROGRESS)
      ).rejects.toThrow("Report is not in an operational state");
    });

    it("should throw error if notification creation fails", async () => {
      const reportMock = {
        id: 19,
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 1,
        author: { id: 5 },
      };
      const updatedReport = { ...reportMock, state: ReportState.IN_PROGRESS };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReport);
      (NotificationRepository.prototype.createStatusChangeNotification as jest.Mock).mockResolvedValue(null);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 19, ReportState.IN_PROGRESS)
      ).rejects.toThrow("Failed to create notification for report status change");
    });

    it("should update from SUSPENDED to IN_PROGRESS", async () => {
      const reportMock = {
        id: 20,
        state: ReportState.SUSPENDED,
        assignedMaintainerId: 1,
        author: { id: 5 },
      };
      const updatedReport = { ...reportMock, state: ReportState.IN_PROGRESS };
      const notificationMock = { id: 103, type: "STATUS_CHANGE" };

      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReport);
      (NotificationRepository.prototype.createStatusChangeNotification as jest.Mock).mockResolvedValue(
        notificationMock
      );
      (mapperService.mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...updatedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(1, 20, ReportState.IN_PROGRESS);

      expect(result).toHaveProperty("mapped", true);
    });
  });

  // ===================== deleteMaintainer =====================
  describe("deleteMaintainer", () => {
    it("should delete maintainer and reset report assignments", async () => {
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockResolvedValue(undefined);
      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.deleteMaintainer(1);

      expect(ReportRepository.prototype.resetReportsAssignmentByMaintainer).toHaveBeenCalledWith(1);
      expect(MaintainerRepository.prototype.deleteMaintainer).toHaveBeenCalledWith(1);
    });

    it("should reset reports before deleting maintainer", async () => {
      const callOrder: string[] = [];

      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockImplementation(() => {
        callOrder.push("reset");
        return Promise.resolve();
      });

      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockImplementation(() => {
        callOrder.push("delete");
        return Promise.resolve();
      });

      await maintainerController.deleteMaintainer(1);

      expect(callOrder).toEqual(["reset", "delete"]);
    });

    it("should handle deletion of maintainer with no assigned reports", async () => {
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockResolvedValue(undefined);
      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.deleteMaintainer(5);

      expect(ReportRepository.prototype.resetReportsAssignmentByMaintainer).toHaveBeenCalledWith(5);
      expect(MaintainerRepository.prototype.deleteMaintainer).toHaveBeenCalledWith(5);
    });
  });
});