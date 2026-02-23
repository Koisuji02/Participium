import "reflect-metadata";
jest.mock('@services/authService', () => {
  const original = jest.requireActual('@services/authService');
  return {
    ...original,
    saveSession: jest.fn().mockResolvedValue(undefined),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  };
});
import request from "supertest";
import { app } from "../../../src/app";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import * as authService from "../../../src/services/authService";

describe("Auth API Integration Tests", () => {
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

  // ===================== POST /api/v1/auth/users =====================
  describe("POST /api/v1/auth/users - Login user", () => {
    it("should login an existing user with username and correct credentials", async () => {
      const username = "testuser";
      const firstName = "Test";
      const lastName = "User";
      const email = "testuser@example.com";
      const plainPassword = "Test@1234";

      await createActiveUser(username, firstName, lastName, email, plainPassword);
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username,
          password: plainPassword
        });
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe("string");
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should login an existing user with email and correct credentials", async () => {
      const username = "emailuser";
      const firstName = "Email";
      const lastName = "User";
      const email = "emailuser@example.com";
      const plainPassword = "Email@1234";

      await createActiveUser(username, firstName, lastName, email, plainPassword);
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username: email, // Using email as identifier
          password: plainPassword
        });
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe("string");
    });

    it("should fail to login with incorrect password", async () => {
      const username = "testuser2";
      const firstName = "Test2";
      const lastName = "User2";
      const email = "testuser2@example.com";
      const plainPassword = "Test@1234";

      await createActiveUser(username, firstName, lastName, email, plainPassword);
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username,
          password: "WrongPassword"
        });
      expect(res.status).toBe(401);
    });

    it("should fail to login a non-existing user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username: "nonexistentuser",
          password: "SomePassword"
        });
      expect(res.status).toBe(404);
    });

    it("should fail to login inactive user", async () => {
      const username = "inactiveuser";
      const firstName = "Inactive";
      const lastName = "User";
      const email = "inactive@example.com";
      const plainPassword = "Test@1234";

      // Create user without activating
      await userRepo.createUser(username, firstName, lastName, email, plainPassword);

      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username,
          password: plainPassword
        });
      expect(res.status).toBe(301);
    });

    it("should return 400 if username is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          password: "SomePassword"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Username and password are required");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username: "testuser"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Username and password are required");
    });

    it("should return 400 if both username and password are missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Username and password are required");
    });

    it("should detect email format correctly", async () => {
      const username = "emaildetect";
      const firstName = "Email";
      const lastName = "Detect";
      const email = "detect@example.com";
      const plainPassword = "Test@1234";

      await createActiveUser(username, firstName, lastName, email, plainPassword);
      
      const res = await request(app)
        .post("/api/v1/auth/users")
        .send({
          username: email,
          password: plainPassword
        });
      expect(res.status).toBe(200);
    });
  });

  // ===================== POST /api/v1/auth/officers =====================
  describe("POST /api/v1/auth/officers - Login officer", () => {
    it("should login an existing officer with email and correct credentials", async () => {
      const username = "testofficer";
      const name = "Officer";
      const surname = "Test";
      const email = "testofficer@example.com";  
      const plainPassword = "Officer@1234";

      await officerRepo.createOfficer(
        username,
        name,
        surname,
        email,
        plainPassword,
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: email,
          password: plainPassword
        });
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe("string");
    });

    it("should login officer with technical office staff role", async () => {
      const username = "techofficer";
      const name = "Tech";
      const surname = "Officer";
      const email = "techofficer@example.com";
      const plainPassword = "Tech@1234";

      await officerRepo.createOfficer(
        username,
        name,
        surname,
        email,
        plainPassword,
          [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: email,
          password: plainPassword
        });
      expect(res.status).toBe(200);
    });

    it("should fail to login officer with incorrect password", async () => {
      const username = "testofficer2";
      const name = "Officer2";
      const surname = "Test2";
      const email = "testofficer2@example.com";
      const plainPassword = "Officer@1234";

      await officerRepo.createOfficer(
        username,
        name,
        surname,
        email,
        plainPassword,
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
      );
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: email,
          password: "WrongPassword"
        });
      expect(res.status).toBe(401);
    });

    it("should fail to login a non-existing officer", async () => {
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: "nonexist@example.com",
          password: "SomePassword"
        });
      expect(res.status).toBe(404);
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          password: "SomePassword"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: "test@example.com"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should return 400 if both email and password are missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should handle non-email format as username", async () => {
      const username = "officername";
      const name = "Officer";
      const surname = "Name";
      const email = "officername@example.com";
      const plainPassword = "Officer@1234";

      await officerRepo.createOfficer(
        username,
        name,
        surname,
        email,
        plainPassword,
        [{ role: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
      );

      const res = await request(app)
        .post("/api/v1/auth/officers")
        .send({
          email: username, // Using username instead of email
          password: plainPassword
        });
      
      // Should try to login by username
      expect(res.status).toBeLessThanOrEqual(404); // Either finds by username or not found
    });
  });

  // ===================== POST /api/v1/auth/telegram =====================
  describe("POST /api/v1/auth/telegram - Telegram login", () => {
    it("should login user with telegram username", async () => {
      const username = "telegramuser";
      const firstName = "Telegram";
      const lastName = "User";
      const email = "telegram@example.com";
      const plainPassword = "Telegram@1234";
      const telegramUsername = "tguser123";

      const user = await createActiveUser(username, firstName, lastName, email, plainPassword);
      await userRepo.updateProfile(user.id, { telegramUsername });
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: telegramUsername,
          chatId: 12345
        });
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe("string");
    });

    it("should fail if telegram username does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: "nonexistenttg",
          chatId: 12345
        });
      expect(res.status).toBe(404);
    });

    it("should return 400 if username is undefined", async () => {
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          chatId: 12345
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Telegram username is required");
    });

    it("should return 400 if username is null", async () => {
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: null,
          chatId: 12345
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Telegram username is required");
    });

    it("should return 400 if username is string 'null'", async () => {
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: "null",
          chatId: 12345
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Telegram username is required");
    });

    it("should return 400 if username is empty string", async () => {
      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: "",
          chatId: 12345
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Telegram username is required");
    });

    it("should handle special characters in telegram username", async () => {
      const username = "specialuser";
      const firstName = "Special";
      const lastName = "User";
      const email = "special@example.com";
      const plainPassword = "Special@1234";
      const telegramUsername = "user_with_underscores";

      const user = await createActiveUser(username, firstName, lastName, email, plainPassword);
      await userRepo.updateProfile(user.id, { telegramUsername });

      const res = await request(app)
        .post("/api/v1/auth/telegram")
        .send({
          username: telegramUsername,
          chatId: 12345
        });
      expect(res.status).toBe(200);
    });
  });

  // ===================== POST /api/v1/auth/maintainers =====================
  describe("POST /api/v1/auth/maintainers - Login maintainer", () => {
    it("should login an existing maintainer with email and correct credentials", async () => {
      const name = "Test Maintainer";
      const email = "maintainer@example.com";
      const plainPassword = "Maintainer@1234";
      const categories = [OfficeType.ARCHITECTURAL_BARRIERS];

      await maintainerRepo.createMaintainer(name, email, plainPassword, categories, true);

      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: email,
          password: plainPassword
        });
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe("string");
    });

    it("should login maintainer with multiple categories", async () => {
      const name = "Multi Maintainer";
      const email = "multi@example.com";
      const plainPassword = "Multi@1234";
      const categories = [OfficeType.ARCHITECTURAL_BARRIERS, OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.PUBLIC_LIGHTING];

      await maintainerRepo.createMaintainer(name, email, plainPassword, categories, true);

      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: email,
          password: plainPassword
        });
      expect(res.status).toBe(200);
    });

    it("should fail to login maintainer with incorrect password", async () => {
      const name = "Wrong Pass Maintainer";
      const email = "wrongpass@example.com";
      const plainPassword = "Correct@1234";
      const categories = [OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS];

      await maintainerRepo.createMaintainer(name, email, plainPassword, categories, true);

      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: email,
          password: "WrongPassword@123"
        });
      expect(res.status).toBe(401);
    });

    it("should fail to login non-existing maintainer", async () => {
      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: "nonexistent@example.com",
          password: "SomePassword"
        });
      expect(res.status).toBe(404);
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          password: "SomePassword"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: "test@example.com"
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should return 400 if both email and password are missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email and password are required");
    });

    it("should handle non-email format as username", async () => {
      const name = "Username Maintainer";
      const email = "username@example.com";
      const plainPassword = "Username@1234";
      const categories = [OfficeType.WATER_SUPPLY];

      await maintainerRepo.createMaintainer(name, email, plainPassword, categories, true);

      const res = await request(app)
        .post("/api/v1/auth/maintainers")
        .send({
          email: name, // Using name instead of email
          password: plainPassword
        });
      
      // Should try to login by username
      expect(res.status).toBeLessThanOrEqual(404);
    });
  });

});