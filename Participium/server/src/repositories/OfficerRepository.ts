//! OFFICER REPOSITORY

import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { OfficerDAO } from "@dao/OfficerDAO";
import { RoleDAO } from "@dao/RoleDAO";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils/utils";
import { UserRepository } from "./UserRepository";
import { hashPassword } from "@services/authService";

export class OfficerRepository {
  private readonly repo: Repository<OfficerDAO>;
  private readonly roleRepo: Repository<RoleDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(OfficerDAO);
    this.roleRepo = AppDataSource.getRepository(RoleDAO);
  }

  async getAllOfficers(): Promise<OfficerDAO[]> {
    return this.repo.find({ relations: ["roles"] });
  }

  async getAdminOfficers(): Promise<OfficerDAO[]> {
    return this.repo
      .createQueryBuilder("officer")
      .leftJoinAndSelect("officer.roles", "role")
      .where("role.officerRole = :admin", { admin: OfficerRole.MUNICIPAL_ADMINISTRATOR })
      .getMany();
  }

  async getOfficerByEmail(email: string): Promise<OfficerDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { email }, relations: ["roles"] }),
      () => true,
      `Officer with email '${email}' not found`
    );
  }

  async getOfficerById(id: number): Promise<OfficerDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { id }, relations: ["roles"] }),
      () => true,
      `Officer with id '${id}' not found`
    );
  }

  async getOfficersByUsername(username: string): Promise<OfficerDAO[]> { 
    return this.repo.find({ where: { username }, relations: ["roles"] });
  }

  async getOfficersByOffice(office: OfficeType): Promise<OfficerDAO[]> {
    return this.repo
      .createQueryBuilder("officer")
      .leftJoinAndSelect("officer.roles", "role")
      .where("role.officeType = :office", { office })
      .getMany();
  }

  async createOfficer(
    username: string,
    name: string,
    surname: string,
    email: string,
    plainPassword: string,
    roles?: { role: OfficerRole; office: OfficeType | null }[], // nuovo parametro opzionale
  ): Promise<OfficerDAO> {
    // Check if email already exists
    throwConflictIfFound(
      await this.repo.find({ where: { email } }),
      () => true,
      `Officer with email '${email}' already exists`
    );

    const userRepo = new UserRepository();
    const existingUser = await userRepo.getUserByEmail(email).catch(() => null);
    if (existingUser) {
      throw new Error(`Email '${email}' is already used.`);
    }
    const hashedPassword = await hashPassword(plainPassword);

    const officer = this.repo.create({
      username,
      name,
      surname,
      email,
      password: hashedPassword
    });

    const savedOfficer = await this.repo.save(officer);

    // Crea tutti i ruoli se forniti
    if (roles && roles.length > 0) {
      const roleDAOs = roles
        .filter(r => r.role != null) // office può essere null, role no
        .map(r =>
          this.roleRepo.create({
            officer: savedOfficer,
            officerRole: r.role,
            officeType: r.office ?? null,
          })
        );
      if (roleDAOs.length > 0) {
        await this.roleRepo.save(roleDAOs);
      }
    }

    return this.getOfficerById(savedOfficer.id);
  }

  async updateOfficer(
    id: number,
    username: string,
    name: string,
    surname: string,
    email: string,
    role?: OfficerRole,
    office?: OfficeType
  ): Promise<OfficerDAO> {
    const officerToUpdate = await this.getOfficerById(id);

    officerToUpdate.username = username;
    officerToUpdate.name = name;
    officerToUpdate.surname = surname;
    officerToUpdate.email = email;

    await this.repo.save(officerToUpdate);

    // Se è stato passato un ruolo/ufficio, rimpiazza i ruoli con quello
    if (role != null && office != null) {
      await this.roleRepo
        .createQueryBuilder()
        .delete()
        .from(RoleDAO)
        .where("officerID = :id", { id })
        .execute();

      const roleDAO = this.roleRepo.create({
        officer: officerToUpdate,
        officerRole: role,
        officeType: office
      });

      await this.roleRepo.save(roleDAO);
    }

    return this.getOfficerById(id);
  }

  // Variante opzionale per aggiornare multi-ruolo
  async updateOfficerRoles(
    id: number,
    roles: { role: OfficerRole; office: OfficeType | null }[]
  ): Promise<OfficerDAO> {
    const officer = await this.getOfficerById(id);

    await this.roleRepo
      .createQueryBuilder()
      .delete()
      .from(RoleDAO)
      .where("officerID = :id", { id })
      .execute();

    if (roles?.length) {
      const roleDAOs = roles.map(r =>
        this.roleRepo.create({
          officer,
          officerRole: r.role,
          officeType: r.office ?? null,
        })
      );
      await this.roleRepo.save(roleDAOs);
    }

    return this.getOfficerById(id);
  }

  async deleteOfficer(id: number): Promise<void> {
    const officer = await this.getOfficerById(id);
    await this.repo.remove(officer);
  }
}