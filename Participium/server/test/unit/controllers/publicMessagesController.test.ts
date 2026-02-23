import { listConversation, sendPublicMessage } from "../../../src/controllers/publicMessageController";
import { PublicMessageRepository } from "../../../src/repositories/PublicMessageRepository";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { getIO } from "../../../src/services/ioService";
import { PublicMessageDAO } from "../../../src/models/dao/PublicMessageDAO";
import { UserDAO } from "../../../src/models/dao/UserDAO";

// Mock dependencies
jest.mock("../../../src/repositories/PublicMessageRepository");
jest.mock("../../../src/repositories/UserRepository");
jest.mock("../../../src/repositories/OfficerRepository");
jest.mock("../../../src/services/ioService");

describe("PublicMessageController - Unit Tests", () => {
  let mockPublicMessageRepository: jest.Mocked<PublicMessageRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockOfficerRepository: jest.Mocked<OfficerRepository>;
  let mockIO: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository instance
    mockPublicMessageRepository = {
      save: jest.fn(),
      listByReport: jest.fn(),
      markAsRead: jest.fn(),
    } as any;

    mockUserRepository = {
      getUserById: jest.fn(),
    } as any;

    mockOfficerRepository = {
      getOfficerById: jest.fn(),
    } as any;

    // Mock the repository constructors
    (PublicMessageRepository as jest.Mock).mockImplementation(() => mockPublicMessageRepository);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepository);
    (OfficerRepository as jest.Mock).mockImplementation(() => mockOfficerRepository);

    // Mock socket.io
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe("listConversation", () => {
    it("should return an empty array when no messages exist", async () => {
      mockPublicMessageRepository.listByReport.mockResolvedValue([]);

      const result = await listConversation(1);

      expect(result).toEqual([]);
      expect(mockPublicMessageRepository.listByReport).toHaveBeenCalledWith(1);
      expect(mockPublicMessageRepository.listByReport).toHaveBeenCalledTimes(1);
    });

    it("should return mapped messages with sender information", async () => {
      const mockSender: UserDAO = {
          id: 10,
          username: "johndoe",
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "citizen",
          createdAt: new Date(),
          isActive: true,
      } as unknown as UserDAO;

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
          sender: undefined,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          read: true,
        } as PublicMessageDAO,
      ];

      mockOfficerRepository.getOfficerById.mockResolvedValue({
        id: 20,
        username: "officer1",
        email: "officer@example.com",
        name: "Jane",
        surname: "Smith",
      } as any);

      mockPublicMessageRepository.listByReport.mockResolvedValue(mockMessages);

      const result = await listConversation(5);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        reportId: 5,
        message: "First message",
        senderType: "citizen",
        senderId: 10,
        senderName: "John Doe",
        createdAt: mockMessages[0].createdAt,
        read: false,
      });
      expect(result[1]).toEqual({
        id: 2,
        reportId: 5,
        message: "Second message",
        senderType: "officer",
        senderId: 20,
        senderName: "Jane Smith",
        createdAt: mockMessages[1].createdAt,
        read: true,
      });
      expect(mockPublicMessageRepository.listByReport).toHaveBeenCalledWith(5);
    });

    it("should use username as senderName when first and last name are missing", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 3,
          message: "Test message",
          senderType: "citizen",
          senderId: 15,
          sender: {
            id: 15,
            username: "user123",
            email: "user@example.com",
          } as UserDAO,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockPublicMessageRepository.listByReport.mockResolvedValue(mockMessages);

      const result = await listConversation(3);

      expect(result[0].senderName).toBe("user123");
    });

    it("should use email as senderName when username and names are missing", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 3,
          message: "Test message",
          senderType: "citizen",
          senderId: 15,
          sender: {
            id: 15,
            email: "user@example.com",
          } as UserDAO,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockPublicMessageRepository.listByReport.mockResolvedValue(mockMessages);

      const result = await listConversation(3);

      expect(result[0].senderName).toBe("user@example.com");
    });

    it("should use 'Unknown' as senderName when sender is missing", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 3,
          message: "Test message",
          senderType: "citizen",
          senderId: 15,
          sender: undefined,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockPublicMessageRepository.listByReport.mockResolvedValue(mockMessages);

      const result = await listConversation(3);

      expect(result[0].senderName).toBe("Unknown");
    });

    it("should trim whitespace from combined first and last name", async () => {
      const mockMessages: PublicMessageDAO[] = [
        {
          id: 1,
          reportId: 3,
          message: "Test message",
          senderType: "officer",
          senderId: 25,
          sender: undefined,
          createdAt: new Date(),
          read: false,
        } as PublicMessageDAO,
      ];

      mockOfficerRepository.getOfficerById.mockResolvedValue({
        id: 25,
        username: "officer2",
        email: "officer2@example.com",
        name: "Alice",
        surname: "",
      } as any);

      mockPublicMessageRepository.listByReport.mockResolvedValue(mockMessages);

      const result = await listConversation(3);

      expect(result[0].senderName).toBe("Alice");
    });
  });

  describe("sendPublicMessage", () => {
    it("should save and return a new public message from citizen", async () => {
      const mockUser = {
        id: 30,
        username: "citizen1",
        email: "citizen1@example.com",
        firstName: "Bob",
        lastName: "Brown",
      } as UserDAO;

      const savedMessage: PublicMessageDAO = {
        id: 100,
        reportId: 7,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: 30,
        createdAt: new Date("2024-01-02T12:00:00Z"),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: mockUser,
      } as PublicMessageDAO;

      mockUserRepository.getUserById.mockResolvedValue(mockUser);
      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const result = await sendPublicMessage(7, "citizen", 30, "Hello from citizen");

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(30);
      expect(mockPublicMessageRepository.save).toHaveBeenCalledWith({
        reportId: 7,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: 30,
        sender: mockUser,
        read: false,
      });

      expect(result).toEqual({
        id: 100,
        reportId: 7,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: 30,
        senderName: "Bob Brown",
        createdAt: savedMessage.createdAt,
        read: false,
      });

      expect(mockIO.to).toHaveBeenCalledWith("report:7");
      expect(mockIO.emit).toHaveBeenCalledWith("public-message:new", {
        id: 100,
        reportId: 7,
        message: "Hello from citizen",
        senderType: "citizen",
        senderId: 30,
        senderName: "Bob Brown",
        createdAt: savedMessage.createdAt,
      });
    });

    it("should save and return a new public message from officer", async () => {
      const savedMessage: PublicMessageDAO = {
        id: 101,
        reportId: 8,
        message: "Response from officer",
        senderType: "officer",
        senderId: 40,
        createdAt: new Date("2024-01-02T13:00:00Z"),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: undefined,
      } as PublicMessageDAO;

      mockOfficerRepository.getOfficerById.mockResolvedValue({
        id: 40,
        username: "officer3",
        email: "officer3@example.com",
        name: "Carol",
        surname: "White",
      } as any);

      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const result = await sendPublicMessage(8, "officer", 40, "Response from officer");

      expect(mockPublicMessageRepository.save).toHaveBeenCalledWith({
        reportId: 8,
        message: "Response from officer",
        senderType: "officer",
        senderId: 40,
        read: false,
      });

      expect(result).toEqual({
        id: 101,
        reportId: 8,
        message: "Response from officer",
        senderType: "officer",
        senderId: 40,
        senderName: "Carol White",
        createdAt: savedMessage.createdAt,
        read: false,
      });

      expect(mockIO.to).toHaveBeenCalledWith("report:8");
      expect(mockIO.emit).toHaveBeenCalledWith("public-message:new", expect.objectContaining({
        id: 101,
        message: "Response from officer",
        senderType: "officer",
      }));
    });

    it("should emit socket event when IO instance is available", async () => {
      const mockUser = {
        id: 50,
        firstName: "Dave",
        lastName: "Green",
      } as UserDAO;

      const savedMessage: PublicMessageDAO = {
        id: 102,
        reportId: 9,
        message: "Socket test message",
        senderType: "citizen",
        senderId: 50,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: mockUser,
      } as PublicMessageDAO;

      mockUserRepository.getUserById.mockResolvedValue(mockUser);
      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await sendPublicMessage(9, "citizen", 50, "Socket test message");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Emitting public-message:new to report:9"),
        expect.any(Object)
      );
      expect(mockIO.to).toHaveBeenCalledWith("report:9");
      expect(mockIO.emit).toHaveBeenCalledWith("public-message:new", expect.any(Object));

      consoleLogSpy.mockRestore();
    });

    it("should log error when IO instance is not available", async () => {
      const mockUser = {
        id: 60,
        firstName: "Eve",
        lastName: "Black",
      } as UserDAO;

      const savedMessage: PublicMessageDAO = {
        id: 103,
        reportId: 10,
        message: "No socket message",
        senderType: "citizen",
        senderId: 60,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: mockUser,
      } as PublicMessageDAO;

      mockUserRepository.getUserById.mockResolvedValue(mockUser);
      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(null);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendPublicMessage(10, "citizen", 60, "No socket message");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Socket.io instance not available");
      expect(mockIO.to).not.toHaveBeenCalled();
      expect(mockIO.emit).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should throw error when saved message cannot be retrieved", async () => {
      const savedMessage: PublicMessageDAO = {
        id: 104,
        reportId: 11,
        message: "Lost message",
        senderType: "citizen",
        senderId: 70,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([]); // Empty array - message not found

      await expect(
        sendPublicMessage(11, "citizen", 70, "Lost message")
      ).rejects.toThrow("Failed to retrieve saved message");
    });

    it("should handle messages with no sender information gracefully", async () => {
      const savedMessage: PublicMessageDAO = {
        id: 105,
        reportId: 12,
        message: "Anonymous message",
        senderType: "citizen",
        senderId: 80,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: undefined,
      } as PublicMessageDAO;

      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const result = await sendPublicMessage(12, "citizen", 80, "Anonymous message");

      expect(result.senderName).toBe("Unknown");
    });

    it("should handle messages with partial sender information", async () => {
      const savedMessage: PublicMessageDAO = {
        id: 106,
        reportId: 13,
        message: "Partial info message",
        senderType: "officer",
        senderId: 90,
        createdAt: new Date(),
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: undefined,
      } as PublicMessageDAO;

      mockOfficerRepository.getOfficerById.mockResolvedValue({
        id: 90,
        username: "partial_user",
        name: "",
        surname: "",
      } as any);

      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const result = await sendPublicMessage(13, "officer", 90, "Partial info message");

      expect(result.senderName).toBe("partial_user");
    });

    it("should correctly map all DTO fields from saved message", async () => {
      const testDate = new Date("2024-06-15T14:30:00Z");
      const mockUser = {
        id: 95,
        firstName: "Frank",
        lastName: "Gray",
        username: "fgray",
        email: "frank@example.com",
      } as UserDAO;

      const savedMessage: PublicMessageDAO = {
        id: 107,
        reportId: 14,
        message: "Complete message data",
        senderType: "citizen",
        senderId: 95,
        createdAt: testDate,
        read: false,
      } as PublicMessageDAO;

      const fullMessage: PublicMessageDAO = {
        ...savedMessage,
        sender: mockUser,
      } as PublicMessageDAO;

      mockUserRepository.getUserById.mockResolvedValue(mockUser);
      mockPublicMessageRepository.save.mockResolvedValue(savedMessage);
      mockPublicMessageRepository.listByReport.mockResolvedValue([fullMessage]);
      (getIO as jest.Mock).mockReturnValue(mockIO);

      const result = await sendPublicMessage(14, "citizen", 95, "Complete message data");

      expect(result).toMatchObject({
        id: 107,
        reportId: 14,
        message: "Complete message data",
        senderType: "citizen",
        senderId: 95,
        senderName: "Frank Gray",
        createdAt: testDate,
        read: false,
      });
    });
  });
});
