import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { PublicMessageDAO } from "@models/dao/PublicMessageDAO";

export class PublicMessageRepository {
  private readonly repo: Repository<PublicMessageDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(PublicMessageDAO);
  }

  async save(message: Partial<PublicMessageDAO>): Promise<PublicMessageDAO> {
    const entity = this.repo.create(message);
    return this.repo.save(entity);
  }

  async listByReport(reportId: number): Promise<PublicMessageDAO[]> {
    return this.repo.find({
      where: { reportId },
      relations: ["sender"],
      order: { createdAt: "ASC" }
    });
  }

  async markAsRead(messageId: number): Promise<void> {
    await this.repo.update(messageId, { read: true });
  }
}
