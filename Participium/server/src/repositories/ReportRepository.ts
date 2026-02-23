import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { ReportDAO } from "@dao/ReportDAO";
import { UserDAO } from "@dao/UserDAO";
import { OfficeType } from "@models/enums/OfficeType";
import { ReportState } from "@models/enums/ReportState";
import { findOrThrowNotFound } from "@utils/utils";

export class ReportRepository {
  private readonly repo: Repository<ReportDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(ReportDAO);
  }

  async getAllReports(): Promise<ReportDAO[]> {
    return this.repo.find({ relations: ["author"] });
  }


  async getApprovedReports(): Promise<ReportDAO[]> {
    return this.repo.find({
      where: [

        { state: ReportState.ASSIGNED },
        { state: ReportState.IN_PROGRESS },
        { state: ReportState.SUSPENDED }
      ],
      relations: ["author"],
      order: {
        date: "DESC" // Most recent first
      }
    });
  }

  async getReportsByState(state: ReportState): Promise<ReportDAO[]> {
    return this.repo.find({
      where: { state },
      relations: ["author"]
    });
  }

  async getReportById(id: number): Promise<ReportDAO> {
    return findOrThrowNotFound(
      await this.repo.find({ where: { id }, relations: ["author"] }),
      () => true,
      `Report with id '${id}' not found`
    );
  }

  async getReportsByCategory(category: OfficeType): Promise<ReportDAO[]> {
    return this.repo.find({
      where: { category },
      relations: ["author"]
    });
  }

  async getReportsByUserId(userId: number): Promise<ReportDAO[]> {
    const baseWhereConditions = [
      { state: ReportState.ASSIGNED },
      { state: ReportState.IN_PROGRESS },
      { state: ReportState.SUSPENDED }
    ];
    const where = baseWhereConditions.map(condition => ({
      ...condition,
      author: { id: userId }
    }));
    return this.repo.find({
      where,
      relations: ["author"]
    });
  }

  async getReportsByAssignedOfficer(officerId: number): Promise<ReportDAO[]> {
    return this.repo.find({
      where: {
        assignedOfficerId: officerId
      },
      relations: ["author"]
    });
  }
  async getReportsByMaintainerId(maintainerId: number): Promise<ReportDAO[]> {
    return this.repo.find({
      where: {
        assignedMaintainerId: maintainerId
      },
      relations: ["author"]
    });
  }


  async createReport(
    title: string,
    location: {
      id?: number;
      name?: string;
      Coordinates?: { longitude: number; latitude: number };
    },
    author: UserDAO | null,
    anonymity: boolean,
    category: OfficeType,
    document: {
      Description?: string;
      Photos?: string[];
    }
  ): Promise<ReportDAO> {
    // Ensure category is not null (DB constraint). Default to OTHER when missing.
    const safeCategory = category || (OfficeType as any).OTHER || 'other';
    return this.repo.save({
      title,
      location,
      author,
      anonymity,
      category: safeCategory,
      document,
      state: ReportState.PENDING,
      date: new Date()
    });
  }


  async resetReportsAssignmentByOfficer(officerId: number): Promise<void> {
    const reports = await this.getReportsByAssignedOfficer(officerId);
    for (const report of reports) {
      if (report.state === ReportState.ASSIGNED || report.state === ReportState.IN_PROGRESS || report.state === ReportState.SUSPENDED) {
        report.state = ReportState.PENDING
        report.assignedOfficerId = null;
        report.assignedMaintainerId = null;
        await this.repo.save(report);
      }
    }
  }
  async resetPartialReportsAssignmentByOfficer(officerId: number, office: OfficeType): Promise<void> {
    if (office == null) return;
    await this.repo
      .createQueryBuilder()
      .update(ReportDAO)
      .set({ state: ReportState.PENDING, assignedOfficerId: () => 'NULL', assignedMaintainerId: () => 'NULL' })
      .where('assignedOfficerId = :officerId', { officerId })
      .andWhere('category = :office', { office })
      .andWhere('state IN (:...states)', { states: [ReportState.ASSIGNED, ReportState.IN_PROGRESS, ReportState.SUSPENDED] })
      .execute();
  }

  async resetReportsAssignmentByMaintainer(maintainerId: number): Promise<void> {
    const reports = await this.getReportsByMaintainerId(maintainerId);
    for (const report of reports) {
      if (report.state === ReportState.ASSIGNED || report.state === ReportState.IN_PROGRESS) {
        report.state = ReportState.PENDING;
        report.assignedMaintainerId = null;
        await this.repo.save(report);
      }
    }
  }

  async updateReportState(
    id: number,
    state: ReportState,
    reason?: string
  ): Promise<ReportDAO> {
    const report = await this.getReportById(id);

    report.state = state;
    if (state === ReportState.DECLINED && reason) {
      report.reason = reason;
    }

    return this.repo.save(report);
  }

  async deleteReport(id: number): Promise<void> {
    const report = await this.getReportById(id);
    await this.repo.remove(report);
  }

  async assignReportToOfficer(reportId: number, officerId: number): Promise<ReportDAO> {
    const report = await this.getReportById(reportId);
    report.assignedOfficerId = officerId;
    report.state = ReportState.ASSIGNED;
    return this.repo.save(report);
  }

  async assignReportToMaintainer(reportId: number, maintainerId: number): Promise<ReportDAO> {
    const report = await this.getReportById(reportId);
    report.assignedMaintainerId = maintainerId;
    report.state = ReportState.ASSIGNED;
    return this.repo.save(report);
  }

  async updateReport(report: ReportDAO): Promise<ReportDAO> {
    return this.repo.save(report);
  }

  /**
   * Get report statistics grouped by date
   * Returns array with date, totalReports, approvedReports, rejectedReports
   * @param fromDate - Start date filter (optional)
   * @param toDate - End date filter (optional)
   * @param period - Aggregation period: 'daily' | 'weekly' | 'monthly' | 'yearly' (optional)
   * @param category - Category filter (optional)
   */
  async getReportStatistics(
    fromDate?: string,
    toDate?: string,
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly',
    category?: OfficeType
  ): Promise<Array<{ date: string; totalReports: number; approvedReports: number; rejectedReports: number }>> {
    const query = this.repo.createQueryBuilder("report");
    
    // Determine date format based on period
    let dateFormat = "%Y-%m-%d"; // Default: daily
    if (period === 'weekly') {
      dateFormat = "%Y-W%W"; // Year-Week
    } else if (period === 'monthly') {
      dateFormat = "%Y-%m"; // Year-Month
    } else if (period === 'yearly') {
      dateFormat = "%Y"; // Year only
    }
    
    query.select(`strftime('${dateFormat}', report.date)`, "date");
    query.addSelect("COUNT(*)", "totalReports");
    query.addSelect(
      `SUM(CASE WHEN report.state IN ('${ReportState.ASSIGNED}', '${ReportState.IN_PROGRESS}', '${ReportState.SUSPENDED}', '${ReportState.RESOLVED}') THEN 1 ELSE 0 END)`,
      "approvedReports"
    );
    query.addSelect(
      `SUM(CASE WHEN report.state = '${ReportState.DECLINED}' THEN 1 ELSE 0 END)`,
      "rejectedReports"
    );
    
    // Apply filters
    if (fromDate) {
      query.andWhere("report.date >= :fromDate", { fromDate: new Date(fromDate) });
    }
    
    if (toDate) {
      query.andWhere("report.date <= :toDate", { toDate: new Date(toDate) });
    }
    
    if (category) {
      query.andWhere("report.category = :category", { category });
    }
    
    query.groupBy(`strftime('${dateFormat}', report.date)`);
    query.orderBy("date", "DESC");
    
    const result = await query.getRawMany();
    
    return result.map(r => ({
      date: r.date,
      totalReports: Number.parseInt(r.totalReports, 10),
      approvedReports: Number.parseInt(r.approvedReports, 10),
      rejectedReports: Number.parseInt(r.rejectedReports, 10)
    }));
  }

  async getReportsByAuthorId(authorId: number): Promise<ReportDAO[]> {
    return this.repo.find({
      where: { author: { id: authorId } },
      relations: ["author"],
      order: {
        date: "DESC" // Most recent first
      }
    });
  }

    // Public statistics: report count by category (only approved reports)
  async getReportCountByCategory(): Promise<Array<{ category: OfficeType; count: number }>> {
    const result = await this.repo
      .createQueryBuilder("report")
      .select("report.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("report.state IN (:...states)", {
        states: [ReportState.ASSIGNED, ReportState.IN_PROGRESS, ReportState.SUSPENDED]
      })
      .groupBy("report.category")
      .getRawMany();

    return result.map(r => ({
      category: r.category as OfficeType,
      count: Number.parseInt(r.count, 10)
    }));
  }

  // Public statistics: count by state
  async getReportCountByState(): Promise<Array<{ state: string; count: number }>> {
    const result = await this.repo
      .createQueryBuilder("report")
      .select("report.state", "state")
      .addSelect("COUNT(*)", "count")
      .groupBy("report.state")
      .getRawMany();

    return result.map(r => ({
      state: r.state,
      count: Number.parseInt(r.count, 10)
    }));
  }

  // Public statistics: trends by period (day/week/month)
  async getReportTrendsByPeriod(period: 'daily' | 'weekly' | 'monthly'): Promise<Array<{ period: string; count: number }>> {
    let dateFormat: string;
    
    switch (period) {
      case 'daily':
        dateFormat = "%Y-%m-%d";
        break;
      case 'weekly':
        dateFormat = "%Y-%W";
        break;
      case 'monthly':
        dateFormat = "%Y-%m";
        break;
    }

    const result = await this.repo
      .createQueryBuilder("report")
      .select(`strftime('${dateFormat}', report.date)`, "period")
      .addSelect("COUNT(*)", "count")
      .groupBy("period")
      .orderBy("period", "DESC")
      .limit(30) // Last 30 periods (days, weeks, or months)
      .getRawMany();

    return result.map(r => ({
      period: r.period,
      count: Number.parseInt(r.count, 10)
    }));
  }
}
