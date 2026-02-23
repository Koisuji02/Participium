import "reflect-metadata";
jest.mock('@services/authService', () => {
  const original = jest.requireActual('@services/authService');
  return {
    ...original,
    saveSession: jest.fn().mockResolvedValue(undefined),
  };
});

import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import * as authController from "../../../src/controllers/authController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import * as authService from "../../../src/services/authService";

describe("Auth Controller Integration Tests", () => {
  let userRepo: UserRepository;
  let officerRepo: OfficerRepository;
  let maintainerRepo: MaintainerRepository;

  beforeAll(async () => {
    await initializeTestDatabase();
    userRepo = new UserRepository();
    officerRepo = new OfficerRepository();
    maintainerRepo = new MaintainerRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  // Helper function to create and activate a user
  async function createActiveUser(username: string, firstName: string, lastName: string, email: string, password: string) {
    const user = await userRepo.createUser(username, firstName, lastName, email, password);
    const repo = (userRepo as any).repo;
    user.isActive = true;
    await repo.save(user);
    return user;
  }

  // ===================== loginUserByUsername =====================
  describe("loginUserByUsername", () => {
    it("should login user with valid username and password", async () => {
      await createActiveUser("testuser", "Test", "User", "test@example.com", "Password@123");
      const token = await authController.loginUserByUsername("testuser", "Password@123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      await expect(authController.loginUserByUsername("nonexistent", "Password@123"))
        .rejects.toThrow("User with username 'nonexistent' not found");
    });

    it("should throw error when password is incorrect", async () => {
      await createActiveUser("testuser2", "Test", "User", "test2@example.com", "Password@123");

      await expect(authController.loginUserByUsername("testuser2", "WrongPassword"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should throw error when user is not active", async () => {
      await userRepo.createUser("inactive", "Inactive", "User", "inactive@example.com", "Password@123");

      await expect(authController.loginUserByUsername("inactive", "Password@123"))
        .rejects.toThrow("User account is not active");
    });

    it("should call saveSession with correct session type", async () => {
      await createActiveUser("webuser", "Web", "User", "web@example.com", "Password@123");

      await authController.loginUserByUsername("webuser", "Password@123");

      expect(authService.saveSession).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        "web"
      );
    });

    it("should handle username with special characters", async () => {
      await createActiveUser("user_123", "Special", "User", "special@example.com", "Password@123");

      const token = await authController.loginUserByUsername("user_123", "Password@123");

      expect(token).toBeDefined();
    });
  });

  // ===================== loginUserByMail =====================
  describe("loginUserByMail", () => {
    it("should login user with valid email and password", async () => {
      await createActiveUser("emailuser", "Email", "User", "email@example.com", "Password@123");

      const token = await authController.loginUserByMail("email@example.com", "Password@123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should throw error when email not found", async () => {
      await expect(authController.loginUserByMail("nonexistent@example.com", "Password@123"))
        .rejects.toThrow("User with email 'nonexistent@example.com' not found");
    });

    it("should throw error when password is incorrect", async () => {
      await createActiveUser("testuser3", "Test", "User", "test3@example.com", "Password@123");

      await expect(authController.loginUserByMail("test3@example.com", "WrongPassword"))
        .rejects.toThrow("Invalid email or password");
    });

    it("should throw error when user is not active", async () => {
      await userRepo.createUser("inactive2", "Inactive", "User", "inactive2@example.com", "Password@123");

      await expect(authController.loginUserByMail("inactive2@example.com", "Password@123"))
        .rejects.toThrow("User account is not active");
    });
    it("should save session with web type for email login", async () => {
      await createActiveUser("emailuser2", "Email", "User2", "email2@example.com", "Password@123");

      await authController.loginUserByMail("email2@example.com", "Password@123");

      expect(authService.saveSession).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        "web"
      );
    });

    it("should handle email with various formats", async () => {
      await createActiveUser("complex", "Complex", "Email", "user+tag@sub.domain.com", "Password@123");

      const token = await authController.loginUserByMail("user+tag@sub.domain.com", "Password@123");

      expect(token).toBeDefined();
    });  });

  // ===================== loginUser =====================
  describe("loginUser", () => {
    it("should login user with email when isEmail is true", async () => {
      await createActiveUser("user1", "User", "One", "user1@example.com", "Password@123");

      const token = await authController.loginUser("user1@example.com", "Password@123", true);

      expect(token).toBeDefined();
    });

    it("should login user with username when isEmail is false", async () => {
      await createActiveUser("user2", "User", "Two", "user2@example.com", "Password@123");

      const token = await authController.loginUser("user2", "Password@123", false);

      expect(token).toBeDefined();
    });
  });

  // ===================== loginOfficerByMail =====================
  describe("loginOfficerByMail", () => {
    it("should login officer with valid email and password", async () => {
      await officerRepo.createOfficer(
        "officer1",
        "Officer",
        "One",
        "officer1@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const token = await authController.loginOfficerByMail("officer1@example.com", "Password@123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should login officer with multiple roles", async () => {
      await officerRepo.createOfficer(
        "multirole",
        "Multi",
        "Role",
        "multirole@example.com",
        "Password@123",
        [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      );

      const token = await authController.loginOfficerByMail("multirole@example.com", "Password@123");

      expect(token).toBeDefined();
    });

    it("should throw error when officer not found", async () => {
      await expect(authController.loginOfficerByMail("nonexistent@example.com", "Password@123"))
        .rejects.toThrow("Officer with email 'nonexistent@example.com' not found");
    });

    it("should throw error when password is incorrect", async () => {
      await officerRepo.createOfficer(
        "officer2",
        "Officer",
        "Two",
        "officer2@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      await expect(authController.loginOfficerByMail("officer2@example.com", "WrongPassword"))
        .rejects.toThrow("Invalid email or password");
    });

    it("should login officer with TECHNICAL_OFFICE_STAFF role", async () => {
      await officerRepo.createOfficer(
        "techstaff",
        "Tech",
        "Staff",
        "tech@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const token = await authController.loginOfficerByMail("tech@example.com", "Password@123");

      expect(token).toBeDefined();
    });

    it("should login officer with MUNICIPAL_PUBLIC_RELATIONS_OFFICER role", async () => {
      await officerRepo.createOfficer(
        "prstaff",
        "PR",
        "Staff",
        "pr@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      );

      const token = await authController.loginOfficerByMail("pr@example.com", "Password@123");

      expect(token).toBeDefined();
    });

    it("should save session with correct parameters for officer", async () => {
      await officerRepo.createOfficer(
        "officer7",
        "Officer",
        "Seven",
        "officer7@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      await authController.loginOfficerByMail("officer7@example.com", "Password@123");

      expect(authService.saveSession).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        "web"
      );
    });
  });

  // ===================== loginOfficerByUsername =====================
  describe("loginOfficerByUsername", () => {
    it("should login officer with valid username and password", async () => {
      await officerRepo.createOfficer(
        "officer3",
        "Officer",
        "Three",
        "officer3@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const token = await authController.loginOfficerByUsername("officer3", "Password@123");

      expect(token).toBeDefined();
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should throw error when officer not found", async () => {
      await expect(authController.loginOfficerByUsername("nonexistent", "Password@123"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should throw error when password is incorrect", async () => {
      await officerRepo.createOfficer(
        "officer4",
        "Officer",
        "Four",
        "officer4@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      await expect(authController.loginOfficerByUsername("officer4", "WrongPassword"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should login officer with multiple roles using username", async () => {
      await officerRepo.createOfficer(
        "multirole2",
        "Multi",
        "Role2",
        "multirole2@example.com",
        "Password@123",
        [
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS },
          { role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }
        ]
      );

      const token = await authController.loginOfficerByUsername("multirole2", "Password@123");

      expect(token).toBeDefined();
    });

    it("should handle officer username with spaces", async () => {
      await officerRepo.createOfficer(
        "officer with space",
        "Officer",
        "Space",
        "officerspace@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const token = await authController.loginOfficerByUsername("officer with space", "Password@123");

      expect(token).toBeDefined();
    });
  });

  // ===================== loginOfficer =====================
  describe("loginOfficer", () => {
    it("should login officer with email when isEmail is true", async () => {
      await officerRepo.createOfficer(
        "officer5",
        "Officer",
        "Five",
        "officer5@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const token = await authController.loginOfficer("officer5@example.com", "Password@123", true);

      expect(token).toBeDefined();
    });

    it("should login officer with username when isEmail is false", async () => {
      await officerRepo.createOfficer(
        "officer6",
        "Officer",
        "Six",
        "officer6@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );

      const token = await authController.loginOfficer("officer6", "Password@123", false);

      expect(token).toBeDefined();
    });
  });

  // ===================== getUserByTelegramUsername =====================
  describe("getUserByTelegramUsername", () => {
    it("should login user with telegram username", async () => {
      const user = await createActiveUser("telegram", "Telegram", "User", "telegram@example.com", "Password@123");
      await userRepo.updateProfile(user.id, { telegramUsername: "telegram_user" });

      const token = await authController.getUserByTelegramUsername("telegram_user", 12345);

      expect(token).toBeDefined();
      expect(authService.saveSession).toHaveBeenCalled();
      expect(authService.saveSession).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        "telegram"
      );
    });

    it("should throw error when telegram username not found", async () => {
      await expect(authController.getUserByTelegramUsername("nonexistent_tg", 12345))
        .rejects.toThrow("User with telegram username 'nonexistent_tg' not found");
    });

    it("should save session with correct chatId", async () => {
      const user = await createActiveUser("tguser2", "TG", "User2", "tg2@example.com", "Password@123");
      await userRepo.updateProfile(user.id, { telegramUsername: "tg_user_2" });
      const chatId = 99999;

      await authController.getUserByTelegramUsername("tg_user_2", chatId);

      expect(authService.saveSession).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        "telegram"
      );
    });

    it("should handle telegram username with special characters", async () => {
      const user = await createActiveUser("specialtg", "Special", "TG", "specialtg@example.com", "Password@123");
      await userRepo.updateProfile(user.id, { telegramUsername: "user_with_underscores_123" });

      const token = await authController.getUserByTelegramUsername("user_with_underscores_123", 54321);

      expect(token).toBeDefined();
    });
  });

  // ===================== loginMaintainerByMail =====================
  describe("loginMaintainerByMail", () => {
    it("should login maintainer with valid email and password", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer One",
        "maintainer1@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const token = await authController.loginMaintainerByMail("maintainer1@example.com", "Password@123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should login maintainer with multiple categories", async () => {
      await maintainerRepo.createMaintainer(
        "Multi Maintainer",
        "multi@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS, OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS],
        true
      );

      const token = await authController.loginMaintainerByMail("multi@example.com", "Password@123");

      expect(token).toBeDefined();
    });

    it("should throw error when maintainer not found", async () => {
      await expect(authController.loginMaintainerByMail("nonexistent@example.com", "Password@123"))
        .rejects.toThrow("Maintainer with email 'nonexistent@example.com' not found");
    });

    it("should throw error when password is incorrect", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Two",
        "maintainer2@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      await expect(authController.loginMaintainerByMail("maintainer2@example.com", "WrongPassword"))
        .rejects.toThrow("Invalid email or password");
    });

    it("should save session with correct session type for maintainer", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Seven",
        "maintainer7@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      await authController.loginMaintainerByMail("maintainer7@example.com", "Password@123");

      expect(authService.saveSession).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        "web"
      );
    });

    it("should login maintainer with all office types", async () => {
      await maintainerRepo.createMaintainer(
        "All Categories",
        "allcat@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS, OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.PUBLIC_LIGHTING, OfficeType.WATER_SUPPLY,
         OfficeType.WASTE, OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS, OfficeType.ROADS_AND_URBAN_FURNISHINGS, OfficeType.OTHER],
        true
      );

      const token = await authController.loginMaintainerByMail("allcat@example.com", "Password@123");

      expect(token).toBeDefined();
    });
  });

  // ===================== loginMaintainerByUsername =====================
  describe("loginMaintainerByUsername", () => {
    it("should login maintainer with valid username and password", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Three",
        "maintainer3@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const token = await authController.loginMaintainerByUsername("Maintainer Three", "Password@123");

      expect(token).toBeDefined();
      expect(authService.saveSession).toHaveBeenCalled();
    });

    it("should throw error when maintainer not found", async () => {
      await expect(authController.loginMaintainerByUsername("Nonexistent Maintainer", "Password@123"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should throw error when password is incorrect", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Four",
        "maintainer4@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      await expect(authController.loginMaintainerByUsername("Maintainer Four", "WrongPassword"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should login maintainer with ENVIRONMENT category", async () => {
      await maintainerRepo.createMaintainer(
        "Environment Maintainer",
        "env@example.com",
        "Password@123",
        [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS],
        true
      );

      const token = await authController.loginMaintainerByUsername("Environment Maintainer", "Password@123");

      expect(token).toBeDefined();
    });

    it("should handle maintainer name with special characters", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer's Company & Co.",
        "special@example.com",
        "Password@123",
        [OfficeType.WASTE],
        true
      );

      const token = await authController.loginMaintainerByUsername("Maintainer's Company & Co.", "Password@123");

      expect(token).toBeDefined();
    });
  });

  // ===================== loginMaintainer =====================
  describe("loginMaintainer", () => {
    it("should login maintainer with email when isEmail is true", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Five",
        "maintainer5@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const token = await authController.loginMaintainer("maintainer5@example.com", "Password@123", true);

      expect(token).toBeDefined();
    });

    it("should login maintainer with username when isEmail is false", async () => {
      await maintainerRepo.createMaintainer(
        "Maintainer Six",
        "maintainer6@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const token = await authController.loginMaintainer("Maintainer Six", "Password@123", false);

      expect(token).toBeDefined();
    });
  });

  // ===================== Edge Cases and Security =====================
  describe("Edge Cases and Security", () => {
    it("should handle user without password field", async () => {
      const user = await createActiveUser("nopass", "No", "Pass", "nopass@example.com", "Password@123");
      const repo = (userRepo as any).repo;
      user.password = "";
      await repo.save(user);

      await expect(authController.loginUserByUsername("nopass", "Password@123"))
        .rejects.toThrow("Invalid username or password");
    });

    it("should handle officer without password field", async () => {
      const officer = await officerRepo.createOfficer(
        "nopassofficer",
        "No",
        "Pass",
        "nopass@officer.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );
      const repo = (officerRepo as any).repo;
      officer.password = "";
      await repo.save(officer);

      await expect(authController.loginOfficerByMail("nopass@officer.com", "Password@123"))
        .rejects.toThrow("Invalid email or password");
    });

    it("should handle maintainer without password field", async () => {
      const maintainer = await maintainerRepo.createMaintainer(
        "No Pass Maintainer",
        "nopass@maintainer.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );
      const repo = (maintainerRepo as any).repo;
      maintainer.password = "";
      await repo.save(maintainer);

      await expect(authController.loginMaintainerByMail("nopass@maintainer.com", "Password@123"))
        .rejects.toThrow("Invalid email or password");
    });

    it("should generate different tokens for different users", async () => {
      await createActiveUser("user1", "User", "One", "user1@test.com", "Password@123");
      await createActiveUser("user2", "User", "Two", "user2@test.com", "Password@123");

      const token1 = await authController.loginUserByUsername("user1", "Password@123");
      const token2 = await authController.loginUserByUsername("user2", "Password@123");

      expect(token1).not.toBe(token2);
    });

    it("should handle officer with no roles", async () => {
      await officerRepo.createOfficer(
        "noroles",
        "No",
        "Roles",
        "noroles@example.com",
        "Password@123",
        []
      );

      const token = await authController.loginOfficerByMail("noroles@example.com", "Password@123");

      expect(token).toBeDefined();
    });

    it("should handle very long passwords", async () => {
      const longPassword = "A1!" + "a".repeat(100);
      await createActiveUser("longpass", "Long", "Pass", "longpass@example.com", longPassword);

      const token = await authController.loginUserByUsername("longpass", longPassword);

      expect(token).toBeDefined();
    });

    it("should handle empty string password differently from wrong password", async () => {
      await createActiveUser("emptytest", "Empty", "Test", "empty@example.com", "Password@123");

      await expect(authController.loginUserByUsername("emptytest", ""))
        .rejects.toThrow("Invalid username or password");
    });

    it("should handle case sensitive usernames", async () => {
      await createActiveUser("CaseSensitive", "Case", "User", "case@example.com", "Password@123");

      await expect(authController.loginUserByUsername("casesensitive", "Password@123"))
        .rejects.toThrow("User with username 'casesensitive' not found");
    });

    it("should handle case sensitive emails", async () => {
      await createActiveUser("emailcase", "Email", "Case", "EmailCase@example.com", "Password@123");

      await expect(authController.loginUserByMail("emailcase@example.com", "Password@123"))
        .rejects.toThrow("User with email 'emailcase@example.com' not found");
    });

    it("should verify token generation includes user id", async () => {
      const user = await createActiveUser("tokentest", "Token", "Test", "token@example.com", "Password@123");

      const token = await authController.loginUserByUsername("tokentest", "Password@123");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should save session for each login attempt", async () => {
      await createActiveUser("sessiontest", "Session", "Test", "session@example.com", "Password@123");

      await authController.loginUserByUsername("sessiontest", "Password@123");
      await authController.loginUserByUsername("sessiontest", "Password@123");

      expect(authService.saveSession).toHaveBeenCalledTimes(2);
    });

    it("should handle telegram user without chatId in profile", async () => {
      const user = await createActiveUser("tgnull", "TG", "Null", "tgnull@example.com", "Password@123");
      await userRepo.updateProfile(user.id, { telegramUsername: "tg_null" });

      const token = await authController.getUserByTelegramUsername("tg_null", 0);

      expect(token).toBeDefined();
    });
  });
});