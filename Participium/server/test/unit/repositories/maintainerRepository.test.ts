import "reflect-metadata";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { MaintainerDAO } from "../../../src/models/dao/MaintainerDAO";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { Repository } from "typeorm";

// Mocks
jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    initialize: jest.fn(),
    isInitialized: true,
  },
}));
jest.mock("../../../src/repositories/UserRepository", () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    getUserByEmail: jest.fn(),
  })),
}));
jest.mock("../../../src/repositories/OfficerRepository", () => ({
  OfficerRepository: jest.fn().mockImplementation(() => ({
    getOfficerByEmail: jest.fn(),
  })),
}));
jest.mock("../../../src/services/authService", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashedPassword"),
}));

import { AppDataSource } from "../../../src/database/connection";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { hashPassword } from "../../../src/services/authService";

describe("MaintainerRepository", () => {
  let maintainerRepo: MaintainerRepository;
  let mockRepo: jest.Mocked<Repository<MaintainerDAO>>;
  let userRepoMock: any;
  let officerRepoMock: any;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

    // Mock: restituisci Promise vera
    userRepoMock = { getUserByEmail: jest.fn(() => Promise.reject(new Error("not found"))) };
    officerRepoMock = { getOfficerByEmail: jest.fn(() => Promise.reject(new Error("not found"))) };

    maintainerRepo = new MaintainerRepository();
    (maintainerRepo as any).userRepo = userRepoMock;
    (maintainerRepo as any).officerRepo = officerRepoMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createMaintainer", () => {
    it("should create a new maintainer", async () => {
      const newMaintainer = {
        name: "Test Maintainer",
        email: "test@example.com",
        password: "plainpassword",
        categories: [OfficeType.ARCHITECTURAL_BARRIERS],
        active: true
      };

      const savedMaintainer: MaintainerDAO = {
        id: 1,
        ...newMaintainer,
        password: "hashedPassword"
      };

      // Mock: email non esiste tra i maintainer
      mockRepo.find.mockResolvedValue([]);

      // Mock: email non esiste tra gli user
      userRepoMock.getUserByEmail.mockRejectedValue(new Error("not found"));

      // Mock: email non esiste tra gli officer
      officerRepoMock.getOfficerByEmail.mockRejectedValue(new Error("not found"));

      // Mock: hashing password
      (hashPassword as jest.Mock).mockResolvedValue("hashedPassword");

      // Mock: salvataggio
      mockRepo.save.mockResolvedValue(savedMaintainer);

      const result = await maintainerRepo.createMaintainer(
        newMaintainer.name,
        newMaintainer.email,
        newMaintainer.password,
        newMaintainer.categories,
        newMaintainer.active
      );

      expect(result).toEqual(savedMaintainer);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { email: newMaintainer.email } });
      expect(mockRepo.save).toHaveBeenCalledWith({
        name: newMaintainer.name,
        email: newMaintainer.email,
        password: "hashedPassword",
        categories: newMaintainer.categories,
        active: newMaintainer.active
      });
    });

    it("should throw error if email already exists in maintainers", async () => {
      mockRepo.find.mockResolvedValue([{
        id: 1,
        name: "",
        email: "",
        password: "",
        categories: [],
        active: false
      }]);
      await expect(
        maintainerRepo.createMaintainer(
          "Test Maintainer",
          "test@example.com",
          "password123",
          [OfficeType.ARCHITECTURAL_BARRIERS],
          true
        )
      ).rejects.toThrow("Maintainer with email 'test@example.com' already exists");
    });

    // it("should throw error if email already exists in officers", async () => {
    //   mockRepo.find.mockResolvedValue([]);
    //   officerRepoMock.getOfficerByEmail.mockResolvedValue({ id: 3 });
    //   await expect(
    //     maintainerRepo.createMaintainer(
    //       "Test Maintainer",
    //       "test@example.com",
    //       "password123",
    //       [OfficeType.ARCHITECTURAL_BARRIERS],
    //       true
    //     )
    //   ).rejects.toThrow("Email 'test@example.com' is already used.");
    // });
  });

  describe("getMaintainerById", () => {
    it("should return maintainer by id", async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 1,
      name: "Test Maintainer",
      email: "test@example.com",
      password: "hashedPassword",
      categories: [OfficeType.ARCHITECTURAL_BARRIERS],
      active: true,
    });
      const result = await maintainerRepo.getMaintainerById(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result?.name).toBe("Test Maintainer");
    });

    it("should return null if maintainer not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await maintainerRepo.getMaintainerById(99);
      expect(result).toBeNull();
    });
  });

  describe("getMaintainersByCategory", () => {
    it("should return maintainers by category", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, name: "A", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: true },
        { id: 2, name: "B", email: "b@example.com", password: "hashedPassword", categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS], active: true },
        { id: 3, name: "C", email: "c@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: false },
      ]);
      const result = await maintainerRepo.getMaintainersByCategory(OfficeType.ARCHITECTURAL_BARRIERS);
      expect(result).toEqual([
        { id: 1, name: "A", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: true }
      ]);
    });
  });

  describe("getAllMaintainers", () => {
    it("should return all maintainers", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, name: "A", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: true },
        { id: 2, name: "B", email: "b@example.com", password: "hashedPassword", categories: [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS], active: true }
      ]);
      const result = await maintainerRepo.getAllMaintainers();
      expect(result).toHaveLength(2);
    });
  });

  describe("getMaintainerByEmail", () => {
    it("should return maintainer by email", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, name: "A", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: true }
      ]);
      const result = await maintainerRepo.getMaintainerByEmail("a@example.com");
      expect(result).toEqual({
        id: 1,
        name: "A",
        email: "a@example.com",
        password: "hashedPassword",
        categories: [OfficeType.ARCHITECTURAL_BARRIERS],
        active: true
      });
    });

    it("should throw error if maintainer not found", async () => {
      mockRepo.find.mockResolvedValue([]);
      await expect(
        maintainerRepo.getMaintainerByEmail("notfound@example.com")
      ).rejects.toThrow("Maintainer with email 'notfound@example.com' not found");
    });
  });

  describe("updateMaintainer", () => {
    it("should update maintainer fields", async () => {
      mockRepo.findOne.mockResolvedValue({  id: 1, name: "A", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: true });
      mockRepo.save.mockResolvedValue({ id: 1, name: "B", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: false });
      const result = await maintainerRepo.updateMaintainer(1, { name: "B", active: false });
      expect(mockRepo.save).toHaveBeenCalledWith({ id: 1, name: "B", email: "a@example.com", password: "hashedPassword", categories: [OfficeType.ARCHITECTURAL_BARRIERS], active: false });
      expect(result.name).toBe("B");
      expect(result.active).toBe(false);
    });

    it("should throw error if maintainer not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        maintainerRepo.updateMaintainer(99, { name: "X" })
      ).rejects.toThrow("Maintainer with id '99' not found");
    });
  });
});