import "reflect-metadata";
import { UserRepository } from "../../../src/repositories/UserRepository";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { UserDAO } from "../../../src/models/dao/UserDAO";
import { Repository } from "typeorm";
import { AppDataSource } from "../../../src/database/connection";
import { hashPassword } from "../../../src/services/authService";
import { NotFoundError, ConflictError } from "../../../src/utils/utils";

// Mock dei moduli
jest.mock("../../../src/services/authService");

describe("UserRepository Unit Tests", () => {
  let userRepository: UserRepository;
  let mockRepo: jest.Mocked<Repository<UserDAO>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock del repository TypeORM
    mockRepo = {
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn()
    } as any;

    // Spy su AppDataSource.getRepository
    jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo);

    userRepository = new UserRepository();
  });

  describe("getAllUsers", () => {
    it("dovrebbe restituire tutti gli utenti", async () => {
      const mockUsers = [
        {
          id: 1,
          username: "user1",
          firstName: "First",
          lastName: "User",
          email: "user1@example.com",
          password: "hash1",
          avatar: null,
          telegramUsername: null,
          emailNotifications: false,
          isActive: false
        },
        {
          id: 2,
          username: "user2",
          firstName: "Second",
          lastName: "User",
          email: "user2@example.com",
          password: "hash2",
          avatar: null,
          telegramUsername: null,
          emailNotifications: false,
          isActive: false
        }
      ] as any;

      mockRepo.find.mockResolvedValue(mockUsers);

      const result = await userRepository.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUserByUsername", () => {
    it("dovrebbe restituire un utente quando esiste", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);

      const result = await userRepository.getUserByUsername("testuser");

      expect(result).toEqual(mockUser);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { username: "testuser" } });
    });

    it("dovrebbe lanciare NotFoundError quando l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUserByUsername("nonexistent"))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("getUserByEmail", () => {
    it("dovrebbe restituire un utente quando esiste", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);

      const result = await userRepository.getUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
    });

    it("dovrebbe lanciare NotFoundError quando l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUserByEmail("nonexistent@example.com"))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("getUserById", () => {
    it("dovrebbe restituire un utente quando esiste", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      mockRepo.find.mockResolvedValue([mockUser]);

      const result = await userRepository.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("dovrebbe lanciare NotFoundError quando l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUserById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("getUserByIdWithFollows", () => {
    it("dovrebbe restituire un utente con le relazioni follows caricate", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false,
        follows: [
          {
            id: 1,
            user: {} as any,
            report: { id: 1, title: "Report 1" } as any,
            createdAt: new Date(),
            notifyVia: "web"
          },
          {
            id: 2,
            user: {} as any,
            report: { id: 2, title: "Report 2" } as any,
            createdAt: new Date(),
            notifyVia: "web"
          }
        ]
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);

      const result = await userRepository.getUserByIdWithFollows(1);

      expect(result).toEqual(mockUser);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["follows", "follows.report"]
      });
      expect(result.follows).toHaveLength(2);
    });

    it("dovrebbe restituire un utente senza follows se non ne ha", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false,
        follows: []
      } as any;

      mockRepo.find.mockResolvedValue([mockUser]);

      const result = await userRepository.getUserByIdWithFollows(1);

      expect(result).toEqual(mockUser);
      expect(result.follows).toEqual([]);
    });

    it("dovrebbe lanciare NotFoundError quando l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUserByIdWithFollows(999))
        .rejects
        .toThrow(NotFoundError);
    });

    it("dovrebbe caricare le relazioni follows correttamente", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false,
        follows: [
          {
            id: 1,
            user: {} as any,
            report: { id: 1, title: "Report 1", state: "ASSIGNED" } as any,
            createdAt: new Date(),
            notifyVia: "web"
          }
        ]
      } as any;

      mockRepo.find.mockResolvedValue([mockUser as any]);

      const result = await userRepository.getUserByIdWithFollows(1);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["follows", "follows.report"]
      });
      expect(result.follows?.[0].report).toBeDefined();
      expect(result.follows?.[0].report.id).toBe(1);
    });
  });

  describe("createUser", () => {
    it("dovrebbe creare un nuovo utente con successo", async () => {
      const newUser = {
        username: "newuser",
        firstName: "New",
        lastName: "User",
        email: "new@example.com",
        password: "plainpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false
      };

      const savedUser: UserDAO = {
        id: 1,
        ...newUser,
        password: "hashedpassword",
        isActive: false
      } as any;

      // Mock: username e email non esistono
      mockRepo.find.mockResolvedValue([]);
      
      // Mock: officer non esiste
      jest.spyOn(OfficerRepository.prototype, 'getOfficerByEmail').mockRejectedValue(new NotFoundError("Not found"));
      jest.spyOn(OfficerRepository.prototype, 'getOfficersByUsername').mockResolvedValue([]);

      // Mock: hashing password
      (hashPassword as jest.Mock).mockResolvedValue("hashedpassword");

      // Mock: salvataggio
      mockRepo.save.mockResolvedValue(savedUser);

      const result = await userRepository.createUser(
        newUser.username,
        newUser.firstName,
        newUser.lastName,
        newUser.email,
        newUser.password
      );

      expect(result).toEqual(savedUser);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { username: newUser.username } });
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { email: newUser.email } });
      expect(OfficerRepository.prototype.getOfficerByEmail).toHaveBeenCalledWith(newUser.email);
      expect(OfficerRepository.prototype.getOfficersByUsername).toHaveBeenCalledWith(newUser.username);
      expect(hashPassword).toHaveBeenCalledWith(newUser.password);
      expect(mockRepo.save).toHaveBeenCalledWith({
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: "hashedpassword"
      });
    });

    it("dovrebbe lanciare ConflictError se username già esiste", async () => {
      const existingUser: UserDAO = {
        id: 1,
        username: "existinguser",
        firstName: "Existing",
        lastName: "User",
        email: "existing@example.com",
        password: "hash",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      // Username esiste
      mockRepo.find.mockResolvedValue([existingUser]);

      await expect(userRepository.createUser(
        "existinguser",
        "New",
        "User",
        "new@example.com",
        "password"
      )).rejects.toThrow(ConflictError);
    });

    it("dovrebbe lanciare ConflictError se email già esiste", async () => {
      const existingUser: UserDAO = {
        id: 1,
        username: "user1",
        firstName: "Existing",
        lastName: "User",
        email: "existing@example.com",
        password: "hash",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      // Username non esiste, ma email esiste
      mockRepo.find
        .mockResolvedValueOnce([]) // username check
        .mockResolvedValueOnce([existingUser]); // email check

      jest.spyOn(OfficerRepository.prototype, 'getOfficerByEmail').mockRejectedValue(new NotFoundError("Not found"));
      jest.spyOn(OfficerRepository.prototype, 'getOfficersByUsername').mockResolvedValue([]);

      await expect(userRepository.createUser(
        "newuser",
        "New",
        "User",
        "existing@example.com",
        "password"
      )).rejects.toThrow(ConflictError);
    });

    it("dovrebbe lanciare Error se email è già usata da un officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officer1",
        email: "officer@example.com",
        password: "hash",
        role: "ROLE_1"
      };

      mockRepo.find.mockResolvedValue([]); // username non esiste
      jest.spyOn(OfficerRepository.prototype, 'getOfficerByEmail').mockResolvedValue(mockOfficer as any);

      await expect(userRepository.createUser(
        "newuser",
        "New",
        "User",
        "officer@example.com",
        "password"
      )).rejects.toThrow("Email 'officer@example.com' is already used.");
    });

    it("dovrebbe lanciare Error se username è già usato da un officer", async () => {
      const mockOfficer = {
        id: 1,
        username: "officerusername",
        email: "officer@example.com",
        password: "hash",
        role: "ROLE_1"
      };

      mockRepo.find.mockResolvedValue([]); // username non esiste nei users
      jest.spyOn(OfficerRepository.prototype, 'getOfficerByEmail').mockRejectedValue(new NotFoundError("Not found"));
      jest.spyOn(OfficerRepository.prototype, 'getOfficersByUsername').mockResolvedValue([mockOfficer] as any);

      await expect(userRepository.createUser(
        "officerusername",
        "New",
        "User",
        "new@example.com",
        "password"
      )).rejects.toThrow("Username 'officerusername' is already used.");
    });
  });

  describe("deleteUser", () => {
    it("dovrebbe eliminare un utente esistente", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "userToDelete",
        firstName: "Delete",
        lastName: "Me",
        email: "delete@example.com",
        password: "hash",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      mockRepo.find.mockResolvedValue([mockUser]);
      mockRepo.remove.mockResolvedValue(mockUser);

      await userRepository.deleteUser("userToDelete");

      expect(mockRepo.find).toHaveBeenCalledWith({ where: { username: "userToDelete" } });
      expect(mockRepo.remove).toHaveBeenCalledWith(mockUser);
    });

    it("dovrebbe lanciare NotFoundError se l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.deleteUser("nonexistent"))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("getUseryTelegramUsername", () => {
    it("dovrebbe restituire un utente quando esiste per telegram username", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "telegram_user",
        emailNotifications: false,
        isActive: false
      } as any;

      mockRepo.find.mockResolvedValue([mockUser]);

      const result = await userRepository.getUseryTelegramUsername("telegram_user");

      expect(result).toEqual(mockUser);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { telegramUsername: "telegram_user" } });
    });

    it("dovrebbe lanciare NotFoundError quando l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUseryTelegramUsername("nonexistent_telegram"))
        .rejects
        .toThrow(NotFoundError);
    });

    it("dovrebbe gestire telegram username null", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.getUseryTelegramUsername(null as any))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("updateProfile", () => {
    it("dovrebbe aggiornare telegramUsername", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "old_telegram",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        telegramUsername: "new_telegram"
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, { telegramUsername: "new_telegram" });

      expect(result.telegramUsername).toBe("new_telegram");
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        telegramUsername: "new_telegram"
      }));
    });

    it("dovrebbe aggiornare emailNotifications", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "telegram_user",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        emailNotifications: false
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, { emailNotifications: false });

      expect(result.emailNotifications).toBe(false);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        emailNotifications: false
      }));
    });

    it("dovrebbe aggiornare avatarPath", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "telegram_user",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        avatar: "/uploads/avatars/avatar.png"
      } as any;

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, { avatarPath: "/uploads/avatars/avatar.png" });

      expect(result.avatar).toBe("/uploads/avatars/avatar.png");
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        avatar: "/uploads/avatars/avatar.png"
      }));
    });

    it("dovrebbe aggiornare tutti i campi contemporaneamente", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "old_telegram",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        telegramUsername: "new_telegram",
        emailNotifications: false,
        avatar: "/uploads/avatars/avatar.png"
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, {
        telegramUsername: "new_telegram",
        emailNotifications: false,
        avatarPath: "/uploads/avatars/avatar.png"
      });

      expect(result.telegramUsername).toBe("new_telegram");
      expect(result.emailNotifications).toBe(false);
      expect(result.avatar).toBe("/uploads/avatars/avatar.png");
    });

    it("dovrebbe impostare telegramUsername a null", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: "old_telegram",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        telegramUsername: null
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, { telegramUsername: null });

      expect(result.telegramUsername).toBeNull();
    });

    it("dovrebbe impostare avatarPath a null", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: "/old-avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: true,
        isActive: false
      } as any;

      const updatedUser = {
        ...mockUser,
        avatar: null
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(updatedUser as any);

      const result = await userRepository.updateProfile(1, { avatarPath: null });

      expect(result.avatar).toBeNull();
    });

    it("non dovrebbe modificare campi non specificati", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: "/avatar.png",
        telegramUsername: "telegram_user",
        emailNotifications: true,
        isActive: false
      } as any;

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(mockUser as any);

      const result = await userRepository.updateProfile(1, {});

      expect(result.avatar).toBe("/avatar.png");
      expect(result.telegramUsername).toBe("telegram_user");
      expect(result.emailNotifications).toBe(true);
    });

    it("dovrebbe lanciare NotFoundError se l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.updateProfile(999, { telegramUsername: "test" }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe("activateUser", () => {
    it("dovrebbe attivare un utente esistente", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      const activatedUser = {
        ...mockUser,
        isActive: true
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(activatedUser as any);

      const result = await userRepository.activateUser("test@example.com");

      expect(result.isActive).toBe(true);
      expect(mockRepo.find).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true
      }));
    });

    it("dovrebbe gestire utente già attivo", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: true
      } as any;

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(mockUser as any);

      const result = await userRepository.activateUser("test@example.com");

      expect(result.isActive).toBe(true);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("dovrebbe lanciare NotFoundError se l'utente non esiste", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(userRepository.activateUser("nonexistent@example.com"))
        .rejects
        .toThrow(NotFoundError);
    });

    it("dovrebbe gestire email con caratteri speciali", async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        email: "test+tag@example.co.uk",
        password: "hashedpassword",
        avatar: null,
        telegramUsername: null,
        emailNotifications: false,
        isActive: false
      } as any;

      const activatedUser = {
        ...mockUser,
        isActive: true
      };

      mockRepo.find.mockResolvedValue([mockUser as any]);
      mockRepo.save.mockResolvedValue(activatedUser as any);

      const result = await userRepository.activateUser("test+tag@example.co.uk");

      expect(result.isActive).toBe(true);
    });
  });
});
