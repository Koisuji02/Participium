import * as maintainerController from "../../../src/controllers/maintainerController";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";

// Mock delle repository
jest.mock("../../../src/repositories/MaintainerRepository");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/NotificationRepository");
jest.mock("../../../src/services/mapperService", () => ({
  mapReportDAOToDTO: jest.fn()
}));

describe("maintainerController", () => {
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

  describe("createMaintainer", () => {
    it("should create a new maintainer", async () => {
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

    it("should create a new maintainer with default active=true", async () => {
      (MaintainerRepository.prototype.createMaintainer as jest.Mock).mockResolvedValue(maintainerMock);

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
      expect(result).toEqual(maintainerMock);
    });
  });

  describe("getMaintainersByCategory", () => {
    it("should return maintainers by category", async () => {
      (MaintainerRepository.prototype.getMaintainersByCategory as jest.Mock).mockResolvedValue([maintainerMock]);

      const result = await maintainerController.getMaintainersByCategory(OfficeType.ARCHITECTURAL_BARRIERS);

      expect(MaintainerRepository.prototype.getMaintainersByCategory).toHaveBeenCalledWith(OfficeType.ARCHITECTURAL_BARRIERS);
      expect(result).toEqual([maintainerMock]);
    });

    it("should return empty array if no maintainers found", async () => {
      (MaintainerRepository.prototype.getMaintainersByCategory as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getMaintainersByCategory(OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS);

      expect(result).toEqual([]);
    });
  });

  describe("getAllMaintainers", () => {
    it("should return all maintainers", async () => {
      (MaintainerRepository.prototype.getAllMaintainers as jest.Mock).mockResolvedValue([maintainerMock]);

      const result = await maintainerController.getAllMaintainers();

      expect(MaintainerRepository.prototype.getAllMaintainers).toHaveBeenCalled();
      expect(result).toEqual([maintainerMock]);
    });

    it("should return empty array if no maintainers exist", async () => {
      (MaintainerRepository.prototype.getAllMaintainers as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getAllMaintainers();

      expect(result).toEqual([]);
    });
  });

  describe("getMaintainerById", () => {
    it("should return maintainer by id", async () => {
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(maintainerMock);

      const result = await maintainerController.getMaintainerById(1);

      expect(MaintainerRepository.prototype.getMaintainerById).toHaveBeenCalledWith(1);
      expect(result).toEqual(maintainerMock);
    });

    it("should return null if maintainer not found", async () => {
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(null);

      const result = await maintainerController.getMaintainerById(999);

      expect(result).toBeNull();
    });
  });

  describe("getMaintainerByEmail", () => {
    it("should return maintainer by email", async () => {
      (MaintainerRepository.prototype.getMaintainerByEmail as jest.Mock).mockResolvedValue(maintainerMock);

      const result = await maintainerController.getMaintainerByEmail("test@example.com");

      expect(MaintainerRepository.prototype.getMaintainerByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toEqual(maintainerMock);
    });

    it("should return null if maintainer not found by email", async () => {
      (MaintainerRepository.prototype.getMaintainerByEmail as jest.Mock).mockResolvedValue(null);

      const result = await maintainerController.getMaintainerByEmail("notfound@example.com");

      expect(result).toBeNull();
    });
  });

  describe("updateMaintainer", () => {
    it("should update maintainer fields", async () => {
      const updatedMaintainer = { ...maintainerMock, name: "Updated" };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, { name: "Updated" });

      expect(MaintainerRepository.prototype.updateMaintainer).toHaveBeenCalledWith(1, { name: "Updated" });
      expect(result).toEqual(updatedMaintainer);
    });

    it("should update multiple maintainer fields", async () => {
      const updatedMaintainer = { 
        ...maintainerMock, 
        name: "Updated", 
        email: "newemail@example.com",
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ARCHITECTURAL_BARRIERS],
        active: false
      };
      (MaintainerRepository.prototype.updateMaintainer as jest.Mock).mockResolvedValue(updatedMaintainer);

      const result = await maintainerController.updateMaintainer(1, { 
        name: "Updated",
        email: "newemail@example.com", 
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ARCHITECTURAL_BARRIERS],
        active: false
      });

      expect(MaintainerRepository.prototype.updateMaintainer).toHaveBeenCalledWith(1, { 
        name: "Updated",
        email: "newemail@example.com",
        categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ARCHITECTURAL_BARRIERS],
        active: false
      });
      expect(result).toEqual(updatedMaintainer);
    });
  });

  describe("assignReportToMaintainer", () => {
    it("should assign a report to a maintainer if report is ASSIGNED and maintainer exists", async () => {
      const reportMock = { id: 10, state: ReportState.ASSIGNED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(maintainerMock);
      (ReportRepository.prototype.assignReportToMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.assignReportToMaintainer(10, 1);

      expect(ReportRepository.prototype.getReportById).toHaveBeenCalledWith(10);
      expect(MaintainerRepository.prototype.getMaintainerById).toHaveBeenCalledWith(1);
      expect(ReportRepository.prototype.assignReportToMaintainer).toHaveBeenCalledWith(10, 1);
    });

    it("should throw error if report is already resolved", async () => {
      const reportMock = { id: 10, state: ReportState.RESOLVED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);

      await expect(maintainerController.assignReportToMaintainer(10, 1))
        .rejects
        .toThrow("Cannot assign resolved or declined reports");
    });

    it("should throw error if maintainer does not exist", async () => {
      const reportMock = { id: 10, state: ReportState.ASSIGNED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (MaintainerRepository.prototype.getMaintainerById as jest.Mock).mockResolvedValue(null);

      await expect(maintainerController.assignReportToMaintainer(10, 1))
        .rejects
        .toThrow("Maintainer not found");
    });
  });

  describe("getAssignedReportsForMaintainer", () => {
    it("should return assigned reports for a maintainer", async () => {
      const reportDAOMock = [
        { id: 10, state: ReportState.ASSIGNED, assignedMaintainerId: 1 },
        { id: 11, state: ReportState.IN_PROGRESS, assignedMaintainerId: 1 }
      ];
      const reportDTOMock = reportDAOMock.map(r => ({ ...r, mapped: true }));
      
      (ReportRepository.prototype.getReportsByMaintainerId as jest.Mock).mockResolvedValue(reportDAOMock);
      const { mapReportDAOToDTO } = require("../../../src/services/mapperService");
      mapReportDAOToDTO.mockImplementation((report: any) => ({ ...report, mapped: true }));

      const result = await maintainerController.getAssignedReportsForMaintainer(1);

      expect(ReportRepository.prototype.getReportsByMaintainerId).toHaveBeenCalledWith(1);
      expect(mapReportDAOToDTO).toHaveBeenCalledTimes(2);
      expect(result).toEqual(reportDTOMock);
    });

    it("should return empty array if no reports assigned", async () => {
      (ReportRepository.prototype.getReportsByMaintainerId as jest.Mock).mockResolvedValue([]);

      const result = await maintainerController.getAssignedReportsForMaintainer(1);

      expect(result).toEqual([]);
    });
  });

  describe("updateReportStatusByMaintainer", () => {
    const reportMock = {
      id: 10,
      assignedMaintainerId: 1,
      state: ReportState.ASSIGNED,
      body: "body",
      type: "type",
      url: "url"
    };
    const updatedReportMock = {
      ...reportMock,
      state: ReportState.IN_PROGRESS
    };
    const notificationMock = { id: 99, message: "Stato cambiato" };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should update report status to IN_PROGRESS and return mapped DTO", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReportMock);
      const notificationRepo = require("../../../src/repositories/NotificationRepository");
      notificationRepo.NotificationRepository.prototype.createStatusChangeNotification = jest.fn().mockResolvedValue(notificationMock);

      const { mapReportDAOToDTO } = require("../../../src/services/mapperService");
      mapReportDAOToDTO.mockReturnValue({ ...updatedReportMock, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(
        1, 10, ReportState.IN_PROGRESS
      );
      
      expect(ReportRepository.prototype.getReportById).toHaveBeenCalledWith(10);
      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(10, ReportState.IN_PROGRESS, undefined);
      expect(notificationRepo.NotificationRepository.prototype.createStatusChangeNotification).toHaveBeenCalledWith(updatedReportMock);
      expect(result).toEqual({ ...updatedReportMock, mapped: true });
    });

    it("should update report status to SUSPENDED with reason", async () => {
      const suspendedReport = { ...reportMock, state: ReportState.SUSPENDED, reason: "Waiting for parts" };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.IN_PROGRESS });
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(suspendedReport);
      const notificationRepo = require("../../../src/repositories/NotificationRepository");
      notificationRepo.NotificationRepository.prototype.createStatusChangeNotification = jest.fn().mockResolvedValue(notificationMock);

      const { mapReportDAOToDTO } = require("../../../src/services/mapperService");
      mapReportDAOToDTO.mockReturnValue({ ...suspendedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(
        1, 10, ReportState.SUSPENDED, "Waiting for parts"
      );
      
      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(10, ReportState.SUSPENDED, "Waiting for parts");
      expect(result).toEqual({ ...suspendedReport, mapped: true });
    });

    it("should update report status to RESOLVED", async () => {
      const resolvedReport = { ...reportMock, state: ReportState.RESOLVED };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.IN_PROGRESS });
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(resolvedReport);
      const notificationRepo = require("../../../src/repositories/NotificationRepository");
      notificationRepo.NotificationRepository.prototype.createStatusChangeNotification = jest.fn().mockResolvedValue(notificationMock);

      const { mapReportDAOToDTO } = require("../../../src/services/mapperService");
      mapReportDAOToDTO.mockReturnValue({ ...resolvedReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(
        1, 10, ReportState.RESOLVED
      );
      
      expect(ReportRepository.prototype.updateReportState).toHaveBeenCalledWith(10, ReportState.RESOLVED, undefined);
      expect(result).toEqual({ ...resolvedReport, mapped: true });
    });

    it("should allow transition from SUSPENDED to IN_PROGRESS", async () => {
      const inProgressReport = { ...reportMock, state: ReportState.IN_PROGRESS };
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.SUSPENDED });
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(inProgressReport);
      const notificationRepo = require("../../../src/repositories/NotificationRepository");
      notificationRepo.NotificationRepository.prototype.createStatusChangeNotification = jest.fn().mockResolvedValue(notificationMock);

      const { mapReportDAOToDTO } = require("../../../src/services/mapperService");
      mapReportDAOToDTO.mockReturnValue({ ...inProgressReport, mapped: true });

      const result = await maintainerController.updateReportStatusByMaintainer(
        1, 10, ReportState.IN_PROGRESS
      );
      
      expect(result).toEqual({ ...inProgressReport, mapped: true });
    });

    it("should throw error if report is not assigned to maintainer", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, assignedMaintainerId: 2 });
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow("You can only update reports assigned to you as maintainer");
    });

    it("should throw error if nextState is not allowed (PENDING)", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.PENDING)
      ).rejects.toThrow("Invalid target state for maintainer");
    });

    it("should throw error if nextState is not allowed (DECLINED)", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.DECLINED)
      ).rejects.toThrow("Invalid target state for maintainer");
    });

    it("should throw error if report is not in operational state (PENDING)", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.PENDING });
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow("Report is not in an operational state");
    });

    it("should throw error if report is not in operational state (DECLINED)", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.DECLINED });
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow(`Report with id '${reportMock.id}' is already in state '${ReportState.DECLINED}' and cannot be reviewed again.`);
    });

    it("should throw error if report is already resolved", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.RESOLVED });
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow(/already in state 'RESOLVED'/);
    });

    it("should throw error if report is already declined", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue({ ...reportMock, state: ReportState.DECLINED });
      
      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow(/already in state 'DECLINED'/);
    });

    it("should throw error if notification creation fails", async () => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(reportMock);
      (ReportRepository.prototype.updateReportState as jest.Mock).mockResolvedValue(updatedReportMock);
      const notificationRepo = require("../../../src/repositories/NotificationRepository");
      notificationRepo.NotificationRepository.prototype.createStatusChangeNotification = jest.fn().mockResolvedValue(null);

      await expect(
        maintainerController.updateReportStatusByMaintainer(1, 10, ReportState.IN_PROGRESS)
      ).rejects.toThrow("Failed to create notification for report status change");
    });
  });

  describe("deleteMaintainer", () => {
    it("should reset report assignments and delete maintainer", async () => {
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockResolvedValue(undefined);
      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.deleteMaintainer(1);

      expect(ReportRepository.prototype.resetReportsAssignmentByMaintainer).toHaveBeenCalledWith(1);
      expect(MaintainerRepository.prototype.deleteMaintainer).toHaveBeenCalledWith(1);
    });

    it("should handle deletion of maintainer with no assigned reports", async () => {
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockResolvedValue(undefined);
      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockResolvedValue(undefined);

      await maintainerController.deleteMaintainer(999);

      expect(ReportRepository.prototype.resetReportsAssignmentByMaintainer).toHaveBeenCalledWith(999);
      expect(MaintainerRepository.prototype.deleteMaintainer).toHaveBeenCalledWith(999);
    });

    it("should propagate error if resetReportsAssignmentByMaintainer fails", async () => {
      const error = new Error("Database error");
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockRejectedValue(error);

      await expect(maintainerController.deleteMaintainer(1))
        .rejects
        .toThrow("Database error");

      expect(MaintainerRepository.prototype.deleteMaintainer).not.toHaveBeenCalled();
    });

    it("should propagate error if deleteMaintainer fails", async () => {
      const error = new Error("Cannot delete maintainer");
      (ReportRepository.prototype.resetReportsAssignmentByMaintainer as jest.Mock).mockResolvedValue(undefined);
      (MaintainerRepository.prototype.deleteMaintainer as jest.Mock).mockRejectedValue(error);

      await expect(maintainerController.deleteMaintainer(1))
        .rejects
        .toThrow("Cannot delete maintainer");

      expect(ReportRepository.prototype.resetReportsAssignmentByMaintainer).toHaveBeenCalledWith(1);
    });
  });
});