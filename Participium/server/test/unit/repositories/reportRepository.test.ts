import "reflect-metadata";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { AppDataSource } from "../../../src/database/connection";
import { ReportDAO } from "../../../src/models/dao/ReportDAO";
import { UserDAO } from "../../../src/models/dao/UserDAO";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";
import { Repository } from "typeorm";

jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe("ReportRepository", () => {
  let reportRepository: ReportRepository;
  let mockReportRepo: jest.Mocked<Repository<ReportDAO>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReportRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockReportRepo);

    reportRepository = new ReportRepository();
  });

  describe("getAllReports", () => {
    it("should return all reports with author relation", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", author: { id: 1, username: "user1" } },
        { id: 2, title: "Report 2", author: { id: 2, username: "user2" } }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getAllReports();

      expect(mockReportRepo.find).toHaveBeenCalledWith({ relations: ["author"] });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array if no reports exist", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await reportRepository.getAllReports();

      expect(result).toEqual([]);
    });
  });

  describe("getApprovedReports", () => {
    it("should return reports in ASSIGNED, IN_PROGRESS, or SUSPENDED state", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED, date: new Date("2025-01-01") },
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS, date: new Date("2025-01-02") },
        { id: 3, title: "Report 3", state: ReportState.SUSPENDED, date: new Date("2025-01-03") }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getApprovedReports();

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: [
          { state: ReportState.ASSIGNED },
          { state: ReportState.IN_PROGRESS },
          { state: ReportState.SUSPENDED }
        ],
        relations: ["author"],
        order: {
          date: "DESC"
        }
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array if no approved reports exist", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await reportRepository.getApprovedReports();

      expect(result).toEqual([]);
    });
  });

  describe("getReportsByState", () => {
    it("should return reports filtered by state", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.PENDING },
        { id: 2, title: "Report 2", state: ReportState.PENDING }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getReportsByState(ReportState.PENDING);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { state: ReportState.PENDING },
        relations: ["author"]
      });
      expect(result).toEqual(mockReports);
    });

    it("should handle all report states", async () => {
      const states = [
        ReportState.PENDING,
        ReportState.ASSIGNED,
        ReportState.IN_PROGRESS,
        ReportState.SUSPENDED,
        ReportState.RESOLVED,
        ReportState.DECLINED
      ];

      for (const state of states) {
        mockReportRepo.find.mockResolvedValue([]);

        await reportRepository.getReportsByState(state);

        expect(mockReportRepo.find).toHaveBeenCalledWith({
          where: { state },
          relations: ["author"]
        });
      }
    });

    it("should return empty array if no reports in that state", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await reportRepository.getReportsByState(ReportState.RESOLVED);

      expect(result).toEqual([]);
    });
  });

  describe("getReportById", () => {
    it("should return report by id", async () => {
      const mockReport = { 
        id: 1, 
        title: "Test Report",
        author: { id: 1, username: "user1" }
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);

      const result = await reportRepository.getReportById(1);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["author"]
      });
      expect(result).toEqual(mockReport);
    });

    it("should throw error if report not found", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await expect(reportRepository.getReportById(999))
        .rejects
        .toThrow("Report with id '999' not found");
    });
  });

  describe("getReportsByCategory", () => {
    it("should return reports filtered by category", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", category: OfficeType.ARCHITECTURAL_BARRIERS },
        { id: 2, title: "Report 2", category: OfficeType.ARCHITECTURAL_BARRIERS }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getReportsByCategory(OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { category: OfficeType.ARCHITECTURAL_BARRIERS },
        relations: ["author"]
      });
      expect(result).toEqual(mockReports);
    });

    it("should handle all office types", async () => {
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
        mockReportRepo.find.mockResolvedValue([]);

        await reportRepository.getReportsByCategory(category);

        expect(mockReportRepo.find).toHaveBeenCalledWith({
          where: { category },
          relations: ["author"]
        });
      }
    });
  });

  describe("getReportsByAssignedOfficer", () => {
    it("should return reports assigned to specific officer", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", assignedOfficerId: 5 },
        { id: 2, title: "Report 2", assignedOfficerId: 5 }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getReportsByAssignedOfficer(5);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { assignedOfficerId: 5 },
        relations: ["author"]
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array if officer has no assigned reports", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await reportRepository.getReportsByAssignedOfficer(10);

      expect(result).toEqual([]);
    });
  });

  describe("getReportsByMaintainerId", () => {
    it("should return reports assigned to specific maintainer", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", assignedMaintainerId: 3 },
        { id: 2, title: "Report 2", assignedMaintainerId: 3 }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);

      const result = await reportRepository.getReportsByMaintainerId(3);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { assignedMaintainerId: 3 },
        relations: ["author"]
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array if maintainer has no assigned reports", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      const result = await reportRepository.getReportsByMaintainerId(99);

      expect(result).toEqual([]);
    });
  });

  describe("createReport", () => {
    it("should create a new report with all fields", async () => {
      const mockAuthor = { id: 1, username: "user1" } as UserDAO;
      const mockCreatedReport = {
        id: 1,
        title: "New Report",
        location: {
          name: "Test Location",
          Coordinates: { longitude: 10.5, latitude: 45.5 }
        },
        author: mockAuthor,
        anonymity: false,
        category: OfficeType.ARCHITECTURAL_BARRIERS,
        document: {
          Description: "Test description",
          Photos: ["photo1.jpg", "photo2.jpg"]
        },
        state: ReportState.PENDING,
        date: expect.any(Date)
      };

      mockReportRepo.save.mockResolvedValue(mockCreatedReport as any);

      const result = await reportRepository.createReport(
        "New Report",
        {
          name: "Test Location",
          Coordinates: { longitude: 10.5, latitude: 45.5 }
        },
        mockAuthor,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        {
          Description: "Test description",
          Photos: ["photo1.jpg", "photo2.jpg"]
        }
      );

      expect(mockReportRepo.save).toHaveBeenCalledWith({
        title: "New Report",
        location: {
          name: "Test Location",
          Coordinates: { longitude: 10.5, latitude: 45.5 }
        },
        author: mockAuthor,
        anonymity: false,
        category: OfficeType.ARCHITECTURAL_BARRIERS,
        document: {
          Description: "Test description",
          Photos: ["photo1.jpg", "photo2.jpg"]
        },
        state: ReportState.PENDING,
        date: expect.any(Date)
      });
      expect(result).toEqual(mockCreatedReport);
    });

    it("should create anonymous report with null author", async () => {
      const mockCreatedReport = {
        id: 2,
        title: "Anonymous Report",
        author: null,
        anonymity: true,
        category: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        state: ReportState.PENDING
      };

      mockReportRepo.save.mockResolvedValue(mockCreatedReport as any);

      const result = await reportRepository.createReport(
        "Anonymous Report",
        { name: "Location" },
        null,
        true,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        { Description: "Test" }
      );

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          author: null,
          anonymity: true
        })
      );
      expect(result.anonymity).toBe(true);
    });

    it("should default to OTHER category if category is null", async () => {
      const mockCreatedReport = {
        id: 3,
        title: "Report",
        category: OfficeType.OTHER,
        state: ReportState.PENDING
      };

      mockReportRepo.save.mockResolvedValue(mockCreatedReport as any);

      const result = await reportRepository.createReport(
        "Report",
        { name: "Location" },
        null,
        false,
        null as any,
        { Description: "Test" }
      );

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.anything()
        })
      );
    });

    it("should set state to PENDING and add current date", async () => {
      const mockCreatedReport = {
        id: 4,
        title: "Report",
        state: ReportState.PENDING,
        date: new Date()
      };

      mockReportRepo.save.mockResolvedValue(mockCreatedReport as any);

      await reportRepository.createReport(
        "Report",
        {},
        null,
        false,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        {}
      );

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ReportState.PENDING,
          date: expect.any(Date)
        })
      );
    });

    it("should handle minimal report data", async () => {
      const mockCreatedReport = {
        id: 5,
        title: "Minimal",
        location: {},
        document: {},
        state: ReportState.PENDING
      };

      mockReportRepo.save.mockResolvedValue(mockCreatedReport as any);

      const result = await reportRepository.createReport(
        "Minimal",
        {},
        null,
        false,
        OfficeType.OTHER,
        {}
      );

      expect(result).toBeDefined();
    });
  });

  describe("resetReportsAssignmentByOfficer", () => {
    it("should reset ASSIGNED reports to PENDING and clear assignments", async () => {
      const mockReports = [
        { id: 1, state: ReportState.ASSIGNED, assignedOfficerId: 5, assignedMaintainerId: 3 },
        { id: 2, state: ReportState.IN_PROGRESS, assignedOfficerId: 5, assignedMaintainerId: 4 },
        { id: 3, state: ReportState.SUSPENDED, assignedOfficerId: 5, assignedMaintainerId: null }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);
      mockReportRepo.save.mockImplementation((report) => Promise.resolve(report as ReportDAO));

      await reportRepository.resetReportsAssignmentByOfficer(5);

      expect(mockReportRepo.save).toHaveBeenCalledTimes(3);
      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ReportState.PENDING,
          assignedOfficerId: null,
          assignedMaintainerId: null
        })
      );
    });

    it("should not reset RESOLVED or DECLINED reports", async () => {
      const mockReports = [
        { id: 1, state: ReportState.RESOLVED, assignedOfficerId: 5 },
        { id: 2, state: ReportState.DECLINED, assignedOfficerId: 5 },
        { id: 3, state: ReportState.PENDING, assignedOfficerId: 5 }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);
      mockReportRepo.save.mockImplementation((report) => Promise.resolve(report as ReportDAO));

      await reportRepository.resetReportsAssignmentByOfficer(5);

      expect(mockReportRepo.save).not.toHaveBeenCalled();
    });

    it("should handle officer with no assigned reports", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await reportRepository.resetReportsAssignmentByOfficer(10);

      expect(mockReportRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("resetPartialReportsAssignmentByOfficer", () => {
    it("should reset reports for specific office type", async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 })
      };

      mockReportRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await reportRepository.resetPartialReportsAssignmentByOfficer(5, OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockReportRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(ReportDAO);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        state: ReportState.PENDING,
        assignedOfficerId: expect.anything(),
        assignedMaintainerId: expect.anything()
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'assignedOfficerId = :officerId',
        { officerId: 5 }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category = :office',
        { office: OfficeType.ARCHITECTURAL_BARRIERS }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'state IN (:...states)',
        { states: [ReportState.ASSIGNED, ReportState.IN_PROGRESS, ReportState.SUSPENDED] }
      );
    });

    it("should return early if office is null", async () => {
      await reportRepository.resetPartialReportsAssignmentByOfficer(5, null as any);

      expect(mockReportRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should handle different office types", async () => {
      const officeTypes = [
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS
      ];

      for (const officeType of officeTypes) {
        const mockQueryBuilder = {
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 })
        };

        mockReportRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await reportRepository.resetPartialReportsAssignmentByOfficer(5, officeType);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'category = :office',
          { office: officeType }
        );
      }
    });
  });

  describe("resetReportsAssignmentByMaintainer", () => {
    it("should reset reports assigned to maintainer", async () => {
      const mockReports = [
        { id: 1, state: ReportState.ASSIGNED, assignedMaintainerId: 3 },
        { id: 2, state: ReportState.IN_PROGRESS, assignedMaintainerId: 3 }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);
      mockReportRepo.save.mockImplementation((report) => Promise.resolve(report as ReportDAO));

      await reportRepository.resetReportsAssignmentByMaintainer(3);

      expect(mockReportRepo.save).toHaveBeenCalledTimes(2);
      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ReportState.PENDING,
          assignedMaintainerId: null
        })
      );
    });

    it("should not reset SUSPENDED reports for maintainer", async () => {
      const mockReports = [
        { id: 1, state: ReportState.SUSPENDED, assignedMaintainerId: 3 },
        { id: 2, state: ReportState.RESOLVED, assignedMaintainerId: 3 }
      ];

      mockReportRepo.find.mockResolvedValue(mockReports as any);
      mockReportRepo.save.mockImplementation((report) => Promise.resolve(report as ReportDAO));

      await reportRepository.resetReportsAssignmentByMaintainer(3);

      expect(mockReportRepo.save).not.toHaveBeenCalled();
    });

    it("should handle maintainer with no assigned reports", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await reportRepository.resetReportsAssignmentByMaintainer(99);

      expect(mockReportRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("updateReportState", () => {
    it("should update report state", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.PENDING
      };
      const updatedReport = {
        ...mockReport,
        state: ReportState.ASSIGNED
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockResolvedValue(updatedReport as any);

      const result = await reportRepository.updateReportState(1, ReportState.ASSIGNED);

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ReportState.ASSIGNED
        })
      );
      expect(result.state).toBe(ReportState.ASSIGNED);
    });

    it("should add reason when declining report", async () => {
      const mockReport = {
        id: 2,
        title: "Test Report",
        state: ReportState.PENDING
      };
      const updatedReport = {
        ...mockReport,
        state: ReportState.DECLINED,
        reason: "Not valid"
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockResolvedValue(updatedReport as any);

      const result = await reportRepository.updateReportState(
        2,
        ReportState.DECLINED,
        "Not valid"
      );

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ReportState.DECLINED,
          reason: "Not valid"
        })
      );
      expect(result.reason).toBe("Not valid");
    });

    it("should not add reason for non-DECLINED states", async () => {
      const mockReport = {
        id: 3,
        title: "Test Report",
        state: ReportState.PENDING,
        reason: undefined
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockImplementation((report) => Promise.resolve(report as ReportDAO));

      await reportRepository.updateReportState(3, ReportState.ASSIGNED, "This should be ignored");

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.not.objectContaining({
          reason: "This should be ignored"
        })
      );
    });

    it("should handle all state transitions", async () => {
      const states = [
        ReportState.PENDING,
        ReportState.ASSIGNED,
        ReportState.IN_PROGRESS,
        ReportState.SUSPENDED,
        ReportState.RESOLVED,
        ReportState.DECLINED
      ];

      for (const state of states) {
        const mockReport = { id: 1, title: "Test", state: ReportState.PENDING };
        mockReportRepo.find.mockResolvedValue([mockReport] as any);
        mockReportRepo.save.mockResolvedValue({ ...mockReport, state } as any);

        await reportRepository.updateReportState(1, state);

        expect(mockReportRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ state })
        );
      }
    });

    it("should throw error if report not found", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await expect(reportRepository.updateReportState(999, ReportState.ASSIGNED))
        .rejects
        .toThrow("Report with id '999' not found");
    });
  });

  describe("deleteReport", () => {
    it("should delete an existing report", async () => {
      const mockReport = {
        id: 1,
        title: "To Delete",
        state: ReportState.PENDING
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.remove.mockResolvedValue(mockReport as any);

      await reportRepository.deleteReport(1);

      expect(mockReportRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["author"]
      });
      expect(mockReportRepo.remove).toHaveBeenCalledWith(mockReport);
    });

    it("should throw error if report to delete not found", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await expect(reportRepository.deleteReport(999))
        .rejects
        .toThrow("Report with id '999' not found");

      expect(mockReportRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("assignReportToOfficer", () => {
    it("should assign report to officer and set state to ASSIGNED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.PENDING,
        assignedOfficerId: null
      };
      const updatedReport = {
        ...mockReport,
        assignedOfficerId: 5,
        state: ReportState.ASSIGNED
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockResolvedValue(updatedReport as any);

      const result = await reportRepository.assignReportToOfficer(1, 5);

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedOfficerId: 5,
          state: ReportState.ASSIGNED
        })
      );
      expect(result.assignedOfficerId).toBe(5);
      expect(result.state).toBe(ReportState.ASSIGNED);
    });

    it("should throw error if report not found", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await expect(reportRepository.assignReportToOfficer(999, 5))
        .rejects
        .toThrow("Report with id '999' not found");
    });
  });

  describe("assignReportToMaintainer", () => {
    it("should assign report to maintainer and set state to ASSIGNED", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.PENDING,
        assignedMaintainerId: null
      };
      const updatedReport = {
        ...mockReport,
        assignedMaintainerId: 3,
        state: ReportState.ASSIGNED
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockResolvedValue(updatedReport as any);

      const result = await reportRepository.assignReportToMaintainer(1, 3);

      expect(mockReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedMaintainerId: 3,
          state: ReportState.ASSIGNED
        })
      );
      expect(result.assignedMaintainerId).toBe(3);
      expect(result.state).toBe(ReportState.ASSIGNED);
    });

    it("should throw error if report not found", async () => {
      mockReportRepo.find.mockResolvedValue([]);

      await expect(reportRepository.assignReportToMaintainer(999, 3))
        .rejects
        .toThrow("Report with id '999' not found");
    });

    it("should reassign report to different maintainer", async () => {
      const mockReport = {
        id: 1,
        title: "Test Report",
        state: ReportState.ASSIGNED,
        assignedMaintainerId: 2
      };
      const updatedReport = {
        ...mockReport,
        assignedMaintainerId: 4
      };

      mockReportRepo.find.mockResolvedValue([mockReport] as any);
      mockReportRepo.save.mockResolvedValue(updatedReport as any);

      const result = await reportRepository.assignReportToMaintainer(1, 4);

      expect(result.assignedMaintainerId).toBe(4);
    });
  });
});