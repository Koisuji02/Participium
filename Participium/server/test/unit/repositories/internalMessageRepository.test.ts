import { InternalMessageRepository } from "../../../src/repositories/InternalMessageRepository";
import { AppDataSource } from "../../../src/database/connection";
import { InternalMessageDAO } from "../../../src/models/dao/InternalMessageDAO";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";
import { Repository } from "typeorm";

// Mock del datasource
jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe("InternalMessageRepository", () => {
  let repository: InternalMessageRepository;
  let mockRepo: jest.Mocked<Repository<InternalMessageDAO>>;

  beforeEach(() => {
    // Mock del repository TypeORM
    mockRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
    repository = new InternalMessageRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("listByReport", () => {
    it("should return list of messages for a report ordered by createdAt ASC", async () => {
      const mockMessages = [
        {
          id: 1,
          reportId: 1,
          senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          senderId: 1,
          receiverType: OfficerRole.MAINTAINER,
          receiverId: 2,
          message: "First message",
          createdAt: new Date("2025-01-01")
        },
        {
          id: 2,
          reportId: 1,
          senderType: OfficerRole.MAINTAINER,
          senderId: 2,
          receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          receiverId: 1,
          message: "Second message",
          createdAt: new Date("2025-01-02")
        }
      ] as InternalMessageDAO[];

      mockRepo.find.mockResolvedValue(mockMessages);

      const result = await repository.listByReport(1);

      expect(result).toEqual(mockMessages);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { reportId: 1 },
        order: { createdAt: "ASC" }
      });
    });

    it("should return empty array if no messages found", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await repository.listByReport(1);

      expect(result).toEqual([]);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { reportId: 1 },
        order: { createdAt: "ASC" }
      });
    });

    it("should handle different report IDs", async () => {
      const mockMessages = [
        {
          id: 3,
          reportId: 5,
          senderType: OfficerRole.MAINTAINER,
          senderId: 3,
          receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
          receiverId: 2,
          message: "Message for report 5",
          createdAt: new Date("2025-01-03")
        }
      ] as InternalMessageDAO[];

      mockRepo.find.mockResolvedValue(mockMessages);

      const result = await repository.listByReport(5);

      expect(result).toEqual(mockMessages);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { reportId: 5 },
        order: { createdAt: "ASC" }
      });
    });
  });

  describe("create", () => {
    it("should create and save a new internal message", async () => {
      const messageData: Partial<InternalMessageDAO> = {
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: "Test message"
      };

      const createdEntity = {
        ...messageData,
        id: 1,
        createdAt: new Date("2025-01-01")
      } as InternalMessageDAO;

      const savedEntity = {
        ...createdEntity
      } as InternalMessageDAO;

      mockRepo.create.mockReturnValue(createdEntity);
      mockRepo.save.mockResolvedValue(savedEntity);

      const result = await repository.create(messageData);

      expect(result).toEqual(savedEntity);
      expect(mockRepo.create).toHaveBeenCalledWith(messageData);
      expect(mockRepo.save).toHaveBeenCalledWith(createdEntity);
    });

    it("should create message from maintainer to officer", async () => {
      const messageData: Partial<InternalMessageDAO> = {
        reportId: 2,
        senderType: OfficerRole.MAINTAINER,
        senderId: 3,
        receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        receiverId: 1,
        message: "Reply from maintainer"
      };

      const createdEntity = {
        ...messageData,
        id: 2,
        createdAt: new Date("2025-01-02")
      } as InternalMessageDAO;

      mockRepo.create.mockReturnValue(createdEntity);
      mockRepo.save.mockResolvedValue(createdEntity);

      const result = await repository.create(messageData);

      expect(result).toEqual(createdEntity);
      expect(result.senderType).toBe(OfficerRole.MAINTAINER);
      expect(result.receiverType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(mockRepo.create).toHaveBeenCalledWith(messageData);
      expect(mockRepo.save).toHaveBeenCalledWith(createdEntity);
    });

    it("should handle message with long text", async () => {
      const longMessage = "A".repeat(1000);
      const messageData: Partial<InternalMessageDAO> = {
        reportId: 1,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 1,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 2,
        message: longMessage
      };

      const createdEntity = {
        ...messageData,
        id: 3,
        createdAt: new Date("2025-01-03")
      } as InternalMessageDAO;

      mockRepo.create.mockReturnValue(createdEntity);
      mockRepo.save.mockResolvedValue(createdEntity);

      const result = await repository.create(messageData);

      expect(result.message).toBe(longMessage);
      expect(result.message.length).toBe(1000);
    });

    it("should preserve all message data fields", async () => {
      const messageData: Partial<InternalMessageDAO> = {
        reportId: 10,
        senderType: OfficerRole.TECHNICAL_OFFICE_STAFF,
        senderId: 5,
        receiverType: OfficerRole.MAINTAINER,
        receiverId: 7,
        message: "Complete message data"
      };

      const savedEntity = {
        id: 4,
        ...messageData,
        createdAt: new Date("2025-01-04")
      } as InternalMessageDAO;

      mockRepo.create.mockReturnValue(savedEntity);
      mockRepo.save.mockResolvedValue(savedEntity);

      const result = await repository.create(messageData);

      expect(result.id).toBe(4);
      expect(result.reportId).toBe(10);
      expect(result.senderType).toBe(OfficerRole.TECHNICAL_OFFICE_STAFF);
      expect(result.senderId).toBe(5);
      expect(result.receiverType).toBe(OfficerRole.MAINTAINER);
      expect(result.receiverId).toBe(7);
      expect(result.message).toBe("Complete message data");
      expect(result.createdAt).toBeDefined();
    });
  });
});