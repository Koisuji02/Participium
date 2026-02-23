import { generateOtp, verifyOtp, clearOtp } from "../../../src/services/otpService";
import { redisClient } from "../../../src/database/connection";

// Mock Redis client
jest.mock("../../../src/database/connection", () => ({
  redisClient: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

describe("OTP Service - Unit Tests", () => {
  let mockRedisClient: jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
  });

  describe("generateOtp", () => {
    it("should generate a 6-digit OTP code", async () => {
      mockRedisClient.set.mockResolvedValue("OK" as any);

      const email = "test@example.com";
      const otp = await generateOtp(email);

      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it("should store OTP in Redis with correct key and default TTL", async () => {
      mockRedisClient.set.mockResolvedValue("OK" as any);

      const email = "user@example.com";
      const otp = await generateOtp(email);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "participium:otp:email:user@example.com",
        otp,
        { EX: 30 * 60 }
      );
    });

    it("should store OTP with custom TTL when provided", async () => {
      mockRedisClient.set.mockResolvedValue("OK" as any);

      const email = "user@example.com";
      const customTtl = 600; // 10 minutes
      const otp = await generateOtp(email, customTtl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "participium:otp:email:user@example.com",
        otp,
        { EX: customTtl }
      );
    });

    it("should generate different codes for different emails", async () => {
      mockRedisClient.set.mockResolvedValue("OK" as any);

      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      await generateOtp(email1);
      await generateOtp(email2);

      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.set).toHaveBeenNthCalledWith(
        1,
        "participium:otp:email:user1@example.com",
        expect.any(String),
        { EX: 30 * 60 }
      );
      expect(mockRedisClient.set).toHaveBeenNthCalledWith(
        2,
        "participium:otp:email:user2@example.com",
        expect.any(String),
        { EX: 30 * 60 }
      );
    });

    it("should generate numeric codes between 100000 and 999999", async () => {
      mockRedisClient.set.mockResolvedValue("OK" as any);

      const email = "test@example.com";
      
      // Test multiple generations to ensure range
      for (let i = 0; i < 10; i++) {
        const otp = await generateOtp(email);
        const otpNum = parseInt(otp, 10);
        
        expect(otpNum).toBeGreaterThanOrEqual(100000);
        expect(otpNum).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe("verifyOtp", () => {
    it("should return true when OTP matches and delete the code", async () => {
      const email = "test@example.com";
      const code = "123456";
      const key = "participium:otp:email:test@example.com";

      mockRedisClient.get.mockResolvedValue(code);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await verifyOtp(email, code);

      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it("should return false when OTP does not match", async () => {
      const email = "test@example.com";
      const correctCode = "123456";
      const wrongCode = "654321";

      mockRedisClient.get.mockResolvedValue(correctCode);

      const result = await verifyOtp(email, wrongCode);

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should return false when no OTP exists for email", async () => {
      const email = "test@example.com";
      const code = "123456";

      mockRedisClient.get.mockResolvedValue(null);

      const result = await verifyOtp(email, code);

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should not delete OTP when verification fails", async () => {
      const email = "test@example.com";
      const code = "123456";

      mockRedisClient.get.mockResolvedValue("999999");

      const result = await verifyOtp(email, code);

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should handle verification with correct key format", async () => {
      const email = "john.doe@example.com";
      const code = "555555";
      const expectedKey = "participium:otp:email:john.doe@example.com";

      mockRedisClient.get.mockResolvedValue(code);
      mockRedisClient.del.mockResolvedValue(1);

      await verifyOtp(email, code);

      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
    });

    it("should be case-sensitive for OTP codes", async () => {
      const email = "test@example.com";
      
      mockRedisClient.get.mockResolvedValue("123456");

      const result = await verifyOtp(email, "123457");

      expect(result).toBe(false);
    });
  });

  describe("clearOtp", () => {
    it("should delete OTP for given email", async () => {
      const email = "test@example.com";
      const expectedKey = "participium:otp:email:test@example.com";

      mockRedisClient.del.mockResolvedValue(1);

      await clearOtp(email);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });

    it("should handle clearing non-existent OTP gracefully", async () => {
      const email = "nonexistent@example.com";

      mockRedisClient.del.mockResolvedValue(0);

      await expect(clearOtp(email)).resolves.not.toThrow();
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it("should use correct key format when clearing", async () => {
      const email = "user.with.dots@example.com";
      const expectedKey = "participium:otp:email:user.with.dots@example.com";

      mockRedisClient.del.mockResolvedValue(1);

      await clearOtp(email);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
    });

    it("should clear OTP for different emails independently", async () => {
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      mockRedisClient.del.mockResolvedValue(1);

      await clearOtp(email1);
      await clearOtp(email2);

      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(1, "participium:otp:email:user1@example.com");
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(2, "participium:otp:email:user2@example.com");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full OTP lifecycle: generate, verify, clear", async () => {
      const email = "lifecycle@example.com";
      const key = "participium:otp:email:lifecycle@example.com";

      // Generate
      mockRedisClient.set.mockResolvedValue("OK" as any);
      const otp = await generateOtp(email);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, otp, { EX: 30 * 60 });

      // Verify
      mockRedisClient.get.mockResolvedValue(otp);
      mockRedisClient.del.mockResolvedValue(1);
      const verified = await verifyOtp(email, otp);
      expect(verified).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);

      // Try to verify again (should fail as it was deleted)
      mockRedisClient.get.mockResolvedValue(null);
      const secondVerify = await verifyOtp(email, otp);
      expect(secondVerify).toBe(false);
    });

    it("should handle manual clear after generation", async () => {
      const email = "manual@example.com";
      const key = "participium:otp:email:manual@example.com";

      // Generate
      mockRedisClient.set.mockResolvedValue("OK" as any);
      const otp = await generateOtp(email);

      // Clear
      mockRedisClient.del.mockResolvedValue(1);
      await clearOtp(email);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);

      // Verify should fail
      mockRedisClient.get.mockResolvedValue(null);
      const verified = await verifyOtp(email, otp);
      expect(verified).toBe(false);
    });

    it("should handle multiple failed verification attempts", async () => {
      const email = "attempts@example.com";
      const correctCode = "123456";

      mockRedisClient.get.mockResolvedValue(correctCode);

      // Multiple wrong attempts
      await verifyOtp(email, "111111");
      await verifyOtp(email, "222222");
      await verifyOtp(email, "333333");

      // OTP should not be deleted
      expect(mockRedisClient.del).not.toHaveBeenCalled();

      // Correct attempt should succeed
      mockRedisClient.del.mockResolvedValue(1);
      const result = await verifyOtp(email, correctCode);
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
    });
  });
});
