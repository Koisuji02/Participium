import "reflect-metadata";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { AppDataSource } from "../../../src/database/connection";
import { OfficerDAO } from "../../../src/models/dao/OfficerDAO";
import { RoleDAO } from "../../../src/models/dao/RoleDAO";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { Repository } from "typeorm";
import * as authService from "../../../src/services/authService";

jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));
jest.mock("../../../src/repositories/UserRepository");
jest.mock("../../../src/services/authService");

describe("OfficerRepository", () => {
  let officerRepository: OfficerRepository;
  let mockOfficerRepo: jest.Mocked<Repository<OfficerDAO>>;
  let mockRoleRepo: jest.Mocked<Repository<RoleDAO>>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOfficerRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockRoleRepo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockUserRepository = {
      getUserByEmail: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === OfficerDAO) return mockOfficerRepo;
      if (entity === RoleDAO) return mockRoleRepo;
      return {} as any;
    });

    (UserRepository as jest.MockedClass<typeof UserRepository>).mockImplementation(() => mockUserRepository);
    (authService.hashPassword as jest.Mock).mockResolvedValue("hashedPassword123");

    officerRepository = new OfficerRepository();
  });

  describe("getAllOfficers", () => {
    it("should return all officers with their roles", async () => {
      const mockOfficers = [
        { id: 1, username: "officer1", email: "officer1@test.com", roles: [] },
        { id: 2, username: "officer2", email: "officer2@test.com", roles: [] }
      ];

      mockOfficerRepo.find.mockResolvedValue(mockOfficers as any);

      const result = await officerRepository.getAllOfficers();

      expect(mockOfficerRepo.find).toHaveBeenCalledWith({ relations: ["roles"] });
      expect(result).toEqual(mockOfficers);
    });

    it("should return empty array if no officers exist", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      const result = await officerRepository.getAllOfficers();

      expect(result).toEqual([]);
    });
  });

  describe("getAdminOfficers", () => {
    it("should return only admin officers", async () => {
      const mockAdminOfficers = [
        { 
          id: 1, 
          username: "admin1", 
          roles: [{ officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR }] 
        }
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAdminOfficers)
      };

      mockOfficerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await officerRepository.getAdminOfficers();

      expect(mockOfficerRepo.createQueryBuilder).toHaveBeenCalledWith("officer");
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith("officer.roles", "role");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "role.officerRole = :admin",
        { admin: OfficerRole.MUNICIPAL_ADMINISTRATOR }
      );
      expect(result).toEqual(mockAdminOfficers);
    });

    it("should return empty array if no admin officers exist", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      };

      mockOfficerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await officerRepository.getAdminOfficers();

      expect(result).toEqual([]);
    });
  });

  describe("getOfficerByEmail", () => {
    it("should return officer by email", async () => {
      const mockOfficer = { 
        id: 1, 
        email: "test@test.com", 
        username: "test",
        roles: [] 
      };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);

      const result = await officerRepository.getOfficerByEmail("test@test.com");

      expect(mockOfficerRepo.find).toHaveBeenCalledWith({
        where: { email: "test@test.com" },
        relations: ["roles"]
      });
      expect(result).toEqual(mockOfficer);
    });

    it("should throw error if officer not found by email", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      await expect(officerRepository.getOfficerByEmail("notfound@test.com"))
        .rejects
        .toThrow("Officer with email 'notfound@test.com' not found");
    });
  });

  describe("getOfficerById", () => {
    it("should return officer by id", async () => {
      const mockOfficer = { 
        id: 1, 
        email: "test@test.com", 
        username: "test",
        roles: [] 
      };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);

      const result = await officerRepository.getOfficerById(1);

      expect(mockOfficerRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["roles"]
      });
      expect(result).toEqual(mockOfficer);
    });

    it("should throw error if officer not found by id", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      await expect(officerRepository.getOfficerById(999))
        .rejects
        .toThrow("Officer with id '999' not found");
    });
  });

  describe("getOfficersByUsername", () => {
    it("should return officers by username", async () => {
      const mockOfficers = [
        { id: 1, username: "testuser", email: "test1@test.com", roles: [] },
        { id: 2, username: "testuser", email: "test2@test.com", roles: [] }
      ];

      mockOfficerRepo.find.mockResolvedValue(mockOfficers as any);

      const result = await officerRepository.getOfficersByUsername("testuser");

      expect(mockOfficerRepo.find).toHaveBeenCalledWith({
        where: { username: "testuser" },
        relations: ["roles"]
      });
      expect(result).toEqual(mockOfficers);
    });

    it("should return empty array if no officers with username exist", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      const result = await officerRepository.getOfficersByUsername("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getOfficersByOffice", () => {
    it("should return officers by office type", async () => {
      const mockOfficers = [
        { 
          id: 1, 
          username: "officer1",
          roles: [{ officeType: OfficeType.ARCHITECTURAL_BARRIERS }] 
        }
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOfficers)
      };

      mockOfficerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await officerRepository.getOfficersByOffice(OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockOfficerRepo.createQueryBuilder).toHaveBeenCalledWith("officer");
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith("officer.roles", "role");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "role.officeType = :office",
        { office: OfficeType.ARCHITECTURAL_BARRIERS }
      );
      expect(result).toEqual(mockOfficers);
    });

    it("should handle different office types", async () => {
      const officeTypes = [
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.WATER_SUPPLY,
        OfficeType.WASTE,
        OfficeType.OTHER
      ];

      for (const officeType of officeTypes) {
        const mockQueryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([])
        };

        mockOfficerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await officerRepository.getOfficersByOffice(officeType);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          "role.officeType = :office",
          { office: officeType }
        );
      }
    });
  });

  describe("createOfficer", () => {
    it("should create a new officer with roles", async () => {
      const mockCreatedOfficer = { 
        id: 1, 
        username: "newuser",
        name: "Test",
        surname: "User",
        email: "new@test.com",
        password: "hashedPassword123"
      };
      const mockFinalOfficer = {
        ...mockCreatedOfficer,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };

      mockOfficerRepo.find.mockResolvedValueOnce([]) // email check
        .mockResolvedValueOnce([mockFinalOfficer] as any); // getOfficerById
      mockUserRepository.getUserByEmail.mockRejectedValue(new Error("Not found"));
      mockOfficerRepo.create.mockReturnValue(mockCreatedOfficer as any);
      mockOfficerRepo.save.mockResolvedValue(mockCreatedOfficer as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      const result = await officerRepository.createOfficer(
        "newuser",
        "Test",
        "User",
        "new@test.com",
        "plainPassword",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      expect(authService.hashPassword).toHaveBeenCalledWith("plainPassword");
      expect(mockOfficerRepo.create).toHaveBeenCalledWith({
        username: "newuser",
        name: "Test",
        surname: "User",
        email: "new@test.com",
        password: "hashedPassword123"
      });
      expect(mockOfficerRepo.save).toHaveBeenCalled();
      expect(mockRoleRepo.create).toHaveBeenCalled();
      expect(mockRoleRepo.save).toHaveBeenCalled();
    });

    it("should create officer with multiple roles", async () => {
      const mockCreatedOfficer = { 
        id: 2, 
        username: "multiuser",
        email: "multi@test.com"
      };
      const mockFinalOfficer = {
        ...mockCreatedOfficer,
        roles: [
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null },
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      };

      mockOfficerRepo.find.mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockFinalOfficer] as any);
      mockUserRepository.getUserByEmail.mockRejectedValue(new Error("Not found"));
      mockOfficerRepo.create.mockReturnValue(mockCreatedOfficer as any);
      mockOfficerRepo.save.mockResolvedValue(mockCreatedOfficer as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      const result = await officerRepository.createOfficer(
        "multiuser",
        "Multi",
        "Role",
        "multi@test.com",
        "password",
        [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      );

      expect(mockRoleRepo.create).toHaveBeenCalledTimes(2);
    });

    it("should create officer without roles if not provided", async () => {
      const mockCreatedOfficer = { 
        id: 3, 
        username: "noroles",
        email: "noroles@test.com"
      };

      mockOfficerRepo.find.mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockCreatedOfficer] as any);
      mockUserRepository.getUserByEmail.mockRejectedValue(new Error("Not found"));
      mockOfficerRepo.create.mockReturnValue(mockCreatedOfficer as any);
      mockOfficerRepo.save.mockResolvedValue(mockCreatedOfficer as any);

      const result = await officerRepository.createOfficer(
        "noroles",
        "No",
        "Roles",
        "noroles@test.com",
        "password"
      );

      expect(mockRoleRepo.create).not.toHaveBeenCalled();
      expect(mockRoleRepo.save).not.toHaveBeenCalled();
    });

    it("should throw error if email already exists as officer", async () => {
      mockOfficerRepo.find.mockResolvedValue([{ email: "existing@test.com" }] as any);

      await expect(officerRepository.createOfficer(
        "user",
        "Test",
        "User",
        "existing@test.com",
        "password"
      )).rejects.toThrow("Officer with email 'existing@test.com' already exists");
    });

    it("should throw error if email already exists as user", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);
      mockUserRepository.getUserByEmail.mockResolvedValue({ email: "user@test.com" } as any);

      await expect(officerRepository.createOfficer(
        "user",
        "Test",
        "User",
        "user@test.com",
        "password"
      )).rejects.toThrow("Email 'user@test.com' is already used.");
    });

    it("should filter out roles with null role value", async () => {
      const mockCreatedOfficer = { id: 4, username: "filtered", email: "filtered@test.com" };

      mockOfficerRepo.find.mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockCreatedOfficer] as any);
      mockUserRepository.getUserByEmail.mockRejectedValue(new Error("Not found"));
      mockOfficerRepo.create.mockReturnValue(mockCreatedOfficer as any);
      mockOfficerRepo.save.mockResolvedValue(mockCreatedOfficer as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      await officerRepository.createOfficer(
        "filtered",
        "Filter",
        "Test",
        "filtered@test.com",
        "password",
        [
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS },
          { role: null as any, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      );

      expect(mockRoleRepo.create).toHaveBeenCalledTimes(1);
    });

    it("should handle role with null office", async () => {
      const mockCreatedOfficer = { id: 5, username: "nulloffice", email: "null@test.com" };

      mockOfficerRepo.find.mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockCreatedOfficer] as any);
      mockUserRepository.getUserByEmail.mockRejectedValue(new Error("Not found"));
      mockOfficerRepo.create.mockReturnValue(mockCreatedOfficer as any);
      mockOfficerRepo.save.mockResolvedValue(mockCreatedOfficer as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      await officerRepository.createOfficer(
        "nulloffice",
        "Null",
        "Office",
        "null@test.com",
        "password",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      expect(mockRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR,
          officeType: null
        })
      );
    });
  });

  describe("updateOfficer", () => {
    it("should update officer basic information", async () => {
      const mockExistingOfficer = {
        id: 1,
        username: "olduser",
        name: "Old",
        surname: "Name",
        email: "old@test.com",
        roles: []
      };
      const mockUpdatedOfficer = {
        ...mockExistingOfficer,
        username: "newuser",
        name: "New",
        surname: "Name",
        email: "new@test.com"
      };

      mockOfficerRepo.find.mockResolvedValueOnce([mockExistingOfficer] as any)
        .mockResolvedValueOnce([mockUpdatedOfficer] as any);
      mockOfficerRepo.save.mockResolvedValue(mockUpdatedOfficer as any);

      const mockDeleteQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      mockRoleRepo.createQueryBuilder.mockReturnValue(mockDeleteQueryBuilder as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue({} as any);

      const result = await officerRepository.updateOfficer(
        1,
        "newuser",
        "New",
        "Name",
        "new@test.com",
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        OfficeType.ARCHITECTURAL_BARRIERS
      );

      expect(mockOfficerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "newuser",
          name: "New",
          surname: "Name",
          email: "new@test.com"
        })
      );
      expect(mockDeleteQueryBuilder.delete).toHaveBeenCalled();
      expect(mockRoleRepo.create).toHaveBeenCalled();
    });

    it("should update officer without changing roles if role/office not provided", async () => {
      const mockExistingOfficer = {
        id: 1,
        username: "user",
        name: "Test",
        surname: "User",
        email: "test@test.com",
        roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF }]
      };

      mockOfficerRepo.find.mockResolvedValue([mockExistingOfficer] as any);
      mockOfficerRepo.save.mockResolvedValue(mockExistingOfficer as any);

      const result = await officerRepository.updateOfficer(
        1,
        "user",
        "Test",
        "User",
        "test@test.com"
      );

      expect(mockOfficerRepo.save).toHaveBeenCalled();
      expect(mockRoleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should throw error if officer to update does not exist", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      await expect(officerRepository.updateOfficer(
        999,
        "user",
        "Test",
        "User",
        "test@test.com"
      )).rejects.toThrow("Officer with id '999' not found");
    });
  });

  describe("updateOfficerRoles", () => {
    it("should update officer roles", async () => {
      const mockOfficer = {
        id: 1,
        username: "user",
        roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF }]
      };
      const mockUpdatedOfficer = {
        ...mockOfficer,
        roles: [
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null },
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      };

      mockOfficerRepo.find.mockResolvedValueOnce([mockOfficer] as any)
        .mockResolvedValueOnce([mockUpdatedOfficer] as any);

      const mockDeleteQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      mockRoleRepo.createQueryBuilder.mockReturnValue(mockDeleteQueryBuilder as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      const result = await officerRepository.updateOfficerRoles(1, [
        { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
        { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
      ]);

      expect(mockDeleteQueryBuilder.delete).toHaveBeenCalled();
      expect(mockDeleteQueryBuilder.where).toHaveBeenCalledWith("officerID = :id", { id: 1 });
      expect(mockRoleRepo.create).toHaveBeenCalledTimes(2);
      expect(mockRoleRepo.save).toHaveBeenCalled();
    });

    it("should clear all roles if empty array provided", async () => {
      const mockOfficer = {
        id: 1,
        username: "user",
        roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF }]
      };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);

      const mockDeleteQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      mockRoleRepo.createQueryBuilder.mockReturnValue(mockDeleteQueryBuilder as any);

      await officerRepository.updateOfficerRoles(1, []);

      expect(mockDeleteQueryBuilder.execute).toHaveBeenCalled();
      expect(mockRoleRepo.create).not.toHaveBeenCalled();
      expect(mockRoleRepo.save).not.toHaveBeenCalled();
    });

    it("should handle roles with null office", async () => {
      const mockOfficer = { id: 1, username: "user", roles: [] };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);

      const mockDeleteQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      mockRoleRepo.createQueryBuilder.mockReturnValue(mockDeleteQueryBuilder as any);
      mockRoleRepo.create.mockReturnValue({} as any);
      mockRoleRepo.save.mockResolvedValue([] as any);

      await officerRepository.updateOfficerRoles(1, [
        { role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }
      ]);

      expect(mockRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER,
          officeType: null
        })
      );
    });

    it("should throw error if officer does not exist", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      await expect(officerRepository.updateOfficerRoles(999, [
        { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }
      ])).rejects.toThrow("Officer with id '999' not found");
    });
  });

  describe("deleteOfficer", () => {
    it("should delete an existing officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "todelete",
        email: "delete@test.com",
        roles: []
      };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);
      mockOfficerRepo.remove.mockResolvedValue(mockOfficer as any);

      await officerRepository.deleteOfficer(1);

      expect(mockOfficerRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["roles"]
      });
      expect(mockOfficerRepo.remove).toHaveBeenCalledWith(mockOfficer);
    });

    it("should throw error if officer to delete does not exist", async () => {
      mockOfficerRepo.find.mockResolvedValue([]);

      await expect(officerRepository.deleteOfficer(999))
        .rejects
        .toThrow("Officer with id '999' not found");

      expect(mockOfficerRepo.remove).not.toHaveBeenCalled();
    });

    it("should delete officer with multiple roles", async () => {
      const mockOfficer = {
        id: 2,
        username: "multirole",
        roles: [
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR },
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF }
        ]
      };

      mockOfficerRepo.find.mockResolvedValue([mockOfficer] as any);
      mockOfficerRepo.remove.mockResolvedValue(mockOfficer as any);

      await officerRepository.deleteOfficer(2);

      expect(mockOfficerRepo.remove).toHaveBeenCalledWith(mockOfficer);
    });
  });
});