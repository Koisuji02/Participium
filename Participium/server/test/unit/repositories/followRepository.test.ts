import { FollowRepository } from "../../../src/repositories/FollowRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { AppDataSource } from "../../../src/database/connection";
import { FollowDAO } from "../../../src/models/dao/FollowDAO";
import { ReportDAO } from "../../../src/models/dao/ReportDAO";
import { UserDAO } from "../../../src/models/dao/UserDAO";
import { ReportState } from "../../../src/models/enums/ReportState";
import { BadRequestError } from "../../../src/utils/utils";
import { Repository } from "typeorm";

// Mock dependencies
jest.mock("../../../src/database/connection");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/UserRepository");

describe("FollowRepository", () => {
  let followRepo: FollowRepository;
  let mockRepo: jest.Mocked<Repository<FollowDAO>>;
  let mockReportRepo: jest.Mocked<ReportRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TypeORM repository
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepo);

    // Create instance
    followRepo = new FollowRepository();

    // Mock ReportRepository
    mockReportRepo = {
      getReportById: jest.fn(),
      getReportsByUserId: jest.fn(),
    } as any;

    // Mock UserRepository
    mockUserRepo = {
      getUserById: jest.fn(),
    } as any;

    (ReportRepository as jest.Mock).mockImplementation(() => mockReportRepo);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
  });

  // ===================== getFollowersOfReport =====================
  describe("getFollowersOfReport", () => {
    it("should return list of users following a report with default notifyVia", async () => {
      const mockUsers = [
        { id: 1, username: "user1", email: "user1@test.com" } as UserDAO,
        { id: 2, username: "user2", email: "user2@test.com" } as UserDAO,
      ];

      const mockFollows = [
        { id: 1, user: mockUsers[0], report: { id: 1 } as ReportDAO },
        { id: 2, user: mockUsers[1], report: { id: 1 } as ReportDAO },
      ] as FollowDAO[];

      mockRepo.find.mockResolvedValue(mockFollows);

      const result = await followRepo.getFollowersOfReport(1);

      expect(result).toEqual(mockUsers);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {
          report: { id: 1 },
          notifyVia: "web",
        },
        relations: ["user"],
        order: { id: "ASC" },
      });
    });

    it("should return list of users following a report with custom notifyVia", async () => {
      const mockUsers = [{ id: 1, username: "user1" } as UserDAO];
      const mockFollows = [{ id: 1, user: mockUsers[0], report: { id: 1 } as ReportDAO }] as FollowDAO[];

      mockRepo.find.mockResolvedValue(mockFollows);

      const result = await followRepo.getFollowersOfReport(1, "telegram");

      expect(result).toEqual(mockUsers);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {
          report: { id: 1 },
          notifyVia: "telegram",
        },
        relations: ["user"],
        order: { id: "ASC" },
      });
    });

    it("should return empty array when no followers", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await followRepo.getFollowersOfReport(1);

      expect(result).toEqual([]);
    });
  });

  // ===================== getFollowedReportsByUser =====================
  describe("getFollowedReportsByUser", () => {
    it("should return list of reports followed by user with default notifyVia", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED } as ReportDAO,
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS } as ReportDAO,
      ];

      const mockFollows = [
        { id: 1, user: { id: 1 } as UserDAO, report: mockReports[0] },
        { id: 2, user: { id: 1 } as UserDAO, report: mockReports[1] },
      ] as FollowDAO[];

      mockRepo.find.mockResolvedValue(mockFollows);

      const result = await followRepo.getFollowedReportsByUser(1);

      expect(result).toEqual(mockReports);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {
          user: { id: 1 },
          notifyVia: "web",
        },
        relations: ["report"],
        order: { id: "ASC" },
      });
    });

    it("should return list of reports followed by user with custom notifyVia", async () => {
      const mockReports = [{ id: 1, title: "Report 1" } as ReportDAO];
      const mockFollows = [{ id: 1, user: { id: 1 } as UserDAO, report: mockReports[0] }] as FollowDAO[];

      mockRepo.find.mockResolvedValue(mockFollows);

      const result = await followRepo.getFollowedReportsByUser(1, "email");

      expect(result).toEqual(mockReports);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {
          user: { id: 1 },
          notifyVia: "email",
        },
        relations: ["report"],
        order: { id: "ASC" },
      });
    });

    it("should return empty array when user follows no reports", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await followRepo.getFollowedReportsByUser(1);

      expect(result).toEqual([]);
    });
  });

  // ===================== follow =====================
  describe("follow", () => {
    it("should create a new follow successfully with default notifyVia", async () => {
      const mockReport = { id: 1, title: "Test Report", state: ReportState.ASSIGNED } as ReportDAO;
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const mockFollow = { id: 1, user: mockUser, report: mockReport, notifyVia: "web" } as FollowDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(mockFollow);

      const result = await followRepo.follow(1, 1);

      expect(result).toEqual(mockFollow);
      expect(mockReportRepo.getReportById).toHaveBeenCalledWith(1);
      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 1 }, report: { id: 1 }, notifyVia: "web" },
      });
      expect(mockRepo.save).toHaveBeenCalledWith({ user: mockUser, report: mockReport, notifyVia: "web" });
    });

    it("should create a new follow with custom notifyVia", async () => {
      const mockReport = { id: 1, title: "Test Report", state: ReportState.PENDING } as ReportDAO;
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const mockFollow = { id: 1, user: mockUser, report: mockReport, notifyVia: "telegram" } as FollowDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(mockFollow);

      const result = await followRepo.follow(1, 1, "telegram");

      expect(result).toEqual(mockFollow);
      expect(mockRepo.save).toHaveBeenCalledWith({ user: mockUser, report: mockReport, notifyVia: "telegram" });
    });

    it("should return existing follow if already following", async () => {
      const mockReport = { id: 1, title: "Test Report", state: ReportState.ASSIGNED } as ReportDAO;
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const existingFollow = { id: 1, user: mockUser, report: mockReport, notifyVia: "web" } as FollowDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValue(existingFollow);

      const result = await followRepo.follow(1, 1);

      expect(result).toEqual(existingFollow);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it("should throw error when report not found", async () => {
      mockReportRepo.getReportById.mockRejectedValue(new Error("Report with id '1' not found"));

      await expect(followRepo.follow(1, 1)).rejects.toThrow("Report with id '1' not found");
      expect(mockUserRepo.getUserById).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError when report is RESOLVED", async () => {
      const mockReport = { id: 1, title: "Closed Report", state: ReportState.RESOLVED } as ReportDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);

      await expect(followRepo.follow(1, 1)).rejects.toThrow(BadRequestError);
      await expect(followRepo.follow(1, 1)).rejects.toThrow("Closed reports cannot be followed");
    });

    it("should throw BadRequestError when report is DECLINED", async () => {
      const mockReport = { id: 1, title: "Declined Report", state: ReportState.DECLINED } as ReportDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);

      await expect(followRepo.follow(1, 1)).rejects.toThrow(BadRequestError);
      await expect(followRepo.follow(1, 1)).rejects.toThrow("Closed reports cannot be followed");
    });

    it("should throw error when user not found", async () => {
      const mockReport = { id: 1, title: "Test Report", state: ReportState.ASSIGNED } as ReportDAO;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);
      mockUserRepo.getUserById.mockRejectedValue(new Error("User with id '1' not found"));

      await expect(followRepo.follow(1, 1)).rejects.toThrow("User with id '1' not found");
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  // ===================== followAllPersonal =====================
  describe("followAllPersonal", () => {
    it("should follow all user's reports with default notifyVia", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED } as ReportDAO,
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS } as ReportDAO,
      ];
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const mockFollows = [
        { id: 1, user: mockUser, report: mockReports[0], notifyVia: "web" } as FollowDAO,
        { id: 2, user: mockUser, report: mockReports[1], notifyVia: "web" } as FollowDAO,
      ];

      mockReportRepo.getReportsByUserId.mockResolvedValue(mockReports);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValueOnce(mockFollows[0]).mockResolvedValueOnce(mockFollows[1]);

      const result = await followRepo.followAllPersonal(1);

      expect(result).toEqual(mockFollows);
      expect(mockReportRepo.getReportsByUserId).toHaveBeenCalledWith(1);
      expect(mockUserRepo.getUserById).toHaveBeenCalledTimes(2);
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should skip reports already followed", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", state: ReportState.ASSIGNED } as ReportDAO,
        { id: 2, title: "Report 2", state: ReportState.IN_PROGRESS } as ReportDAO,
      ];
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const existingFollow = { id: 1, user: mockUser, report: mockReports[0], notifyVia: "web" } as FollowDAO;
      const newFollow = { id: 2, user: mockUser, report: mockReports[1], notifyVia: "web" } as FollowDAO;

      mockReportRepo.getReportsByUserId.mockResolvedValue(mockReports);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValueOnce(existingFollow).mockResolvedValueOnce(null);
      mockRepo.save.mockResolvedValue(newFollow);

      const result = await followRepo.followAllPersonal(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(existingFollow);
      expect(result[1]).toEqual(newFollow);
      expect(mockRepo.save).toHaveBeenCalledTimes(1); // Only once for the new follow
    });

    it("should handle custom notifyVia", async () => {
      const mockReports = [{ id: 1, title: "Report 1", state: ReportState.ASSIGNED } as ReportDAO];
      const mockUser = { id: 1, username: "testuser" } as UserDAO;
      const mockFollow = { id: 1, user: mockUser, report: mockReports[0], notifyVia: "telegram" } as FollowDAO;

      mockReportRepo.getReportsByUserId.mockResolvedValue(mockReports);
      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(mockFollow);

      const result = await followRepo.followAllPersonal(1, "telegram");

      expect(result).toEqual([mockFollow]);
      expect(mockRepo.save).toHaveBeenCalledWith({ user: mockUser, report: mockReports[0], notifyVia: "telegram" });
    });

    it("should return empty array when user has no reports", async () => {
      mockReportRepo.getReportsByUserId.mockResolvedValue([]);

      const result = await followRepo.followAllPersonal(1);

      expect(result).toEqual([]);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      const mockReports = [{ id: 1, title: "Report 1", state: ReportState.ASSIGNED } as ReportDAO];

      mockReportRepo.getReportsByUserId.mockResolvedValue(mockReports);
      mockUserRepo.getUserById.mockRejectedValue(new BadRequestError("User not found"));
      mockRepo.findOne.mockResolvedValue(null);

      await expect(followRepo.followAllPersonal(1)).rejects.toThrow(BadRequestError);
    });
  });

  // ===================== unfollow =====================
  describe("unfollow", () => {
    it("should unfollow a report with default notifyVia", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await followRepo.unfollow(1, 1);

      expect(mockRepo.delete).toHaveBeenCalledWith({
         user: 1,
        report: 1,
        notifyVia: "web",
      });
    });

    it("should unfollow a report with custom notifyVia", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await followRepo.unfollow(1, 1, "telegram");

      expect(mockRepo.delete).toHaveBeenCalledWith({
        user: 1,
        report: 1,
        notifyVia: "telegram",
      });
    });

    it("should not throw error when unfollow non-existing follow", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(followRepo.unfollow(1, 1)).resolves.not.toThrow();
    });
  });

  // ===================== unfollowAllByUser =====================
  describe("unfollowAllByUser", () => {
    it("should unfollow all reports by user with default notifyVia", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 3 } as any);

      await followRepo.unfollowAllByUser(1);

      expect(mockRepo.delete).toHaveBeenCalledWith({
        user: { id: 1 },
        notifyVia: "web",
      });
    });

    it("should unfollow all reports by user with custom notifyVia", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 2 } as any);

      await followRepo.unfollowAllByUser(1, "email");

      expect(mockRepo.delete).toHaveBeenCalledWith({
        user: { id: 1 },
        notifyVia: "email",
      });
    });

    it("should not throw error when user has no follows", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(followRepo.unfollowAllByUser(1)).resolves.not.toThrow();
    });
  });
});
