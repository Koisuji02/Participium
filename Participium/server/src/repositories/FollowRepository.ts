import { Repository } from "typeorm";
import { AppDataSource } from "@database";
import { FollowDAO } from "@dao/FollowDAO";
import { ReportDAO } from "@dao/ReportDAO";
import { UserDAO } from "@dao/UserDAO";
import { ReportRepository } from "@repositories/ReportRepository";
import { UserRepository } from "@repositories/UserRepository";
import { ReportState } from "@models/enums/ReportState";
import { BadRequestError } from "@utils/utils";

export class FollowRepository {
  private readonly repo: Repository<FollowDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(FollowDAO);
  }

  // prende gli user follower di un report
  async getFollowersOfReport(reportId: number, notifyVia: string = "web"): Promise<UserDAO[]> {
    const rows = await this.repo.find({
      where: { 
        report: { id: reportId },
        notifyVia: notifyVia 
      },
      relations: ["user"],
      order: { id: "ASC" }
    });
    return rows.map((r) => r.user);
  }

  // prende i report seguiti da uno user
  async getFollowedReportsByUser(userId: number, notifyVia: string = "web"): Promise<ReportDAO[]> {
    const rows = await this.repo.find({
      where: { 
        user: { id: userId },
        notifyVia: notifyVia
      },
      relations: ["report"],
      order: { id: "ASC" }
    });
    return rows.map((r) => r.report);
  }
  // crea un Follow (quindi crea relazione user-report)
  async follow(userId: number, reportId: number, notifyVia: string = "web"): Promise<FollowDAO> {

    // prendo report (se non esiste, errore; se già CLOSED, errore)
    // valuta se togliere condizione su CLOSED
    const reportRepo = new ReportRepository();
    const report = await reportRepo.getReportById(reportId);
    if (!report) throw new BadRequestError("Report not found");
    if (report.state === ReportState.RESOLVED || report.state === ReportState.DECLINED) throw new BadRequestError("Closed reports cannot be followed");

    // prendo user (se non esiste, errore)
    const userRepo = new UserRepository();
    const user = await userRepo.getUserById(userId);
    if (!user) throw new BadRequestError("User not found");

    // se c'è già un follow con questo report e questo user, tornalo
    const existing = await this.repo.findOne({ where: { user: { id: userId }, report: { id: reportId }, notifyVia } });
    if (existing) return existing;

    // altrimenti lo aggiungi
    return await this.repo.save({ user, report, notifyVia });
  }
  async followAllPersonal(userId: number, notifyVia: string = "web"): Promise<FollowDAO[]> {
    const reportRepo = new ReportRepository();
    const userReport = await reportRepo.getReportsByUserId(userId);

    const follows: FollowDAO[] = [];
    for (const report of userReport) {
      // se c'è già un follow con questo report e questo user, saltalo
      const existing = await this.repo.findOne({ where: { user: { id: userId }, report: { id: report.id }, notifyVia } });
      if (existing) {
        follows.push(existing);
        continue;
      }

      // altrimenti lo aggiungi
      const userRepo = new UserRepository();
      const user = await userRepo.getUserById(userId);
      if (!user) throw new BadRequestError("User not found");

      const follow = await this.repo.save({ user, report, notifyVia });
      follows.push(follow);
    }
    return follows;
  }


  // fa unfollow dato user e report (quindi DELETE di un follo)
  async unfollow(userId: number, reportId: number, notifyVia: string = "web"): Promise<void> {
    // uso direttamente il query builder per eliminare il follow, così mi evito dei find sulla repo
    await this.repo.delete({ 
user: userId as any, 
      report: reportId as any,
        notifyVia: notifyVia
    });
  }

  async unfollowAllByUser(userId: number, notifyVia: string = "web"): Promise<void> {
    // uso direttamente il query builder per eliminare i follow, così mi evito dei find sulla repo
    await this.repo.delete({ 
        user: { id: userId },
        notifyVia: notifyVia
    });
  }
}
