//! USER REPOSITORY

import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { OfficerRepository } from "./OfficerRepository";
import { UserDAO } from "@dao/UserDAO";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils/utils";
import { hashPassword } from "@services/authService";

export class UserRepository {
  private readonly repo: Repository<UserDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(UserDAO);
  }

  async getAllUsers(): Promise<UserDAO[]> {
    return this.repo.find();
  }

  async getUserByUsername(username: string): Promise<UserDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { username } }),
      () => true,
      `User with username '${username}' not found`
    );
  }

  async getUserByEmail(email: string): Promise<UserDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { email } }),
      () => true,
      `User with email '${email}' not found`
    );
  }

  async getUserById(id: number): Promise<UserDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { id } }),
      () => true,
      `User with id '${id}' not found`
    );
  }

  // Same as getUserById, but eagerly loads follow relations so that UserDAO.followedReports can be populated by @AfterLoad
  async getUserByIdWithFollows(id: number): Promise<UserDAO> {
    return findOrThrowNotFound(
      await this.repo.find({
        where: { id },
        relations: ["follows", "follows.report"],
      }),
      () => true,
      `User with id '${id}' not found`
    );
  }

 
  async createUser(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    plainPassword: string
  ): Promise<UserDAO> {
    // Check if username already exists
    throwConflictIfFound(
      await this.repo.find({ where: { username } }),
      () => true,
      `User with username '${username}' already exists`
    );
    const officerRepo = new OfficerRepository();
    const existingOfficer = await officerRepo.getOfficerByEmail(email).catch(() => null);
    if (existingOfficer) {
      throw new Error(`Email '${email}' is already used.`);
    }
    const usernameOfficer = await officerRepo.getOfficersByUsername(username);
    if (usernameOfficer.length > 0) {
      throw new Error(`Username '${username}' is already used.`);
    }
    // Check if email already exists
    throwConflictIfFound(
      await this.repo.find({ where: { email } }),
      () => true,
      `User with email '${email}' already exists`
    );
    // Hash password
    const hashedPassword = await hashPassword(plainPassword);

    // Create and save user
    return this.repo.save({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword
    });
  }

  async deleteUser(username: string): Promise<void> {
    const user = await this.getUserByUsername(username);
    await this.repo.remove(user);
  }

  async getUseryTelegramUsername(telegramUsername: string): Promise<UserDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { telegramUsername } }),
      () => true,
      `User with telegram username '${telegramUsername}' not found`
    );
  }

  //? update profile (story 9 -> telegram username, email notifications, avatar)
  async updateProfile(userId: number, data: {
      telegramUsername?: string | null;
      emailNotifications?: boolean;
      avatarPath?: string | null
  }): Promise<UserDAO> {
    const user = await this.getUserById(userId);
    if (data.telegramUsername !== undefined) user.telegramUsername = data.telegramUsername;
    if (data.emailNotifications !== undefined) user.emailNotifications = data.emailNotifications;
    if (data.avatarPath !== undefined) user.avatar = data.avatarPath;
    return this.repo.save(user);
  }

  async activateUser(email: string): Promise<UserDAO> {
    const user = await this.getUserByEmail(email);
    
    user.isActive = true;
    return this.repo.save(user);
  }
}
