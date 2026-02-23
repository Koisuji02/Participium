import * as internalMessageController from "../../../src/controllers/internalMessageController";
import { InternalMessageRepository } from "../../../src/repositories/InternalMessageRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { BadRequestError, ForbiddenError } from "../../../src/utils/utils";
import * as ioService from "../../../src/services/ioService";
import { Participant } from "../../../src/controllers/internalMessageController";
// Mock repositories
jest.mock("../../../src/repositories/InternalMessageRepository");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/services/ioService");

describe("internalMessageController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listConversation", () => {
    it("should return list of messages for a report", async () => {
      const mockMessages = [
        {
          id: 1,
          reportId: 1,
          senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          senderId: 1,
          receiverType: OfficerRole.MAINTAINER,
          receiverId: 2,
          message: "Test message",
          createdAt: new Date("2025-01-01")
        },
        {
          id: 2,
          reportId: 1,
          senderType: OfficerRole.MAINTAINER,
          senderId: 2,
          receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          receiverId: 1,
          message: "Reply message",
          createdAt: new Date("2025-01-02")
        }
      ];

      (InternalMessageRepository.prototype.listByReport as jest.Mock).mockResolvedValue(mockMessages);

      const result = await internalMessageController.listConversation(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message",
        receiverName: "Maintainer",
        senderName: "Technical Officer",
        createdAt: new Date("2025-01-01")
      });
      expect(InternalMessageRepository.prototype.listByReport).toHaveBeenCalledWith(1);
    });

    it("should return empty array if no messages", async () => {
      (InternalMessageRepository.prototype.listByReport as jest.Mock).mockResolvedValue([]);

      const result = await internalMessageController.listConversation(1);

      expect(result).toEqual([]);
      expect(InternalMessageRepository.prototype.listByReport).toHaveBeenCalledWith(1);
    });
  });

  describe("sendInternalMessage", () => {
    const mockReport = {
      id: 1,
      assignedOfficerId: 1,
      assignedMaintainerId: 2
    };

    const mockSavedMessage = {
      id: 1,
      reportId: 1,
      senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
      senderId: 1,
      receiverType: OfficerRole.MAINTAINER,
      receiverId: 2,
      message: "Test message",
      createdAt: new Date("2025-01-01")
    };

    beforeEach(() => {
      (ReportRepository.prototype.getReportById as jest.Mock).mockResolvedValue(mockReport);
      (InternalMessageRepository.prototype.create as jest.Mock).mockResolvedValue(mockSavedMessage);
    });

    it("should send message from officer to maintainer", async () => {
      const mockIO = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };
      (ioService.getIO as jest.Mock).mockReturnValue(mockIO);

      const sender: Participant = { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };
      const receiver: Participant = { type: OfficerRole.MAINTAINER, id: 2 };

      const result = await internalMessageController.sendInternalMessage(1, sender, receiver, "Test message");

      expect(result).toEqual({
        id: 1,
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message",
        createdAt: mockSavedMessage.createdAt
      });

      expect(ReportRepository.prototype.getReportById).toHaveBeenCalledWith(1);
      expect(InternalMessageRepository.prototype.create).toHaveBeenCalledWith({
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message"
      });

      expect(mockIO.to).toHaveBeenCalledWith("report:1");
      expect(mockIO.emit).toHaveBeenCalledWith("internal-message:new", {
        id: 1,
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message",
        createdAt: mockSavedMessage.createdAt
      });
    });

    it("should send message from maintainer to officer", async () => {
      const mockIO = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };
      (ioService.getIO as jest.Mock).mockReturnValue(mockIO);

      const savedMessage = {
        ...mockSavedMessage,
        senderType: OfficerRole.MAINTAINER,
        senderId: 2,
        receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        receiverId: 1
      };
      (InternalMessageRepository.prototype.create as jest.Mock).mockResolvedValue(savedMessage);

      const sender: Participant = { type: OfficerRole.MAINTAINER, id: 2 };
      const receiver: Participant = { type: OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };

      const result = await internalMessageController.sendInternalMessage(1, sender, receiver, "Reply message");

      expect(result.senderType).toBe(OfficerRole.MAINTAINER);
      expect(result.senderId).toBe(2);
      expect(result.receiverType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(result.receiverId).toBe(1);
    });

    it("should throw BadRequestError if message is empty", async () => {
      const sender = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };
      const receiver = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 2 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if message is whitespace", async () => {
      const sender = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };
      const receiver = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 2 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "   ")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw ForbiddenError if officer not assigned to report", async () => {
      const sender = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 99 };
      const receiver = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 2 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError if maintainer not assigned to report", async () => {
      const sender = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 99 };
      const receiver = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError if officer tries to send to wrong maintainer", async () => {
      const sender = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };
      const receiver = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 99 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError if maintainer tries to send to wrong officer", async () => {
      const sender = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 2 };
      const receiver = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 99 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError if officer tries to send to another officer", async () => {
      const sender = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 1 };
      const receiver = { type: OfficerRole.TECHNICAL_OFFICE_STAFF as OfficerRole.TECHNICAL_OFFICE_STAFF, id: 3 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError if maintainer tries to send to another maintainer", async () => {
      const sender = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 2 };
      const receiver = { type: OfficerRole.MAINTAINER as OfficerRole.MAINTAINER, id: 3 };

      await expect(
        internalMessageController.sendInternalMessage(1, sender, receiver, "Test")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});