import "reflect-metadata";
import { reviewDoc } from "../../../src/controllers/officerController";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { mapReportDAOToDTO } from "../../../src/services/mapperService";
import { ReportState } from "../../../src/models/enums/ReportState";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";

// Mock the repositories and services
jest.mock("../../../src/repositories/OfficerRepository");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/services/mapperService");

describe("PT11: Officer Update Report Status - Unit Tests", () => {
  let mockOfficerRepo: jest.Mocked<OfficerRepository>;
  let mockReportRepo: jest.Mocked<ReportRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOfficerRepo = new OfficerRepository() as jest.Mocked<OfficerRepository>;
    mockReportRepo = new ReportRepository() as jest.Mocked<ReportRepository>;
    
    (OfficerRepository as jest.MockedClass<typeof OfficerRepository>).mockImplementation(() => mockOfficerRepo);
    (ReportRepository as jest.MockedClass<typeof ReportRepository>).mockImplementation(() => mockReportRepo);
  });

  describe("reviewDoc - Status Updates", () => {
    it("should update report status from APPROVED to IN_PROGRESS", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.IN_PROGRESS
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(123, 1, ReportState.IN_PROGRESS);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.IN_PROGRESS, undefined);
      expect(result.state).toBe(ReportState.IN_PROGRESS);
    });

    it("should update report status from IN_PROGRESS to SUSPENDED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.IN_PROGRESS,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.SUSPENDED
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(123, 1, ReportState.SUSPENDED);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.SUSPENDED, undefined);
      expect(result.state).toBe(ReportState.SUSPENDED);
    });

    it("should update report status from IN_PROGRESS to RESOLVED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.IN_PROGRESS,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.RESOLVED
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(123, 1, ReportState.RESOLVED);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.RESOLVED, undefined);
      expect(result.state).toBe(ReportState.RESOLVED);
    });

    it("should update report status from SUSPENDED back to IN_PROGRESS", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.SUSPENDED,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.IN_PROGRESS
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(123, 1, ReportState.IN_PROGRESS);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.IN_PROGRESS, undefined);
      expect(result.state).toBe(ReportState.IN_PROGRESS);
    });

    it("should only allow assigned officer to update report status", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        assignedOfficerId: 123, // Different from the officer trying to update
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);

      await expect(reviewDoc(456, 1, ReportState.IN_PROGRESS))
        .rejects
        .toThrow("You can only review reports assigned to you");
    });

    it("should allow unassigned PENDING reports to be updated by any officer", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.PENDING,
        assignedOfficerId: null,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.PENDING,
        assignedOfficerId: 123
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockReportRepo.assignReportToOfficer = jest.fn().mockResolvedValue(mockUpdatedReport);
      
      mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue([
        { id: 123, role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
      ]);
      
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(999, 1, ReportState.ASSIGNED);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.ASSIGNED, undefined);
      expect(result.state).toBe(ReportState.PENDING);
    });
  });

  describe("Status Workflow Validation", () => {
    it("should validate complete workflow: ASSIGNED -> IN_PROGRESS -> RESOLVED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      // Step 1: ASSIGNED -> IN_PROGRESS
      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue({ ...mockReport, state: ReportState.IN_PROGRESS });
      (mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...mockReport, state: ReportState.IN_PROGRESS });

      let result = await reviewDoc(123, 1, ReportState.IN_PROGRESS);
      expect(result.state).toBe(ReportState.IN_PROGRESS);

      // Step 2: IN_PROGRESS -> RESOLVED
      mockReportRepo.getReportById = jest.fn().mockResolvedValue({ ...mockReport, state: ReportState.IN_PROGRESS });
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue({ ...mockReport, state: ReportState.RESOLVED });
      (mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...mockReport, state: ReportState.RESOLVED });

      result = await reviewDoc(123, 1, ReportState.RESOLVED);
      expect(result.state).toBe(ReportState.RESOLVED);
    });

    it("should validate workflow with suspension: ASSIGNED -> IN_PROGRESS -> SUSPENDED -> IN_PROGRESS -> RESOLVED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        assignedOfficerId: 123,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };

      const states = [
        ReportState.IN_PROGRESS,
        ReportState.SUSPENDED,
        ReportState.IN_PROGRESS,
        ReportState.RESOLVED
      ];

      for (const state of states) {
        mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
        mockReportRepo.updateReportState = jest.fn().mockResolvedValue({ ...mockReport, state });
        (mapReportDAOToDTO as jest.Mock).mockReturnValue({ ...mockReport, state });

        const result = await reviewDoc(123, 1, state);
        expect(result.state).toBe(state);
      }
    });
  });
});
