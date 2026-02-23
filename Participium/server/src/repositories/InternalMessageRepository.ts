import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { InternalMessageDAO } from "@dao/InternalMessageDAO";

export class InternalMessageRepository {
  private readonly repo: Repository<InternalMessageDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(InternalMessageDAO);
  }

  async create(data: Partial<InternalMessageDAO>): Promise<InternalMessageDAO> {
    const message = this.repo.create(data);
    return this.repo.save(message);
  }

  async listByReport(reportId: number): Promise<InternalMessageDAO[]> {
    return this.repo.find({
      where: { reportId },
      order: { createdAt: "ASC" }
    });
  }

  async deleteByReport(reportId: number): Promise<void> {
    await this.repo.delete({ reportId });
  }
}
