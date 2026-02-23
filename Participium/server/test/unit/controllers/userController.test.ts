import "reflect-metadata";
import {
  createUser,
  getUser,
  getAllUsers,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  logoutUser,
  activateAccount,
  isActive
} from "../../../src/controllers/userController";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { mapUserDAOToDTO } from "../../../src/services/mapperService";
import { blacklistUserSessions, getSession } from "../../../src/services/authService";

jest.mock("../../../src/repositories/UserRepository");
jest.mock("../../../src/services/mapperService");
jest.mock("../../../src/services/authService");

describe("UserController Unit Tests", () => {
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo = new UserRepository() as jest.Mocked<UserRepository>;
    (UserRepository as jest.MockedClass<typeof UserRepository>).mockImplementation(() => mockUserRepo);
  });

  describe("createUser", () => {
    it("dovrebbe creare un nuovo utente con successo", async () => {
      const userDto = {
        username: "newuser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        password: "password123"
      };
      const mockCreatedUser = { ...userDto, id: 1 };
      mockUserRepo.createUser = jest.fn().mockResolvedValue(mockCreatedUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue(mockCreatedUser);

      const result = await createUser(userDto as any);

      expect(mockUserRepo.createUser).toHaveBeenCalledWith(
        "newuser",
        "Mario",
        "Rossi",
        "mario@example.com",
        "password123"
      );
      expect(mapUserDAOToDTO).toHaveBeenCalledWith(mockCreatedUser);
      expect(result).toEqual(mockCreatedUser);
    });

    it("dovrebbe lanciare errore se l'email non è valida", async () => {
      const userDto = {
        username: "newuser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "invalid-email",
        password: "password123"
      };
      await expect(createUser(userDto as any)).rejects.toThrow("Invalid email format");
    });

    it("dovrebbe lanciare errore con statusCode 400 per email invalida", async () => {
      const userDto = {
        username: "newuser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "no-at-sign",
        password: "password123"
      };
      try {
        await createUser(userDto as any);
      } catch (err: any) {
        expect(err.message).toBe("Invalid email format");
        expect(err.statusCode).toBe(400);
      }
    });

    it("dovrebbe gestire email con formato valido ma casi limite", async () => {
      const userDto = {
        username: "newuser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "test+tag@example.co.uk",
        password: "password123"
      };
      const mockCreatedUser = { ...userDto, id: 1 };
      mockUserRepo.createUser = jest.fn().mockResolvedValue(mockCreatedUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue(mockCreatedUser);

      const result = await createUser(userDto as any);

      expect(mockUserRepo.createUser).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedUser);
    });

    it("dovrebbe propagare errore se il repository fallisce", async () => {
      const userDto = {
        username: "existinguser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        password: "password123"
      };
      mockUserRepo.createUser = jest.fn().mockRejectedValue(new Error("User with username 'existinguser' already exists"));

      await expect(createUser(userDto as any)).rejects.toThrow("User with username 'existinguser' already exists");
    });

    it("dovrebbe gestire errore generico dal repository", async () => {
      const userDto = {
        username: "newuser",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario@example.com",
        password: "password123"
      };
      mockUserRepo.createUser = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(createUser(userDto as any)).rejects.toThrow("Database error");
    });
  });

  describe("getUser", () => {
    it("dovrebbe recuperare un utente per username", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com"
      };
      mockUserRepo.getUserByUsername = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue(mockUser);

      const result = await getUser("testuser");

      expect(mockUserRepo.getUserByUsername).toHaveBeenCalledWith("testuser");
      expect(mapUserDAOToDTO).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it("dovrebbe gestire utente non trovato", async () => {
      mockUserRepo.getUserByUsername = jest.fn().mockResolvedValue(null);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue(null);

      const result = await getUser("notfound");
      expect(mockUserRepo.getUserByUsername).toHaveBeenCalledWith("notfound");
      expect(result).toBeNull();
    });

    it("dovrebbe propagare errore dal repository", async () => {
      mockUserRepo.getUserByUsername = jest.fn().mockRejectedValue(new Error("User with username 'testuser' not found"));

      await expect(getUser("testuser")).rejects.toThrow("User with username 'testuser' not found");
    });
  });

  describe("getAllUsers", () => {
    it("dovrebbe recuperare tutti gli utenti", async () => {
      const mockUsers = [
        { id: 1, username: "user1", firstName: "First", lastName: "User", email: "user1@example.com" },
        { id: 2, username: "user2", firstName: "Second", lastName: "User", email: "user2@example.com" }
      ];
      mockUserRepo.getAllUsers = jest.fn().mockResolvedValue(mockUsers);
      (mapUserDAOToDTO as jest.Mock).mockImplementation((user) => user);

      const result = await getAllUsers();

      expect(mockUserRepo.getAllUsers).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(mapUserDAOToDTO).toHaveBeenCalledTimes(2);
    });

    it("dovrebbe restituire un array vuoto quando non ci sono utenti", async () => {
      mockUserRepo.getAllUsers = jest.fn().mockResolvedValue([]);

      const result = await getAllUsers();

      expect(result).toEqual([]);
    });

    it("dovrebbe propagare errore dal repository", async () => {
      mockUserRepo.getAllUsers = jest.fn().mockRejectedValue(new Error("Database connection failed"));

      await expect(getAllUsers()).rejects.toThrow("Database connection failed");
    });
  });

  describe("deleteUser", () => {
    it("dovrebbe eliminare un utente per username", async () => {
      mockUserRepo.deleteUser = jest.fn().mockResolvedValue(undefined);

      await deleteUser("testuser");

      expect(mockUserRepo.deleteUser).toHaveBeenCalledWith("testuser");
    });

    it("dovrebbe gestire l'eliminazione di utente non esistente", async () => {
      mockUserRepo.deleteUser = jest.fn().mockResolvedValue(undefined);

      await deleteUser("nonexistent");

      expect(mockUserRepo.deleteUser).toHaveBeenCalledWith("nonexistent");
    });

    it("dovrebbe propagare errore dal repository", async () => {
      mockUserRepo.deleteUser = jest.fn().mockRejectedValue(new Error("User with username 'testuser' not found"));

      await expect(deleteUser("testuser")).rejects.toThrow("User with username 'testuser' not found");
    });
  });

  describe("getMyProfile", () => {
    it("dovrebbe restituire il profilo utente con i campi extra", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: false
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser });

      const result = await getMyProfile(1);

      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(1);
      expect(result.avatar).toBe("/avatar.png");
      expect(result.telegramUsername).toBe("telegram_user");
      expect(result.emailNotifications).toBe(false);
    });

    it("dovrebbe caricare i report seguiti quando includeFollowedReports è true", async () => {
      const mockReport = {
        id: 100,
        title: "Report seguito",
        location: { lat: 10, lng: 20 },
        category: "Environment"
      };
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: null,
        telegramUsername: null,
        emailNotifications: true,
        followedReports: [mockReport]
      };
      mockUserRepo.getUserByIdWithFollows = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, followedReports: [mockReport] });

      const result = await getMyProfile(1, { includeFollowedReports: true });

      expect(mockUserRepo.getUserByIdWithFollows).toHaveBeenCalledWith(1);
      expect(mockUserRepo.getUserById).not.toHaveBeenCalled();
      expect(result.followedReports).toBeDefined();
      expect(result.followedReports).toHaveLength(1);
      expect(result.followedReports[0].id).toBe(100);
    });

    it("dovrebbe usare getUserById quando includeFollowedReports è false", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: null,
        telegramUsername: null,
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser });

      const result = await getMyProfile(1, { includeFollowedReports: false });

      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(1);
      expect(mockUserRepo.getUserByIdWithFollows).not.toHaveBeenCalled();
    });

    it("dovrebbe propagare errore quando getUserById fallisce", async () => {
      mockUserRepo.getUserById = jest.fn().mockRejectedValue(new Error("User with id '1' not found"));

      await expect(getMyProfile(1)).rejects.toThrow("User with id '1' not found");
    });

    it("dovrebbe propagare errore quando getUserByIdWithFollows fallisce", async () => {
      mockUserRepo.getUserByIdWithFollows = jest.fn().mockRejectedValue(new Error("User with id '1' not found"));

      await expect(getMyProfile(1, { includeFollowedReports: true })).rejects.toThrow("User with id '1' not found");
    });

    it("dovrebbe gestire avatar/telegram/emailNotifications null", async () => {
      const mockUser = {
        id: 2,
        username: "testuser2",
        firstName: "Test2",
        lastName: "User2",
        email: "test2@example.com",
        avatar: undefined,
        telegramUsername: undefined,
        emailNotifications: undefined
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser });

      const result = await getMyProfile(2);

      expect(result.avatar).toBeNull();
      expect(result.telegramUsername).toBeNull();
      expect(result.emailNotifications).toBe(true);
    });

    it("dovrebbe gestire emailNotifications esplicitamente false", async () => {
      const mockUser = {
        id: 3,
        username: "testuser3",
        firstName: "Test3",
        lastName: "User3",
        email: "test3@example.com",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser });

      const result = await getMyProfile(3);

      expect(result.emailNotifications).toBe(false);
    });
  });

  describe("updateMyProfile", () => {
    it("dovrebbe aggiornare il profilo utente", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue({ ...mockUser, telegramUsername: "new_telegram" });
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, telegramUsername: "new_telegram" });
      (getSession as jest.Mock).mockResolvedValue({ token: "t", sessionType: "telegram", createdAt: Date.now() });
      (blacklistUserSessions as jest.Mock).mockResolvedValue(undefined);

      const result = await updateMyProfile(1, { telegramUsername: "new_telegram", emailNotifications: true, avatarPath: "/avatar.png" });

      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith(1, {
        telegramUsername: "new_telegram",
        emailNotifications: true,
        avatarPath: "/avatar.png"
      });
      expect(getSession).toHaveBeenCalledWith(1, "telegram");
      expect(blacklistUserSessions).toHaveBeenCalledWith(1, "telegram", "telegram_username_changed");
      expect(result.telegramUsername).toBe("new_telegram");
    });

    it("non dovrebbe invalidare la sessione se telegramUsername non cambia", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "same_telegram",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue(mockUser);
      (mapUserDAOToDTO as jest.Mock).mockReturnValue(mockUser);

      const result = await updateMyProfile(1, { telegramUsername: "same_telegram", emailNotifications: true });

      expect(getSession).not.toHaveBeenCalled();
      expect(blacklistUserSessions).not.toHaveBeenCalled();
      expect(result.telegramUsername).toBe("same_telegram");
    });

    it("dovrebbe invalidare la sessione se telegramUsername cambia e non c'è sessione attiva", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "old_telegram",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue({ ...mockUser, telegramUsername: "new_telegram" });
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, telegramUsername: "new_telegram" });
      (getSession as jest.Mock).mockResolvedValue(null);

      const result = await updateMyProfile(1, { telegramUsername: "new_telegram" });

      expect(getSession).toHaveBeenCalledWith(1, "telegram");
      expect(blacklistUserSessions).not.toHaveBeenCalled();
      expect(result.telegramUsername).toBe("new_telegram");
    });

    it("dovrebbe gestire telegramUsername impostato a null", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "old_telegram",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue({ ...mockUser, telegramUsername: null });
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, telegramUsername: null });
      (getSession as jest.Mock).mockResolvedValue({ token: "t", sessionType: "telegram", createdAt: Date.now() });
      (blacklistUserSessions as jest.Mock).mockResolvedValue(undefined);

      const result = await updateMyProfile(1, { telegramUsername: null });

      expect(getSession).toHaveBeenCalledWith(1, "telegram");
      expect(blacklistUserSessions).toHaveBeenCalledWith(1, "telegram", "telegram_username_changed");
      expect(result.telegramUsername).toBeNull();
    });

    it("dovrebbe aggiornare solo emailNotifications", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue({ ...mockUser, emailNotifications: false });
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, emailNotifications: false });

      const result = await updateMyProfile(1, { emailNotifications: false });

      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith(1, {
        telegramUsername: undefined,
        emailNotifications: false,
        avatarPath: undefined
      });
      expect(result.emailNotifications).toBe(false);
    });

    it("dovrebbe aggiornare solo avatarPath", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        avatar: "/old-avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: true
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockResolvedValue({ ...mockUser, avatar: "/new-avatar.png" });
      (mapUserDAOToDTO as jest.Mock).mockReturnValue({ ...mockUser, avatar: "/new-avatar.png" });

      const result = await updateMyProfile(1, { avatarPath: "/new-avatar.png" });

      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith(1, {
        telegramUsername: undefined,
        emailNotifications: undefined,
        avatarPath: "/new-avatar.png"
      });
      expect(result.avatar).toBe("/new-avatar.png");
    });

    it("dovrebbe propagare errore dal repository quando getUserById fallisce", async () => {
      mockUserRepo.getUserById = jest.fn().mockRejectedValue(new Error("User with id '1' not found"));

      await expect(updateMyProfile(1, { telegramUsername: "new_telegram" })).rejects.toThrow("User with id '1' not found");
    });

    it("dovrebbe propagare errore dal repository quando updateProfile fallisce", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        telegramUsername: "telegram_user"
      };
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserRepo.updateProfile = jest.fn().mockRejectedValue(new Error("Update failed"));

      await expect(updateMyProfile(1, { telegramUsername: "new_telegram" })).rejects.toThrow("Update failed");
    });
  });

  describe("activateAccount", () => {
    it("dovrebbe attivare un account per email", async () => {
      mockUserRepo.activateUser = jest.fn().mockResolvedValue(undefined);

      await activateAccount("test@example.com");

      expect(mockUserRepo.activateUser).toHaveBeenCalledWith("test@example.com");
    });

    it("dovrebbe gestire attivazione di account già attivo", async () => {
      mockUserRepo.activateUser = jest.fn().mockResolvedValue(undefined);

      await activateAccount("active@example.com");

      expect(mockUserRepo.activateUser).toHaveBeenCalledWith("active@example.com");
    });

    it("dovrebbe propagare errore dal repository", async () => {
      mockUserRepo.activateUser = jest.fn().mockRejectedValue(new Error("User with email 'test@example.com' not found"));

      await expect(activateAccount("test@example.com")).rejects.toThrow("User with email 'test@example.com' not found");
    });
  });

  describe("isActive", () => {
    it("dovrebbe restituire true se l'account è attivo", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        isActive: true
      };
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(mockUser);

      const result = await isActive("test@example.com");

      expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se l'account non è attivo", async () => {
      const mockUser = {
        id: 2,
        username: "inactiveuser",
        firstName: "Inactive",
        lastName: "User",
        email: "inactive@example.com",
        isActive: false
      };
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(mockUser);

      const result = await isActive("inactive@example.com");

      expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith("inactive@example.com");
      expect(result).toBe(false);
    });

    it("dovrebbe propagare errore dal repository", async () => {
      mockUserRepo.getUserByEmail = jest.fn().mockRejectedValue(new Error("User with email 'test@example.com' not found"));

      await expect(isActive("test@example.com")).rejects.toThrow("User with email 'test@example.com' not found");
    });
  });

  describe("logoutUser", () => {
    it("dovrebbe semplicemente risolvere senza fare nulla", async () => {
      await expect(logoutUser()).resolves.toBeUndefined();
    });
  });
});
