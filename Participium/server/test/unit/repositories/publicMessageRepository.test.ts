import { PublicMessageRepository } from "../../../src/repositories/PublicMessageRepository";
import { AppDataSource } from "../../../src/database/connection";
import { Repository } from "typeorm";
import { PublicMessageDAO } from "../../../src/models/dao/PublicMessageDAO";
import { UserDAO } from "../../../src/models/dao/UserDAO";

jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe("PublicMessageRepository - Unit Tests", () => {
  let publicMessageRepository: PublicMessageRepository;
  let mockRepository: jest.Mocked<Repository<PublicMessageDAO>>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    publicMessageRepository = new PublicMessageRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("save", () => {
    it("should create and save a new public message", async () => {
      const messageData: Partial<PublicMessageDAO> = {
        reportId: 1,
        message: "Test message",
        senderType: "citizen",
        senderId: 10,
        read: false,
      };

      const createdEntity = {
        ...messageData,
        id: 1,
        createdAt: new Date(),
      } as PublicMessageDAO;

      const savedEntity = { ...createdEntity } as PublicMessageDAO;

      mockRepository.create.mockReturnValue(createdEntity);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await publicMessageRepository.save(messageData);

      expect(mockRepository.create).toHaveBeenCalledWith(messageData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(savedEntity);
    });

    it("should save a message from officer", async () => {
      const messageData: Partial<PublicMessageDAO> = {
        reportId: 2,
        message: "Officer response",
        senderType: "officer",
        senderId: 20,
        read: false,
      };

      const createdEntity = {
        ...messageData,
        id: 2,
        createdAt: new Date(),
      } as PublicMessageDAO;

      mockRepository.create.mockReturnValue(createdEntity);
      mockRepository.save.mockResolvedValue(createdEntity);

      const result = await publicMessageRepository.save(messageData);

      expect(mockRepository.create).toHaveBeenCalledWith(messageData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result.senderType).toBe("officer");
      expect(result.senderId).toBe(20);
    });

    it("should save message with minimal data", async () => {
      const messageData: Partial<PublicMessageDAO> = {
        reportId: 3,
        message: "Quick message",
        senderType: "citizen",
        senderId: 30,
      };

      const createdEntity = {
        ...messageData,
        id: 3,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      mockRepository.create.mockReturnValue(createdEntity);
      mockRepository.save.mockResolvedValue(createdEntity);

      const result = await publicMessageRepository.save(messageData);

      expect(result).toBeDefined();
      expect(result.id).toBe(3);
      expect(result.message).toBe("Quick message");
    });

    it("should handle save with complete message data", async () => {
      const testDate = new Date("2024-01-15T10:00:00Z");
      const messageData: Partial<PublicMessageDAO> = {
        reportId: 4,
        message: "Complete message data",
        senderType: "citizen",
        senderId: 40,
        read: true,
      };

      const createdEntity = {
        ...messageData,
        id: 4,
        createdAt: testDate,
      } as PublicMessageDAO;

      mockRepository.create.mockReturnValue(createdEntity);
      mockRepository.save.mockResolvedValue(createdEntity);

      const result = await publicMessageRepository.save(messageData);

      expect(result.id).toBe(4);
      expect(result.read).toBe(true);
      expect(result.createdAt).toEqual(testDate);
    });
  });

  describe("listByReport", () => {
    it("should return empty array when no messages exist for report", async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await publicMessageRepository.listByReport(999);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { reportId: 999 },
        relations: ["sender"],
        order: { createdAt: "ASC" },
      });
      expect(result).toEqual([]);
    });

    it("should return all messages for a report with sender information", async () => {
      const mockSender: UserDAO = {
        id: 10,
        username: "testuser",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      } as UserDAO;

      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 5,
          message: "First message",
          senderType: "citizen",
          senderId: 10,
          sender: mockSender,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          read: false,
        } as PublicMessageDAO,
        {
          id: 2,
          reportId: 5,
          message: "Second message",
          senderType: "officer",
          senderId: 20,
          sender: {
            id: 20,
            username: "officer1",
            email: "officer@example.com",
            firstName: "Jane",
            lastName: "Smith",
          } as UserDAO,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          read: true,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      const result = await publicMessageRepository.listByReport(5);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { reportId: 5 },
        relations: ["sender"],
        order: { createdAt: "ASC" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].sender?.username).toBe("testuser");
      expect(result[1].id).toBe(2);
      expect(result[1].sender?.username).toBe("officer1");
    });

    it("should order messages by createdAt in ascending order", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 6,
          message: "Older message",
          senderType: "citizen",
          senderId: 30,
          createdAt: new Date("2024-01-01T09:00:00Z"),
          read: false,
        } as PublicMessageDAO,
        {
          id: 2,
          reportId: 6,
          message: "Newer message",
          senderType: "citizen",
          senderId: 30,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          read: false,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      const result = await publicMessageRepository.listByReport(6);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { reportId: 6 },
        relations: ["sender"],
        order: { createdAt: "ASC" },
      });
      expect(result[0].createdAt.getTime()).toBeLessThan(result[1].createdAt.getTime());
    });

    it("should include sender relations in query", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 7,
          message: "Message with sender",
          senderType: "officer",
          senderId: 40,
          sender: {
            id: 40,
            username: "officer2",
            firstName: "Bob",
            lastName: "Johnson",
          } as UserDAO,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      await publicMessageRepository.listByReport(7);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ["sender"],
        })
      );
    });

    it("should handle messages without sender", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 8,
          message: "Message without sender",
          senderType: "citizen",
          senderId: 50,
          sender: undefined,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      const result = await publicMessageRepository.listByReport(8);

      expect(result).toHaveLength(1);
      expect(result[0].sender).toBeUndefined();
    });

    it("should return multiple messages in correct order", async () => {
      const date1 = new Date("2024-01-01T08:00:00Z");
      const date2 = new Date("2024-01-01T09:00:00Z");
      const date3 = new Date("2024-01-01T10:00:00Z");

      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 9,
          message: "First",
          senderType: "citizen",
          senderId: 60,
          createdAt: date1,
          read: false,
        } as PublicMessageDAO,
        {
          id: 2,
          reportId: 9,
          message: "Second",
          senderType: "officer",
          senderId: 70,
          createdAt: date2,
          read: false,
        } as PublicMessageDAO,
        {
          id: 3,
          reportId: 9,
          message: "Third",
          senderType: "citizen",
          senderId: 60,
          createdAt: date3,
          read: false,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      const result = await publicMessageRepository.listByReport(9);

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe("First");
      expect(result[1].message).toBe("Second");
      expect(result[2].message).toBe("Third");
    });

    it("should handle messages with read status", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 10,
          message: "Unread message",
          senderType: "citizen",
          senderId: 80,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
        {
          id: 2,
          reportId: 10,
          message: "Read message",
          senderType: "officer",
          senderId: 90,
          createdAt: new Date(),
          read: true,
        } as PublicMessageDAO,
      ];

      mockRepository.find.mockResolvedValue(mockMessages);

      const result = await publicMessageRepository.listByReport(10);

      expect(result[0].read).toBe(false);
      expect(result[1].read).toBe(true);
    });
  });

  describe("markAsRead", () => {
    it("should mark a message as read", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await publicMessageRepository.markAsRead(1);

      expect(mockRepository.update).toHaveBeenCalledWith(1, { read: true });
    });

    it("should mark multiple messages as read sequentially", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await publicMessageRepository.markAsRead(1);
      await publicMessageRepository.markAsRead(2);
      await publicMessageRepository.markAsRead(3);

      expect(mockRepository.update).toHaveBeenCalledTimes(3);
      expect(mockRepository.update).toHaveBeenNthCalledWith(1, 1, { read: true });
      expect(mockRepository.update).toHaveBeenNthCalledWith(2, 2, { read: true });
      expect(mockRepository.update).toHaveBeenNthCalledWith(3, 3, { read: true });
    });

    it("should handle marking non-existent message as read", async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 } as any);

      await publicMessageRepository.markAsRead(999);

      expect(mockRepository.update).toHaveBeenCalledWith(999, { read: true });
    });

    it("should update only the read field", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await publicMessageRepository.markAsRead(5);

      expect(mockRepository.update).toHaveBeenCalledWith(5, { read: true });
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ read: true })
      );
    });

    it("should handle update for already read message", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await publicMessageRepository.markAsRead(10);

      expect(mockRepository.update).toHaveBeenCalledWith(10, { read: true });
    });
  });

  describe("Repository initialization", () => {
    it("should initialize with correct repository", () => {
      expect(AppDataSource.getRepository).toHaveBeenCalledWith(PublicMessageDAO);
    });

    it("should create new instance successfully", () => {
      const newRepo = new PublicMessageRepository();
      expect(newRepo).toBeInstanceOf(PublicMessageRepository);
      expect(AppDataSource.getRepository).toHaveBeenCalled();
    });
  });
});
