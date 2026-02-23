import "reflect-metadata";
import { DataSource } from "typeorm";
import { CONFIG } from "@config";
import {createClient} from "redis";
import { OfficerRepository } from "@repositories/OfficerRepository";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
export const AppDataSource = new DataSource({
    type: CONFIG.DB_TYPE as any,
    host: CONFIG.DB_HOST,
    port: CONFIG.DB_PORT,
    username: CONFIG.DB_USERNAME,
    password: CONFIG.DB_PASSWORD,
    database: CONFIG.DB_NAME,
    entities: CONFIG.DB_ENTITIES,
    synchronize: true,
    logging: false
});

export async function initializeDatabase() {
    await AppDataSource.initialize();
    console.log("Successfully connected to DB");

    const officerRepo = new OfficerRepository();
    const officerCount = await officerRepo.getAdminOfficers();

    if (!officerCount || officerCount.length === 0) {
        const username = "admin";
        const name = "admin";
        const surname = "admin";
        const email = "admin@admin.com";
        const password = "admin";

        // usa il tipo richiesto da OfficerRepository.createOfficer
        const roles: { role: OfficerRole; office: OfficeType | null }[] = [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: OfficeType.ORGANIZATION }
        ];

        await officerRepo.createOfficer(
            username,
            name,
            surname,
            email,
            password,
            roles
        );

        console.log("Created default admin officer (username 'admin')");
    }
}

export async function closeDatabase() {
    try {
      await AppDataSource.destroy();
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error while closing database:", error);
    }
}

//redis
export const redisClient = createClient({
    url: `redis://${CONFIG.REDIS_HOST}:${CONFIG.REDIS_PORT}`
});

export async function initializeRedis() {
  redisClient.on("error", (err: unknown) => console.log("Redis Client Error", err));
  await redisClient.connect();
  console.log("Successfully connected to Redis");
}

export async function closeRedis() {
    try {
      await redisClient.quit();
      console.log("Redis connection closed");
    } catch (error) {
      console.error("Error while closing Redis:", error);
    }
}