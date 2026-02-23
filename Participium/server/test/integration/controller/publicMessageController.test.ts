import "reflect-metadata";
import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { PublicMessageRepository } from "../../../src/repositories/PublicMessageRepository";
import { listConversation, sendPublicMessage } from "../../../src/controllers/publicMessageController";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

// Mock socket.io service
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({
  emit: mockEmit,
}));

jest.mock("../../../src/services/ioService", () => ({
  getIO: jest.fn(() => ({
    to: mockTo,
  })),
  setIO: jest.fn(),
}));

describe("PublicMessageController - Integration Tests", () => {
  let userRepo: UserRepository;
  let officerRepo: OfficerRepository;
  let reportRepo: ReportRepository;
  let messageRepo: PublicMessageRepository;

  let citizenId: number;
  let officerId: number;
  let reportId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    userRepo = new UserRepository();
    officerRepo = new OfficerRepository();
    reportRepo = new ReportRepository();
    messageRepo = new PublicMessageRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create a citizen user
    const citizen = await userRepo.createUser(
      "citizen1",
      "Alice",
      "Johnson",
      "alice@example.com",
      "Password@123"
    );
    citizenId = citizen.id;

    // Create an officer
    const officer = await officerRepo.createOfficer(
      "officer1",
      "Bob",
      "Smith",
      "bob@example.com",
      "Password@123",
      [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ROADS_AND_URBAN_FURNISHINGS }]
    );
    officerId = officer.id;

    // Create a test report
    const report = await reportRepo.createReport(
      "Test Report",
      { name: "Main Street", Coordinates: { longitude: 10.5, latitude: 45.5 } },
      citizen,
      false,
      OfficeType.ROADS_AND_URBAN_FURNISHINGS,
      { Description: "Test report description" }
    );
    reportId = report.id;
  });

  // ===================== listConversation =====================
  describe("listConversation", () => {
    it("should return empty array when no messages exist", async () => {
      const result = await listConversation(reportId);

      expect(result).toEqual([]);
    });

    it("should return messages for a report with citizen sender", async () => {
      // Create a message from citizen
      await sendPublicMessage(reportId, "citizen", citizenId, "Hello from citizen");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        reportId,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: citizenId,
        senderName: "Alice Johnson",
        read: false,
      });
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("createdAt");
    });

    it("should return messages for a report with officer sender", async () => {
      // Create a message from officer
      await sendPublicMessage(reportId, "officer", officerId, "Hello from officer");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        reportId,
        message: "Hello from officer",
        senderType: "officer",
        senderId: officerId,
        read: false,
      });
      expect(result[0]).toHaveProperty("senderName");
      expect(result[0].senderName).toBe("Bob Smith");
    });

    it("should return multiple messages in chronological order", async () => {
      // Create messages
      await sendPublicMessage(reportId, "citizen", citizenId, "First message");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await sendPublicMessage(reportId, "officer", officerId, "Second message");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await sendPublicMessage(reportId, "citizen", citizenId, "Third message");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe("First message");
      expect(result[1].message).toBe("Second message");
      expect(result[2].message).toBe("Third message");
    });

    it("should map all DTO fields correctly", async () => {
      await sendPublicMessage(reportId, "citizen", citizenId, "Test message");

      const result = await listConversation(reportId);

      expect(result[0]).toHaveProperty("id");
      expect(typeof result[0].id).toBe("number");
      expect(result[0]).toHaveProperty("reportId", reportId);
      expect(result[0]).toHaveProperty("message", "Test message");
      expect(result[0]).toHaveProperty("senderType", "citizen");
      expect(result[0]).toHaveProperty("senderId", citizenId);
      expect(result[0]).toHaveProperty("senderName", "Alice Johnson");
      expect(result[0]).toHaveProperty("createdAt");
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0]).toHaveProperty("read", false);
    });

    it("should handle messages with sender name from username when names are missing", async () => {
      // Create user without first/last name
      const userWithoutNames = await userRepo.createUser(
        "usernameonly",
        "",
        "",
        "username@example.com",
        "Password@123"
      );

      await sendPublicMessage(reportId, "citizen", userWithoutNames.id, "Message from username");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(1);
      expect(result[0].senderName).toBe("usernameonly");
    });

    it("should handle messages with sender name from email when username and names are missing", async () => {
      // Create user with minimal data
      const minimalUser = await userRepo.createUser(
        "",
        "",
        "",
        "email@example.com",
        "Password@123"
      );

      await sendPublicMessage(reportId, "citizen", minimalUser.id, "Message from email");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(1);
      expect(result[0].senderName).toBe("email@example.com");
    });

    it("should return messages only for specified report", async () => {
      // Create second report
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report2 = await reportRepo.createReport(
        "Second Report",
        { name: "Second Street", Coordinates: { longitude: 10.6, latitude: 45.6 } },
        citizen,
        false,
        OfficeType.PUBLIC_LIGHTING,
        { Description: "Second report" }
      );

      // Add messages to both reports
      await sendPublicMessage(reportId, "citizen", citizenId, "Message for report 1");
      await sendPublicMessage(report2.id, "citizen", citizenId, "Message for report 2");

      const result1 = await listConversation(reportId);
      const result2 = await listConversation(report2.id);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0].message).toBe("Message for report 1");
      expect(result2[0].message).toBe("Message for report 2");
    });

    it("should handle conversation between citizen and officer", async () => {
      await sendPublicMessage(reportId, "citizen", citizenId, "I need help");
      await sendPublicMessage(reportId, "officer", officerId, "We are here to help");
      await sendPublicMessage(reportId, "citizen", citizenId, "Thank you!");

      const result = await listConversation(reportId);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        message: "I need help",
        senderType: "citizen",
        senderName: "Alice Johnson",
      });
      expect(result[1]).toMatchObject({
        message: "We are here to help",
        senderType: "officer",
        senderName: "Bob Smith",
      });
      expect(result[2]).toMatchObject({
        message: "Thank you!",
        senderType: "citizen",
        senderName: "Alice Johnson",
      });
    });
  });

  // ===================== sendPublicMessage =====================
  describe("sendPublicMessage", () => {
    it("should create a message from citizen", async () => {
      const result = await sendPublicMessage(reportId, "citizen", citizenId, "New citizen message");

      expect(result).toMatchObject({
        reportId,
        message: "New citizen message",
        senderType: "citizen",
        senderId: citizenId,
        senderName: "Alice Johnson",
        read: false,
      });
      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("number");
      expect(result).toHaveProperty("createdAt");
    });

    it("should create a message from officer", async () => {
      const result = await sendPublicMessage(reportId, "officer", officerId, "New officer message");

      expect(result).toMatchObject({
        reportId,
        message: "New officer message",
        senderType: "officer",
        senderId: officerId,
        senderName: "Bob Smith",
        read: false,
      });
    });

    it("should persist message in database", async () => {
      const result = await sendPublicMessage(reportId, "citizen", citizenId, "Persisted message");

      // Verify in database
      const messages = await messageRepo.listByReport(reportId);
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe(result.id);
      expect(messages[0].message).toBe("Persisted message");
    });

    it("should set read to false by default", async () => {
      const result = await sendPublicMessage(reportId, "citizen", citizenId, "Unread message");

      expect(result.read).toBe(false);

      // Verify in database
      const messages = await messageRepo.listByReport(reportId);
      expect(messages[0].read).toBe(false);
    });

    it("should handle long message text", async () => {
      const longMessage = "A".repeat(1000);
      const result = await sendPublicMessage(reportId, "citizen", citizenId, longMessage);

      expect(result.message).toBe(longMessage);
      expect(result.message.length).toBe(1000);
    });

    it("should handle special characters in message", async () => {
      const specialMessage = "Hello! @#$%^&*() 你好 مرحبا <script>alert('test')</script>";
      const result = await sendPublicMessage(reportId, "citizen", citizenId, specialMessage);

      expect(result.message).toBe(specialMessage);
    });

    it("should create multiple messages sequentially", async () => {
      const msg1 = await sendPublicMessage(reportId, "citizen", citizenId, "First");
      const msg2 = await sendPublicMessage(reportId, "officer", officerId, "Second");
      const msg3 = await sendPublicMessage(reportId, "citizen", citizenId, "Third");

      expect(msg1.id).toBeDefined();
      expect(msg2.id).toBeDefined();
      expect(msg3.id).toBeDefined();
      expect(msg1.id).not.toBe(msg2.id);
      expect(msg2.id).not.toBe(msg3.id);

      const messages = await messageRepo.listByReport(reportId);
      expect(messages).toHaveLength(3);
    });

    it("should retrieve saved message with sender relation", async () => {
      const result = await sendPublicMessage(reportId, "citizen", citizenId, "Test");

      expect(result.senderName).not.toBe("Unknown");
      expect(result.senderName).toBe("Alice Johnson");
    });

    it("should throw error if saved message cannot be retrieved", async () => {
      // This is a edge case test - in normal conditions this shouldn't happen
      // We can test by using an invalid reportId - database will reject due to foreign key constraint
      const invalidReportId = 99999;

      await expect(
        sendPublicMessage(invalidReportId, "citizen", citizenId, "Test")
      ).rejects.toThrow(); // Will throw SQLITE_CONSTRAINT: FOREIGN KEY constraint failed
    });

    it("should handle messages from different citizens", async () => {
      const citizen2 = await userRepo.createUser(
        "citizen2",
        "Charlie",
        "Brown",
        "charlie@example.com",
        "Password@123"
      );

      const msg1 = await sendPublicMessage(reportId, "citizen", citizenId, "From Alice");
      const msg2 = await sendPublicMessage(reportId, "citizen", citizen2.id, "From Charlie");

      expect(msg1.senderName).toBe("Alice Johnson");
      expect(msg2.senderName).toBe("Charlie Brown");
    });

    it("should handle messages from different officers", async () => {
      const officer2 = await officerRepo.createOfficer(
        "officer2",
        "Carol",
        "White",
        "carol@example.com",
        "Password@123",
        [{ role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: OfficeType.ORGANIZATION }]
      );

      const msg1 = await sendPublicMessage(reportId, "officer", officerId, "From Bob");
      const msg2 = await sendPublicMessage(reportId, "officer", officer2.id, "From Carol");

      expect(msg1.senderName).toBe("Bob Smith");
      expect(msg2.senderName).toBe("Carol White");
    });

    it("should set createdAt timestamp", async () => {
      const beforeCreate = new Date();
      const result = await sendPublicMessage(reportId, "citizen", citizenId, "Timestamped");
      const afterCreate = new Date();

      expect(result.createdAt).toBeInstanceOf(Date);
      // SQLite truncates milliseconds, so we allow a 1-second margin
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });

    it("should create messages for different reports independently", async () => {
      const citizen = await userRepo.getUserById(citizenId);
      if (!citizen) throw new Error("Citizen not found");

      const report2 = await reportRepo.createReport(
        "Another Report",
        { name: "Third Street", Coordinates: { longitude: 10.7, latitude: 45.7 } },
        citizen,
        false,
        OfficeType.WASTE,
        { Description: "Another report" }
      );

      const msg1 = await sendPublicMessage(reportId, "citizen", citizenId, "For report 1");
      const msg2 = await sendPublicMessage(report2.id, "citizen", citizenId, "For report 2");

      expect(msg1.reportId).toBe(reportId);
      expect(msg2.reportId).toBe(report2.id);

      const messages1 = await listConversation(reportId);
      const messages2 = await listConversation(report2.id);

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
    });

    it("should return complete DTO with all required fields", async () => {
      const result = await sendPublicMessage(reportId, "officer", officerId, "Complete DTO test");

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("reportId");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("senderType");
      expect(result).toHaveProperty("senderId");
      expect(result).toHaveProperty("senderName");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("read");

      expect(typeof result.id).toBe("number");
      expect(typeof result.reportId).toBe("number");
      expect(typeof result.message).toBe("string");
      expect(typeof result.senderType).toBe("string");
      expect(typeof result.senderId).toBe("number");
      expect(typeof result.senderName).toBe("string");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(typeof result.read).toBe("boolean");
    });
  });

  // ===================== Integration scenarios =====================
  describe("Integration scenarios", () => {
    it("should maintain message history across multiple sends and reads", async () => {
      // Citizen sends message
      const msg1 = await sendPublicMessage(reportId, "citizen", citizenId, "Question 1");
      let conversation = await listConversation(reportId);
      expect(conversation).toHaveLength(1);

      // Officer responds
      const msg2 = await sendPublicMessage(reportId, "officer", officerId, "Answer 1");
      conversation = await listConversation(reportId);
      expect(conversation).toHaveLength(2);

      // Citizen asks again
      const msg3 = await sendPublicMessage(reportId, "citizen", citizenId, "Question 2");
      conversation = await listConversation(reportId);
      expect(conversation).toHaveLength(3);

      // Verify order and content
      expect(conversation[0].id).toBe(msg1.id);
      expect(conversation[1].id).toBe(msg2.id);
      expect(conversation[2].id).toBe(msg3.id);
    });

    it("should handle rapid message creation", async () => {
      const promises = [
        sendPublicMessage(reportId, "citizen", citizenId, "Message 1"),
        sendPublicMessage(reportId, "officer", officerId, "Message 2"),
        sendPublicMessage(reportId, "citizen", citizenId, "Message 3"),
        sendPublicMessage(reportId, "officer", officerId, "Message 4"),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach((result: { reportId: any; }) => {
        expect(result).toHaveProperty("id");
        expect(result.reportId).toBe(reportId);
      });

      const conversation = await listConversation(reportId);
      expect(conversation).toHaveLength(4);
    });

    it("should correctly identify sender type in mixed conversation", async () => {
      await sendPublicMessage(reportId, "citizen", citizenId, "Citizen msg");
      await sendPublicMessage(reportId, "officer", officerId, "Officer msg");
      await sendPublicMessage(reportId, "citizen", citizenId, "Citizen again");

      const conversation = await listConversation(reportId);

      expect(conversation[0].senderType).toBe("citizen");
      expect(conversation[0].senderName).toBe("Alice Johnson");
      expect(conversation[1].senderType).toBe("officer");
      expect(conversation[1].senderName).toBe("Bob Smith");
      expect(conversation[2].senderType).toBe("citizen");
      expect(conversation[2].senderName).toBe("Alice Johnson");
    });
  });
});
