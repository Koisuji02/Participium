import "reflect-metadata";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  saveSession,
  getSession,
  deleteSession,
  validateSession,
  addToBlacklist,
  isTokenBlacklisted,
  blacklistUserSessions,
  AuthTokenPayload
} from "../../../src/services/authService";
import { redisClient } from "../../../src/database/connection";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../../../src/database/connection", () => ({
  redisClient: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  }
}));

describe("AuthService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===================== hashPassword =====================
  describe("hashPassword", () => {
    it("should hash a plain password", async () => {
      const plainPassword = "mySecurePassword123";
      const hashedPassword = "$2b$10$hashedPasswordExample";

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword(plainPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(result).toBe(hashedPassword);
    });

    it("should use correct SALT_ROUNDS (10)", async () => {
      const plainPassword = "password";
      
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      await hashPassword(plainPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it("should handle special characters in password", async () => {
      const specialPassword = "P@ssw0rd!#$%";
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_special");

      await hashPassword(specialPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it("should handle empty string password", async () => {
      const emptyPassword = "";
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_empty");

      await hashPassword(emptyPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(emptyPassword, 10);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_long");

      await hashPassword(longPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
    });
  });

  // ===================== verifyPassword =====================
  describe("verifyPassword", () => {
    it("should return true with correct password", async () => {
      const plainPassword = "correctPassword";
      const hashedPassword = "$2b$10$hashedPasswordExample";

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifyPassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it("should return false with incorrect password", async () => {
      const plainPassword = "wrongPassword";
      const hashedPassword = "$2b$10$hashedPasswordExample";

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifyPassword(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it("should handle empty plain password", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifyPassword("", "hashed");

      expect(result).toBe(false);
    });

    it("should handle special characters correctly", async () => {
      const specialPassword = "P@ss!#$%";
      const hashedPassword = "$2b$10$hashedSpecial";

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifyPassword(specialPassword, hashedPassword);

      expect(result).toBe(true);
    });
  });

  // ===================== generateToken =====================
  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const payload: AuthTokenPayload = {
        id: 1,
        username: "testuser",
        type: "user"
      };
      const mockToken = "mock.jwt.token";

      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          username: "testuser",
          type: ["user"]
        }),
        expect.any(String),
        { expiresIn: expect.any(String) }
      );
      expect(result).toBe(mockToken);
    });

    it("should normalize single type to array", () => {
      const payload: AuthTokenPayload = {
        id: 1,
        username: "officer",
        type: OfficerRole.MUNICIPAL_ADMINISTRATOR
      };

      (jwt.sign as jest.Mock).mockReturnValue("token");

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          type: [OfficerRole.MUNICIPAL_ADMINISTRATOR]
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should keep array of types as array", () => {
      const payload: AuthTokenPayload = {
        id: 2,
        username: "multirole",
        type: [OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF]
      };

      (jwt.sign as jest.Mock).mockReturnValue("token");

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          type: [OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF]
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should include isStaff field when provided", () => {
      const payload: AuthTokenPayload = {
        id: 3,
        username: "staff",
        type: "admin",
        isStaff: true
      };

      (jwt.sign as jest.Mock).mockReturnValue("token");

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          isStaff: true
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should include sessionType when provided", () => {
      const payload: AuthTokenPayload = {
        id: 4,
        username: "telegram_user",
        type: "user",
        sessionType: "telegram"
      };

      (jwt.sign as jest.Mock).mockReturnValue("token");

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionType: "telegram"
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should handle multiple officer roles", () => {
      const payload: AuthTokenPayload = {
        id: 5,
        username: "multiofficer",
        type: [
          OfficerRole.MUNICIPAL_ADMINISTRATOR,
          OfficerRole.TECHNICAL_OFFICE_STAFF,
          OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER
        ],
        isStaff: true
      };

      (jwt.sign as jest.Mock).mockReturnValue("token");

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.arrayContaining([
            OfficerRole.MUNICIPAL_ADMINISTRATOR,
            OfficerRole.TECHNICAL_OFFICE_STAFF,
            OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER
          ])
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ===================== verifyToken =====================
  describe("verifyToken", () => {
    it("should verify and decode a valid token", () => {
      const mockToken = "valid.jwt.token";
      const decodedPayload = {
        id: 1,
        username: "testuser",
        type: ["user"]
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      const result = verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
      expect(result).toEqual(decodedPayload);
    });

    it("should throw error with invalid token", () => {
      const invalidToken = "invalid.token";

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => verifyToken(invalidToken))
        .toThrow("Invalid or expired token");
    });

    it("should throw error with expired token", () => {
      const expiredToken = "expired.jwt.token";

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => verifyToken(expiredToken))
        .toThrow("Invalid or expired token");
    });

    it("should throw error with tampered token", () => {
      const tamperedToken = "tampered.jwt.token";

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid signature");
      });

      expect(() => verifyToken(tamperedToken))
        .toThrow("Invalid or expired token");
    });

    it("should decode token with multiple roles", () => {
      const mockToken = "multirole.token";
      const decodedPayload = {
        id: 2,
        username: "officer",
        type: [OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF]
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      const result = verifyToken(mockToken);

      expect(result.type).toHaveLength(2);
    });
  });

  // ===================== saveSession =====================
  describe("saveSession", () => {
    it("should save session in Redis with default values", async () => {
      const mockToken = "token123";
      const decodedPayload = {
        id: 1,
        username: "user",
        type: ["user"],
        isStaff: false
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await saveSession(1, mockToken);

      expect(redisClient.set).toHaveBeenCalledWith(
        "session:1:web",
        expect.stringContaining('"token":"token123"'),
        { EX: 86400 }
      );
    });

    it("should save session with telegram sessionType", async () => {
      const mockToken = "telegram_token";
      const decodedPayload = {
        id: 2,
        username: "tguser",
        type: ["user"],
        sessionType: "telegram"
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await saveSession(2, mockToken, "telegram", 3600);

      expect(redisClient.set).toHaveBeenCalledWith(
        "session:2:telegram",
        expect.stringContaining('"sessionType":"telegram"'),
        { EX: 86400 }
      );
    });

    it("should save session with custom expiration", async () => {
      const mockToken = "custom_token";
      const decodedPayload = { id: 3, username: "user", type: ["user"] };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await saveSession(3, mockToken, "web", 7200);

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { EX: 86400 }
      );
    });

    it("should include type and isStaff in session data", async () => {
      const mockToken = "staff_token";
      const decodedPayload = {
        id: 4,
        username: "officer",
        type: [OfficerRole.MUNICIPAL_ADMINISTRATOR],
        isStaff: true
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await saveSession(4, mockToken);

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"isStaff":true'),
        expect.any(Object)
      );
    });

    it("should include createdAt timestamp", async () => {
      const mockToken = "timestamp_token";
      const decodedPayload = { id: 5, username: "user", type: ["user"] };

      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await saveSession(5, mockToken);

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"createdAt":'),
        expect.any(Object)
      );
    });
  });

  // ===================== getSession =====================
  describe("getSession", () => {
    it("should return session if exists", async () => {
      const sessionData = JSON.stringify({
        token: "token123",
        sessionType: "web",
        type: ["user"],
        isStaff: false,
        createdAt: 123456
      });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);

      const result = await getSession(1, "web");

      expect(redisClient.get).toHaveBeenCalledWith("session:1:web");
      expect(result).toEqual({
        token: "token123",
        sessionType: "web",
        type: ["user"],
        isStaff: false,
        createdAt: 123456
      });
    });

    it("should return null if session does not exist", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await getSession(1, "web");

      expect(result).toBeNull();
    });

    it("should get telegram session", async () => {
      const sessionData = JSON.stringify({
        token: "tg_token",
        sessionType: "telegram",
        createdAt: 123456
      });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);

      const result = await getSession(2, "telegram");

      expect(redisClient.get).toHaveBeenCalledWith("session:2:telegram");
      expect(result?.sessionType).toBe("telegram");
    });

    it("should parse session data correctly", async () => {
      const sessionData = JSON.stringify({
        token: "complex_token",
        sessionType: "web",
        type: [OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF],
        isStaff: true,
        createdAt: 999999
      });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);

      const result = await getSession(3, "web");

      expect(result).toHaveProperty("type");
      expect(Array.isArray(result?.type)).toBe(true);
    });
  });

  // ===================== deleteSession =====================
  describe("deleteSession", () => {
    it("should delete session from Redis", async () => {
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await deleteSession(1, "web");

      expect(redisClient.del).toHaveBeenCalledWith("session:1:web");
    });

    it("should delete telegram session", async () => {
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await deleteSession(2, "telegram");

      expect(redisClient.del).toHaveBeenCalledWith("session:2:telegram");
    });

    it("should handle deletion of non-existent session", async () => {
      (redisClient.del as jest.Mock).mockResolvedValue(0);

      await deleteSession(999, "web");

      expect(redisClient.del).toHaveBeenCalledWith("session:999:web");
    });
  });

  // ===================== validateSession =====================
  describe("validateSession", () => {
    it("should return false if token is blacklisted", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue("blacklisted");

      const result = await validateSession(1, "token123", "web");

      expect(result).toBe(false);
    });

    it("should return true if session is valid and not blacklisted", async () => {
      (redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // isTokenBlacklisted
        .mockResolvedValueOnce(JSON.stringify({ token: "token123", sessionType: "web", createdAt: 123456 }));

      const result = await validateSession(1, "token123", "web");

      expect(result).toBe(true);
    });

    it("should return false if session does not exist", async () => {
      (redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // isTokenBlacklisted
        .mockResolvedValueOnce(null); // getSession

      const result = await validateSession(1, "token123", "web");

      expect(result).toBe(false);
    });

    it("should return false if token does not match", async () => {
      (redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // isTokenBlacklisted
        .mockResolvedValueOnce(JSON.stringify({ token: "otherToken", sessionType: "web", createdAt: 123456 }));

      const result = await validateSession(1, "token123", "web");

      expect(result).toBe(false);
    });

    it("should validate telegram session correctly", async () => {
      (redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ token: "tg_token", sessionType: "telegram", createdAt: 123456 }));

      const result = await validateSession(2, "tg_token", "telegram");

      expect(result).toBe(true);
    });
  });

  // ===================== addToBlacklist =====================
  describe("addToBlacklist", () => {
    it("should add token to blacklist with ttl", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await addToBlacklist("token123", "test-reason");

      expect(redisClient.set).toHaveBeenCalledWith(
        "blacklist:token123",
        expect.stringContaining('"reason":"test-reason"'),
        { EX: expect.any(Number) }
      );
    });

    it("should not add if ttl is negative", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 10 });

      await addToBlacklist("token123", "expired");

      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it("should use default ttl if exp is not present", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({});
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await addToBlacklist("token_no_exp");

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { EX: 86400 }
      );
    });

    it("should use default reason if not provided", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await addToBlacklist("token123");

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"reason":"revoked"'),
        expect.any(Object)
      );
    });

    it("should include blacklistedAt timestamp", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await addToBlacklist("token123", "logout");

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"blacklistedAt":'),
        expect.any(Object)
      );
    });

    it("should not add with ttl of 0", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) });

      await addToBlacklist("token123", "zero-ttl");

      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  // ===================== isTokenBlacklisted =====================
  describe("isTokenBlacklisted", () => {
    it("should return true if token is blacklisted", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ reason: "revoked" }));

      const result = await isTokenBlacklisted("token123");

      expect(redisClient.get).toHaveBeenCalledWith("blacklist:token123");
      expect(result).toBe(true);
    });

    it("should return false if token is not blacklisted", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await isTokenBlacklisted("token123");

      expect(result).toBe(false);
    });

    it("should check correct blacklist key format", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      await isTokenBlacklisted("my_token_123");

      expect(redisClient.get).toHaveBeenCalledWith("blacklist:my_token_123");
    });
  });

  // ===================== blacklistUserSessions =====================
  describe("blacklistUserSessions", () => {
    it("should blacklist and delete session if exists", async () => {
      const sessionData = JSON.stringify({ token: "token123", sessionType: "web", createdAt: 123456 });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await blacklistUserSessions(1, "web", "logout");

      expect(redisClient.set).toHaveBeenCalledWith(
        "blacklist:token123",
        expect.stringContaining('"reason":"logout"'),
        { EX: expect.any(Number) }
      );
      expect(redisClient.del).toHaveBeenCalledWith("session:1:web");
    });

    it("should not do anything if session does not exist", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      await blacklistUserSessions(1, "web", "logout");

      expect(redisClient.set).not.toHaveBeenCalled();
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it("should use default reason if not provided", async () => {
      const sessionData = JSON.stringify({ token: "token123", sessionType: "web", createdAt: 123456 });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await blacklistUserSessions(1, "web");

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"reason":"revoked"'),
        expect.any(Object)
      );
    });

    it("should handle telegram sessions", async () => {
      const sessionData = JSON.stringify({ token: "tg_token", sessionType: "telegram", createdAt: 123456 });

      (redisClient.get as jest.Mock).mockResolvedValue(sessionData);
      (jwt.verify as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1000 });
      (redisClient.set as jest.Mock).mockResolvedValue("OK");
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await blacklistUserSessions(2, "telegram", "telegram_changed");

      expect(redisClient.set).toHaveBeenCalledWith(
        "blacklist:tg_token",
        expect.stringContaining('"reason":"telegram_changed"'),
        expect.any(Object)
      );
      expect(redisClient.del).toHaveBeenCalledWith("session:2:telegram");
    });
  });
});
