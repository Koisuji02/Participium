import "reflect-metadata";
jest.mock('@services/ioService', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  })
}));

import { initializeTestDatabase, closeTestDatabase, clearDatabase } from "../../setup/test-datasource";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { MaintainerRepository } from "../../../src/repositories/MaintainerRepository";
import { InternalMessageRepository } from "../../../src/repositories/InternalMessageRepository";
import * as internalMessageController from "../../../src/controllers/internalMessageController";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { ReportState } from "../../../src/models/enums/ReportState";
import { getIO } from "../../../src/services/ioService";

describe("Internal Message Controller Integration Tests", () => {
  let reportRepo: ReportRepository;
  let userRepo: UserRepository;
  let officerRepo: OfficerRepository;
  let maintainerRepo: MaintainerRepository;
  let messageRepo: InternalMessageRepository;

  let testUserId: number;
  let testOfficerId: number;
  let testMaintainerId: number;
  let testReportId: number;

  beforeAll(async () => {
    await initializeTestDatabase();
    reportRepo = new ReportRepository();
    userRepo = new UserRepository();
    officerRepo = new OfficerRepository();
    maintainerRepo = new MaintainerRepository();
    messageRepo = new InternalMessageRepository();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    // Create test data
    const user = await userRepo.createUser("testuser", "Test", "User", "test@example.com", "Password@123");
    testUserId = user.id;

    const officer = await officerRepo.createOfficer(
      "testofficer",
      "Test",
      "Officer",
      "officer@example.com",
      "Password@123",
      [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
    );
    testOfficerId = officer.id;

    const maintainer = await maintainerRepo.createMaintainer(
      "Test Maintainer",
      "maintainer@example.com",
      "Password@123",
      [OfficeType.ARCHITECTURAL_BARRIERS],
      true
    );
    testMaintainerId = maintainer.id;

    const report = await reportRepo.createReport(
      "Test Report",
      { name: "Test Location", Coordinates: { longitude: 10.0, latitude: 45.0 } },
      user,
      false,
      OfficeType.ARCHITECTURAL_BARRIERS,
      { Description: "Test description", Photos: ["photo1.jpg"] }
    );
    testReportId = report.id;

    // Assign report to officer and maintainer
    await reportRepo.assignReportToOfficer(testReportId, testOfficerId);
    await reportRepo.assignReportToMaintainer(testReportId, testMaintainerId);
  });

  // ===================== listConversation =====================
  describe("listConversation", () => {
    it("should return empty array when no messages exist", async () => {
      const messages = await internalMessageController.listConversation(testReportId);

      expect(messages).toEqual([]);
    });

    it("should return all messages for a report", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "First message"
      );
      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Second message"
      );

      const messages = await internalMessageController.listConversation(testReportId);

      expect(messages).toHaveLength(2);
      expect(messages[0].message).toBe("First message");
      expect(messages[1].message).toBe("Second message");
    });

    it("should return messages in chronological order (ASC)", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Message 1");
      await new Promise(resolve => setTimeout(resolve, 10));
      await internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Message 2");
      await new Promise(resolve => setTimeout(resolve, 10));
      await internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Message 3");

      const messages = await internalMessageController.listConversation(testReportId);

      expect(messages).toHaveLength(3);
      expect(messages[0].message).toBe("Message 1");
      expect(messages[1].message).toBe("Message 2");
      expect(messages[2].message).toBe("Message 3");
    });

    it("should include all message fields", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Test message"
      );

      const messages = await internalMessageController.listConversation(testReportId);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toHaveProperty("id");
      expect(messages[0]).toHaveProperty("reportId", testReportId);
      expect(messages[0]).toHaveProperty("senderType", OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(messages[0]).toHaveProperty("senderId", testOfficerId);
      expect(messages[0]).toHaveProperty("receiverType", OfficerRole.MAINTAINER);
      expect(messages[0]).toHaveProperty("receiverId", testMaintainerId);
      expect(messages[0]).toHaveProperty("message", "Test message");
      expect(messages[0]).toHaveProperty("createdAt");
    });
  });

  // ===================== sendInternalMessage (Officer to Maintainer) =====================
  describe("sendInternalMessage - Officer to Maintainer", () => {
    it("should send message from officer to maintainer", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Hello from officer"
      );

      expect(result).toHaveProperty("id");
      expect(result.reportId).toBe(testReportId);
      expect(result.senderType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(result.senderId).toBe(testOfficerId);
      expect(result.receiverType).toBe(OfficerRole.MAINTAINER);
      expect(result.receiverId).toBe(testMaintainerId);
      expect(result.message).toBe("Hello from officer");
    });

    it("should persist message in database", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Persisted message"
      );

      const messages = await messageRepo.listByReport(testReportId);
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toBe("Persisted message");
    });

    it("should emit socket event when message is sent", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Socket test message"
      );

      const io = getIO();
      expect(io?.to).toHaveBeenCalledWith(`report:${testReportId}`);
      expect(io?.emit).toHaveBeenCalledWith(
        "internal-message:new",
        expect.objectContaining({
          message: "Socket test message",
          senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          receiverType: OfficerRole.MAINTAINER // Cambiato da recipientType
        })
      );
    });

    it("should throw error when officer not assigned to report", async () => {
      const anotherOfficer = await officerRepo.createOfficer(
        "anotherofficer",
        "Another",
        "Officer",
        "another@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: anotherOfficer.id
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Test")
      ).rejects.toThrow("Not assigned to this report");
    });

    it("should throw error when receiver is not the assigned maintainer", async () => {
      const anotherMaintainer = await maintainerRepo.createMaintainer(
        "Another Maintainer",
        "another.maintainer@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: anotherMaintainer.id
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Test")
      ).rejects.toThrow("Invalid receiver for this report");
    });
  });

  // ===================== sendInternalMessage (Maintainer to Officer) =====================
  describe("sendInternalMessage - Maintainer to Officer", () => {
    it("should send message from maintainer to officer", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };

      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Hello from maintainer"
      );

      expect(result).toHaveProperty("id");
      expect(result.senderType).toBe(OfficerRole.MAINTAINER);
      expect(result.senderId).toBe(testMaintainerId);
      expect(result.receiverType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(result.receiverId).toBe(testOfficerId);
      expect(result.message).toBe("Hello from maintainer");
    });

    it("should throw error when maintainer not assigned to report", async () => {
      const anotherMaintainer = await maintainerRepo.createMaintainer(
        "Another Maintainer",
        "another.maintainer@example.com",
        "Password@123",
        [OfficeType.ARCHITECTURAL_BARRIERS],
        true
      );

      const sender: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: anotherMaintainer.id
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Test")
      ).rejects.toThrow("Not assigned to this report");
    });

    it("should throw error when receiver is not the assigned officer", async () => {
      const anotherOfficer = await officerRepo.createOfficer(
        "anotherofficer",
        "Another",
        "Officer",
        "another@example.com",
        "Password@123",
        [{ role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }]
      );

      const sender: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: anotherOfficer.id
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "Test")
      ).rejects.toThrow("Invalid receiver for this report");
    });
  });

  // ===================== Message Validation =====================
  describe("Message Validation", () => {
    it("should throw error when message is empty", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "")
      ).rejects.toThrow("Message cannot be empty");
    });

    it("should throw error when message is only whitespace", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await expect(
        internalMessageController.sendInternalMessage(testReportId, sender, receiver, "   ")
      ).rejects.toThrow("Message cannot be empty");
    });

    it("should accept message with leading/trailing whitespace", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "  Valid message  "
      );

      expect(result.message).toBe("  Valid message  ");
    });

    it("should accept long messages", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const longMessage = "A".repeat(1000);
      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        longMessage
      );

      expect(result.message).toBe(longMessage);
    });
  });

  // ===================== Bidirectional Conversation =====================
  describe("Bidirectional Conversation", () => {
    it("should support back-and-forth conversation", async () => {
      const officer: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const maintainer: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      // Officer sends first message
      await internalMessageController.sendInternalMessage(
        testReportId,
        officer,
        maintainer,
        "Can you fix this?"
      );

      // Maintainer replies
      await internalMessageController.sendInternalMessage(
        testReportId,
        maintainer,
        officer,
        "Yes, I'll work on it"
      );

      // Officer sends follow-up
      await internalMessageController.sendInternalMessage(
        testReportId,
        officer,
        maintainer,
        "Great, thanks!"
      );

      const messages = await internalMessageController.listConversation(testReportId);

      expect(messages).toHaveLength(3);
      expect(messages[0].senderType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(messages[1].senderType).toBe(OfficerRole.MAINTAINER);
      expect(messages[2].senderType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
    });
  });

  // ===================== Report Not Found =====================
  describe("Report Not Found", () => {
    it("should throw error when report does not exist", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      await expect(
        internalMessageController.sendInternalMessage(99999, sender, receiver, "Test")
      ).rejects.toThrow("Report with id '99999' not found");
    });

    it("should throw error when listing conversation for non-existent report", async () => {
      await expect(
        internalMessageController.listConversation(99999)
      ).rejects.toThrow("Report with id '99999' not found");
    });
  });

  // ===================== Multiple Reports =====================
  describe("Multiple Reports", () => {
    it("should keep messages separate between different reports", async () => {
      const user = await userRepo.createUser("user2", "User", "Two", "user2@example.com", "Password@123");
      const report2 = await reportRepo.createReport(
        "Second Report",
        { name: "Location 2", Coordinates: { longitude: 11.0, latitude: 46.0 } },
        user,
        false,
        OfficeType.ARCHITECTURAL_BARRIERS,
        { Description: "Second description", Photos: ["photo2.jpg"] }
      );

      await reportRepo.assignReportToOfficer(report2.id, testOfficerId);
      await reportRepo.assignReportToMaintainer(report2.id, testMaintainerId);

      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      // Send message to first report
      await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        "Message for report 1"
      );

      // Send message to second report
      await internalMessageController.sendInternalMessage(
        report2.id,
        sender,
        receiver,
        "Message for report 2"
      );

      const messages1 = await internalMessageController.listConversation(testReportId);
      const messages2 = await internalMessageController.listConversation(report2.id);

      expect(messages1).toHaveLength(1);
      expect(messages1[0].message).toBe("Message for report 1");
      
      expect(messages2).toHaveLength(1);
      expect(messages2[0].message).toBe("Message for report 2");
    });
  });

  // ===================== Edge Cases =====================
  describe("Edge Cases", () => {
    it("should handle special characters in message", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const specialMessage = "Test with special chars: @#$%^&*()_+-=[]{}|;':\",./<>?";
      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        specialMessage
      );

      expect(result.message).toBe(specialMessage);
    });

    it("should handle unicode characters in message", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const unicodeMessage = "Test with unicode: 你好 🌟 café";
      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        unicodeMessage
      );

      expect(result.message).toBe(unicodeMessage);
    });

    it("should handle newlines in message", async () => {
      const sender: internalMessageController.Participant = {
        type: OfficerRole.TECHNICAL_OFFICE_STAFF,
        id: testOfficerId
      };
      const receiver: internalMessageController.Participant = {
        type: OfficerRole.MAINTAINER,
        id: testMaintainerId
      };

      const multilineMessage = "Line 1\nLine 2\nLine 3";
      const result = await internalMessageController.sendInternalMessage(
        testReportId,
        sender,
        receiver,
        multilineMessage
      );

      expect(result.message).toBe(multilineMessage);
    });
  });
});