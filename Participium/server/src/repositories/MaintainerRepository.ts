//! MAINTAINER REPOSITORY
import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { MaintainerDAO } from "@dao/MaintainerDAO";
import { OfficeType } from "@models/enums/OfficeType";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils/utils";
import { UserRepository } from "./UserRepository";
import { OfficerRepository } from "./OfficerRepository";
import { hashPassword } from "@services/authService";

export class MaintainerRepository {
    private readonly repo: Repository<MaintainerDAO>;

    constructor() {
        this.repo = AppDataSource.getRepository(MaintainerDAO);
    }

    async createMaintainer(
    name: string,
    email: string,
    plainPassword: string,
    categories: OfficeType[],
    active: boolean = true
    ): Promise<MaintainerDAO> {
        // Check if email already exists
        throwConflictIfFound(
            await this.repo.find({ where: { email } }),
            () => true,
            `Maintainer with email '${email}' already exists`
        );
    
        const userRepo = new UserRepository();
        // Tolleriamo il caso "non trovato": se l'utente NON esiste, va bene creare il maintainer
        let existingUser: any = null;
        try {
            existingUser = await userRepo.getUserByEmail(email);
        } catch {
            existingUser = null;
        }
        if (existingUser) {
            throw new Error(`Email '${email}' is already used.`);
        }

        const officerRepo = new OfficerRepository();
        // Anche per officer: se NON esiste, proseguiamo; se esiste con stessa email, conflitto
        let existingOfficer: any = null;
        try {
            existingOfficer = await officerRepo.getOfficerByEmail(email);
        } catch {
            existingOfficer = null;
        }
        if (existingOfficer) {
            throw new Error(`Email '${email}' is already used.`);
        }

        const hashedPassword = await hashPassword(plainPassword);
        return this.repo.save({
            name,
            email,
            password: hashedPassword,
            categories,
            active
        });
    }

    async getMaintainersByUsername(username: string): Promise<MaintainerDAO[]> {
        return this.repo.find({ where: { name: username } });
    }
    async getMaintainerById(id: number): Promise<MaintainerDAO | null> {
        return this.repo.findOne({ where: { id } });
    }

    async getMaintainersByCategory(category: OfficeType): Promise<MaintainerDAO[]> {
        const all = await this.repo.find();
        return all.filter(m => m.active && Array.isArray(m.categories) && m.categories.includes(category));
    }

    async getAllMaintainers(): Promise<MaintainerDAO[]> {
        return this.repo.find();
    }

    async getMaintainerByEmail(email: string): Promise<MaintainerDAO> {
        return findOrThrowNotFound(
            await this.repo.find({ where: { email } }),
            () => true,
            `Maintainer with email '${email}' not found`
        );
    }

    async updateMaintainer(id: number, fields: Partial<MaintainerDAO>): Promise<MaintainerDAO> {
        const m = await this.getMaintainerById(id);
        if (!m) throw new Error(`Maintainer with id '${id}' not found`);
        Object.assign(m, fields);
        return this.repo.save(m);
    }
    async deleteMaintainer(id: number): Promise<void> {
        const maintainer = await this.getMaintainerById(id);
        if (!maintainer) {
            throw new Error(`Maintainer with id '${id}' not found`);
        }
        await this.repo.remove(maintainer);
    }  
}
