import {
    loginUserByUsername,
    loginUserByMail,
    loginOfficerByMail,
    loginOfficerByUsername,
    loginUser,
    loginOfficer,
    getUserByTelegramUsername,
    loginMaintainerByMail,
    loginMaintainerByUsername,
    loginMaintainer
} from '../../../src/controllers/authController';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { OfficerRepository } from '../../../src/repositories/OfficerRepository';
import { MaintainerRepository } from '../../../src/repositories/MaintainerRepository';
import * as authService from '../../../src/services/authService';
import { UnauthorizedError, InactiveUserError } from '../../../src/utils/utils';
import { OfficerRole } from '../../../src/models/enums/OfficerRole';
import { UserDAO } from '../../../src/models/dao/UserDAO';
import { OfficerDAO } from '../../../src/models/dao/OfficerDAO';
import { MaintainerDAO } from '../../../src/models/dao/MaintainerDAO';

jest.mock('@repositories/UserRepository');
jest.mock('@repositories/OfficerRepository');
jest.mock('@repositories/MaintainerRepository');
jest.mock('@services/authService');

describe('authController', () => {
    let mockUserRepo: jest.Mocked<UserRepository>;
    let mockOfficerRepo: jest.Mocked<OfficerRepository>;
    let mockMaintainerRepo: jest.Mocked<MaintainerRepository>;

    beforeEach(() => {
        mockUserRepo = {
            getUserByUsername: jest.fn(),
            getUserByEmail: jest.fn(),
            getUseryTelegramUsername: jest.fn()
        } as any;

        mockOfficerRepo = {
            getOfficerByEmail: jest.fn(),
            getOfficersByUsername: jest.fn()
        } as any;

        mockMaintainerRepo = {
            getMaintainerByEmail: jest.fn(),
            getMaintainersByUsername: jest.fn()
        } as any;

        (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
        (OfficerRepository as jest.Mock).mockImplementation(() => mockOfficerRepo);
        (MaintainerRepository as jest.Mock).mockImplementation(() => mockMaintainerRepo);

        (authService.verifyPassword as jest.Mock).mockResolvedValue(true);
        (authService.generateToken as jest.Mock).mockReturnValue('mock-token');
        (authService.saveSession as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ===================== loginUserByUsername =====================
    describe('loginUserByUsername', () => {
        it('should login user successfully with username', async () => {
            const mockUser: UserDAO = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);

            const token = await loginUserByUsername('testuser', 'password123');

            expect(mockUserRepo.getUserByUsername).toHaveBeenCalledWith('testuser');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 1,
                username: 'testuser',
                isStaff: false,
                type: 'user',
                sessionType: 'web'
            });
            expect(authService.saveSession).toHaveBeenCalledWith(1, 'mock-token', 'web');
            expect(token).toBe('mock-token');
        });

        it('should throw error if user has no password', async () => {
            const mockUser: UserDAO = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: null,
                isActive: true
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);

            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should throw error if user is not active', async () => {
            const mockUser: UserDAO = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashed-password',
                isActive: false
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);

            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow(InactiveUserError);
            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow('User account is not active');
        });

        it('should throw error if password is invalid', async () => {
            const mockUser: UserDAO = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginUserByUsername('testuser', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginUserByUsername('testuser', 'wrong-password'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should propagate repository error when getUserByUsername fails', async () => {
            mockUserRepo.getUserByUsername.mockRejectedValue(new Error("User with username 'testuser' not found"));

            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow("User with username 'testuser' not found");
        });

        it('should propagate error when saveSession fails', async () => {
            const mockUser: UserDAO = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);
            (authService.saveSession as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

            await expect(loginUserByUsername('testuser', 'password123'))
                .rejects.toThrow('Redis connection failed');
        });
    });

    // ===================== loginUserByMail =====================
    describe('loginUserByMail', () => {
        it('should login user successfully with email', async () => {
            const mockUser: UserDAO = {
                id: 2,
                username: 'testuser2',
                email: 'test2@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);

            const token = await loginUserByMail('test2@example.com', 'password123');

            expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith('test2@example.com');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 2,
                username: 'testuser2',
                isStaff: false,
                type: 'user',
                sessionType: 'web'
            });
            expect(authService.saveSession).toHaveBeenCalledWith(2, 'mock-token', 'web');
            expect(token).toBe('mock-token');
        });

        it('should throw error if user has no password', async () => {
            const mockUser: UserDAO = {
                id: 2,
                username: 'testuser2',
                email: 'test2@example.com',
                password: null,
                isActive: true
            } as any;

            mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);

            await expect(loginUserByMail('test2@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginUserByMail('test2@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should throw error if user is not active', async () => {
            const mockUser: UserDAO = {
                id: 2,
                username: 'testuser2',
                email: 'test2@example.com',
                password: 'hashed-password',
                isActive: false
            } as any;

            mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);

            await expect(loginUserByMail('test2@example.com', 'password123'))
                .rejects.toThrow(InactiveUserError);
            await expect(loginUserByMail('test2@example.com', 'password123'))
                .rejects.toThrow('User account is not active');
        });

        it('should throw error if password is invalid', async () => {
            const mockUser: UserDAO = {
                id: 2,
                username: 'testuser2',
                email: 'test2@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginUserByMail('test2@example.com', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginUserByMail('test2@example.com', 'wrong-password'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should propagate repository error when getUserByEmail fails', async () => {
            mockUserRepo.getUserByEmail.mockRejectedValue(new Error("User with email 'test@example.com' not found"));

            await expect(loginUserByMail('test@example.com', 'password123'))
                .rejects.toThrow("User with email 'test@example.com' not found");
        });
    });

    // ===================== loginOfficerByMail =====================
    describe('loginOfficerByMail', () => {
        it('should login officer with single role successfully', async () => {
            const mockOfficer: OfficerDAO = {
                id: 10,
                username: 'officer1',
                email: 'officer@example.com',
                password: 'hashed-password',
                roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, office: 'ROADS' }]
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            const token = await loginOfficerByMail('officer@example.com', 'password123');

            expect(mockOfficerRepo.getOfficerByEmail).toHaveBeenCalledWith('officer@example.com');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 10,
                username: 'officer1',
                isStaff: true,
                type: [OfficerRole.TECHNICAL_OFFICE_STAFF],
                sessionType: 'web'
            });
            expect(authService.saveSession).toHaveBeenCalledWith(10, 'mock-token', 'web');
            expect(token).toBe('mock-token');
        });

        it('should login officer with multiple roles successfully', async () => {
            const mockOfficer: OfficerDAO = {
                id: 11,
                username: 'officer2',
                email: 'officer2@example.com',
                password: 'hashed-password',
                roles: [
                    { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
                    { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, office: 'WATER' }
                ]
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            const token = await loginOfficerByMail('officer2@example.com', 'password123');

            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 11,
                username: 'officer2',
                isStaff: true,
                type: [OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficerRole.TECHNICAL_OFFICE_STAFF],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should login officer with no roles (empty array)', async () => {
            const mockOfficer: OfficerDAO = {
                id: 12,
                username: 'officer3',
                email: 'officer3@example.com',
                password: 'hashed-password',
                roles: []
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            const token = await loginOfficerByMail('officer3@example.com', 'password123');

            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 12,
                username: 'officer3',
                isStaff: true,
                type: [],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should throw error if officer has no password', async () => {
            const mockOfficer: OfficerDAO = {
                id: 13,
                username: 'officer4',
                email: 'officer4@example.com',
                password: null,
                roles: []
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            await expect(loginOfficerByMail('officer4@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginOfficerByMail('officer4@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should throw error if password is invalid', async () => {
            const mockOfficer: OfficerDAO = {
                id: 14,
                username: 'officer5',
                email: 'officer5@example.com',
                password: 'hashed-password',
                roles: [{ officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, office: null }]
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginOfficerByMail('officer5@example.com', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginOfficerByMail('officer5@example.com', 'wrong-password'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should handle officer with null roles', async () => {
            const mockOfficer: OfficerDAO = {
                id: 15,
                username: 'officer6',
                email: 'officer6@example.com',
                password: 'hashed-password',
                roles: null
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            const token = await loginOfficerByMail('officer6@example.com', 'password123');

            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 15,
                username: 'officer6',
                isStaff: true,
                type: [],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });
    });

    // ===================== loginOfficerByUsername =====================
    describe('loginOfficerByUsername', () => {
        it('should login officer by username successfully', async () => {
            const mockOfficer: OfficerDAO = {
                id: 20,
                username: 'officer_username',
                email: 'officer@example.com',
                password: 'hashed-password',
                roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, office: 'ROADS' }]
            } as any;

            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([mockOfficer]);

            const token = await loginOfficerByUsername('officer_username', 'password123');

            expect(mockOfficerRepo.getOfficersByUsername).toHaveBeenCalledWith('officer_username');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 20,
                username: 'officer_username',
                isStaff: true,
                type: [OfficerRole.TECHNICAL_OFFICE_STAFF],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should throw error if no officer found with username', async () => {
            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([]);

            await expect(loginOfficerByUsername('nonexistent', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginOfficerByUsername('nonexistent', 'password123'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should throw error if officer has no password', async () => {
            const mockOfficer: OfficerDAO = {
                id: 21,
                username: 'officer_nopass',
                email: 'officer@example.com',
                password: null,
                roles: []
            } as any;

            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([mockOfficer]);

            await expect(loginOfficerByUsername('officer_nopass', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginOfficerByUsername('officer_nopass', 'password123'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should throw error if password is invalid', async () => {
            const mockOfficer: OfficerDAO = {
                id: 22,
                username: 'officer_username',
                email: 'officer@example.com',
                password: 'hashed-password',
                roles: []
            } as any;

            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([mockOfficer]);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginOfficerByUsername('officer_username', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginOfficerByUsername('officer_username', 'wrong-password'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should login first officer when multiple officers with same username exist', async () => {
            const mockOfficer1: OfficerDAO = {
                id: 23,
                username: 'officer_dup',
                email: 'officer1@example.com',
                password: 'hashed-password',
                roles: [{ officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }]
            } as any;

            const mockOfficer2: OfficerDAO = {
                id: 24,
                username: 'officer_dup',
                email: 'officer2@example.com',
                password: 'hashed-password',
                roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, office: 'WATER' }]
            } as any;

            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([mockOfficer1, mockOfficer2]);

            const token = await loginOfficerByUsername('officer_dup', 'password123');

            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 23,
                username: 'officer_dup',
                isStaff: true,
                type: [OfficerRole.MUNICIPAL_ADMINISTRATOR],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should propagate repository error when getOfficersByUsername fails', async () => {
            mockOfficerRepo.getOfficersByUsername.mockRejectedValue(new Error('Database error'));

            await expect(loginOfficerByUsername('officer_username', 'password123'))
                .rejects.toThrow('Database error');
        });
    });

    // ===================== loginUser =====================
    describe('loginUser', () => {
        it('should call loginUserByMail when isEmail is true', async () => {
            const mockUser: UserDAO = {
                id: 30,
                username: 'user30',
                email: 'user30@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);

            const token = await loginUser('user30@example.com', 'password123', true);

            expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith('user30@example.com');
            expect(mockUserRepo.getUserByUsername).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should call loginUserByUsername when isEmail is false', async () => {
            const mockUser: UserDAO = {
                id: 31,
                username: 'user31',
                email: 'user31@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUserByUsername.mockResolvedValue(mockUser);

            const token = await loginUser('user31', 'password123', false);

            expect(mockUserRepo.getUserByUsername).toHaveBeenCalledWith('user31');
            expect(mockUserRepo.getUserByEmail).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should propagate errors from loginUserByMail', async () => {
            mockUserRepo.getUserByEmail.mockRejectedValue(new Error("User with email 'invalid@example.com' not found"));

            await expect(loginUser('invalid@example.com', 'password123', true))
                .rejects.toThrow("User with email 'invalid@example.com' not found");
        });

        it('should propagate errors from loginUserByUsername', async () => {
            mockUserRepo.getUserByUsername.mockRejectedValue(new Error("User with username 'invalid' not found"));

            await expect(loginUser('invalid', 'password123', false))
                .rejects.toThrow("User with username 'invalid' not found");
        });
    });

    // ===================== loginOfficer =====================
    describe('loginOfficer', () => {
        it('should call loginOfficerByMail when isEmail is true', async () => {
            const mockOfficer: OfficerDAO = {
                id: 40,
                username: 'officer40',
                email: 'officer40@example.com',
                password: 'hashed-password',
                roles: []
            } as any;

            mockOfficerRepo.getOfficerByEmail.mockResolvedValue(mockOfficer);

            const token = await loginOfficer('officer40@example.com', 'password123', true);

            expect(mockOfficerRepo.getOfficerByEmail).toHaveBeenCalledWith('officer40@example.com');
            expect(mockOfficerRepo.getOfficersByUsername).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should call loginOfficerByUsername when isEmail is false', async () => {
            const mockOfficer: OfficerDAO = {
                id: 41,
                username: 'officer41',
                email: 'officer41@example.com',
                password: 'hashed-password',
                roles: []
            } as any;

            mockOfficerRepo.getOfficersByUsername.mockResolvedValue([mockOfficer]);

            const token = await loginOfficer('officer41', 'password123', false);

            expect(mockOfficerRepo.getOfficersByUsername).toHaveBeenCalledWith('officer41');
            expect(mockOfficerRepo.getOfficerByEmail).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should propagate errors from loginOfficerByMail', async () => {
            mockOfficerRepo.getOfficerByEmail.mockRejectedValue(new Error("Officer with email 'invalid@example.com' not found"));

            await expect(loginOfficer('invalid@example.com', 'password123', true))
                .rejects.toThrow("Officer with email 'invalid@example.com' not found");
        });

        it('should propagate errors from loginOfficerByUsername', async () => {
            mockOfficerRepo.getOfficersByUsername.mockRejectedValue(new Error('Database error'));

            await expect(loginOfficer('invalid', 'password123', false))
                .rejects.toThrow('Database error');
        });
    });

    // ===================== getUserByTelegramUsername =====================
    describe('getUserByTelegramUsername', () => {
        it('should get user by telegram username and return telegram session token', async () => {
            const mockUser: UserDAO = {
                id: 50,
                username: 'user50',
                email: 'user50@example.com',
                telegramUsername: 'telegram_user',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUseryTelegramUsername.mockResolvedValue(mockUser);

            const token = await getUserByTelegramUsername('telegram_user', 12345);

            expect(mockUserRepo.getUseryTelegramUsername).toHaveBeenCalledWith('telegram_user');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 50,
                username: 'user50',
                isStaff: false,
                type: 'user',
                sessionType: 'telegram',
                chatId: 12345
            });
            expect(authService.saveSession).toHaveBeenCalledWith(50, 'mock-token', 'telegram');
            expect(token).toBe('mock-token');
        });

        it('should throw error if no user found with telegram username', async () => {
            mockUserRepo.getUseryTelegramUsername.mockResolvedValue(null as any);
            await expect(getUserByTelegramUsername('nonexistent_telegram', 12345))
                .rejects.toThrow(UnauthorizedError);
            await expect(getUserByTelegramUsername('nonexistent_telegram', 12345))
                .rejects.toThrow('No user associated with this Telegram username');
        });

        it('should propagate repository error when getUseryTelegramUsername fails', async () => {
            mockUserRepo.getUseryTelegramUsername.mockRejectedValue(new Error("User with telegram username 'telegram_user' not found"));

            await expect(getUserByTelegramUsername('telegram_user', 12345))
                .rejects.toThrow("User with telegram username 'telegram_user' not found");
        });

        it('should propagate error when saveSession fails', async () => {
            const mockUser: UserDAO = {
                id: 51,
                username: 'user51',
                email: 'user51@example.com',
                telegramUsername: 'telegram_user2',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockUserRepo.getUseryTelegramUsername.mockResolvedValue(mockUser);
            (authService.saveSession as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

            await expect(getUserByTelegramUsername('telegram_user2', 99999))
                .rejects.toThrow('Redis connection failed');
        });
    });

    // ===================== loginMaintainerByMail =====================
    describe('loginMaintainerByMail', () => {
        it('should login maintainer by email successfully', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 60,
                name: 'maintainer1',
                email: 'maintainer@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainerByEmail.mockResolvedValue(mockMaintainer);

            const token = await loginMaintainerByMail('maintainer@example.com', 'password123');

            expect(mockMaintainerRepo.getMaintainerByEmail).toHaveBeenCalledWith('maintainer@example.com');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 60,
                username: 'maintainer1',
                isStaff: true,
                type: [OfficerRole.MAINTAINER],
                sessionType: 'web'
            });
            expect(authService.saveSession).toHaveBeenCalledWith(60, 'mock-token', 'web');
            expect(token).toBe('mock-token');
        });

        it('should throw error if maintainer has no password', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 61,
                name: 'maintainer2',
                email: 'maintainer2@example.com',
                password: null,
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainerByEmail.mockResolvedValue(mockMaintainer);

            await expect(loginMaintainerByMail('maintainer2@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginMaintainerByMail('maintainer2@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should throw error if password is invalid', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 62,
                name: 'maintainer3',
                email: 'maintainer3@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainerByEmail.mockResolvedValue(mockMaintainer);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginMaintainerByMail('maintainer3@example.com', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginMaintainerByMail('maintainer3@example.com', 'wrong-password'))
                .rejects.toThrow('Invalid email or password');
        });
        it('should propagate repository error when getMaintainerByEmail fails', async () => {
            mockMaintainerRepo.getMaintainerByEmail.mockRejectedValue(new Error("Maintainer with email 'maintainer@example.com' not found"));

            await expect(loginMaintainerByMail('maintainer@example.com', 'password123'))
                .rejects.toThrow("Maintainer with email 'maintainer@example.com' not found");
        });    });

    // ===================== loginMaintainerByUsername =====================
    describe('loginMaintainerByUsername', () => {
        it('should login maintainer by username successfully', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 70,
                name: 'maintainer_username',
                email: 'maintainer@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([mockMaintainer]);

            const token = await loginMaintainerByUsername('maintainer_username', 'password123');

            expect(mockMaintainerRepo.getMaintainersByUsername).toHaveBeenCalledWith('maintainer_username');
            expect(authService.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 70,
                username: 'maintainer_username',
                isStaff: true,
                type: [OfficerRole.MAINTAINER],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should throw error if no maintainer found with username', async () => {
            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([]);

            await expect(loginMaintainerByUsername('nonexistent', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginMaintainerByUsername('nonexistent', 'password123'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should throw error if maintainer has no password', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 71,
                name: 'maintainer_nopass',
                email: 'maintainer@example.com',
                password: null,
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([mockMaintainer]);

            await expect(loginMaintainerByUsername('maintainer_nopass', 'password123'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginMaintainerByUsername('maintainer_nopass', 'password123'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should throw error if password is invalid', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 72,
                name: 'maintainer_username',
                email: 'maintainer@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([mockMaintainer]);
            (authService.verifyPassword as jest.Mock).mockResolvedValue(false);

            await expect(loginMaintainerByUsername('maintainer_username', 'wrong-password'))
                .rejects.toThrow(UnauthorizedError);
            await expect(loginMaintainerByUsername('maintainer_username', 'wrong-password'))
                .rejects.toThrow('Invalid username or password');
        });

        it('should login first maintainer when multiple maintainers with same username exist', async () => {
            const mockMaintainer1: MaintainerDAO = {
                id: 73,
                name: 'maintainer_dup',
                email: 'maintainer1@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            const mockMaintainer2: MaintainerDAO = {
                id: 74,
                name: 'maintainer_dup',
                email: 'maintainer2@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([mockMaintainer1, mockMaintainer2]);

            const token = await loginMaintainerByUsername('maintainer_dup', 'password123');

            expect(authService.generateToken).toHaveBeenCalledWith({
                id: 73,
                username: 'maintainer_dup',
                isStaff: true,
                type: [OfficerRole.MAINTAINER],
                sessionType: 'web'
            });
            expect(token).toBe('mock-token');
        });

        it('should propagate repository error when getMaintainersByUsername fails', async () => {
            mockMaintainerRepo.getMaintainersByUsername.mockRejectedValue(new Error('Database error'));

            await expect(loginMaintainerByUsername('maintainer_username', 'password123'))
                .rejects.toThrow('Database error');
        });
    });

    // ===================== loginMaintainer =====================
    describe('loginMaintainer', () => {
        it('should call loginMaintainerByMail when isEmail is true', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 80,
                name: 'maintainer80',
                email: 'maintainer80@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainerByEmail.mockResolvedValue(mockMaintainer);

            const token = await loginMaintainer('maintainer80@example.com', 'password123', true);

            expect(mockMaintainerRepo.getMaintainerByEmail).toHaveBeenCalledWith('maintainer80@example.com');
            expect(mockMaintainerRepo.getMaintainersByUsername).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should call loginMaintainerByUsername when isEmail is false', async () => {
            const mockMaintainer: MaintainerDAO = {
                id: 81,
                name: 'maintainer81',
                email: 'maintainer81@example.com',
                password: 'hashed-password',
                isActive: true
            } as any;

            mockMaintainerRepo.getMaintainersByUsername.mockResolvedValue([mockMaintainer]);

            const token = await loginMaintainer('maintainer81', 'password123', false);

            expect(mockMaintainerRepo.getMaintainersByUsername).toHaveBeenCalledWith('maintainer81');
            expect(mockMaintainerRepo.getMaintainerByEmail).not.toHaveBeenCalled();
            expect(token).toBe('mock-token');
        });

        it('should propagate errors from loginMaintainerByMail', async () => {
            mockMaintainerRepo.getMaintainerByEmail.mockRejectedValue(new Error("Maintainer with email 'invalid@example.com' not found"));

            await expect(loginMaintainer('invalid@example.com', 'password123', true))
                .rejects.toThrow("Maintainer with email 'invalid@example.com' not found");
        });

        it('should propagate errors from loginMaintainerByUsername', async () => {
            mockMaintainerRepo.getMaintainersByUsername.mockRejectedValue(new Error('Database error'));

            await expect(loginMaintainer('invalid', 'password123', false))
                .rejects.toThrow('Database error');
        });
    });
});