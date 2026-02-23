//! MAINTAINER CONTROLLER
import { MaintainerRepository } from "@repositories/MaintainerRepository";
import { ReportRepository } from "@repositories/ReportRepository";
import { OfficeType } from "@models/enums/OfficeType";
import { ReportState } from "@models/enums/ReportState";
import { NotificationRepository } from "@repositories/NotificationRepository";
import { mapReportDAOToDTO } from "@services/mapperService";
import { Report } from "@models/dto/Report";
import { FollowRepository } from "@repositories/FollowRepository";
import { sendTelegramMessage } from "@services/telegramService";
export async function createMaintainer(name: string, email: string, password: string,  categories: OfficeType[], active: boolean = true) {
  const repo = new MaintainerRepository();
  const maintainer = await repo.createMaintainer(name, email, password, categories, active);
  return maintainer;
}

export async function getMaintainersByCategory(category: OfficeType) {
  const repo = new MaintainerRepository();
  const maintainers = await repo.getMaintainersByCategory(category);
  return maintainers;
}

export async function getAllMaintainers() {
  const repo = new MaintainerRepository();
  const maintainers = await repo.getAllMaintainers();
  return maintainers;
}

export async function getMaintainerById(id: number) {
  const repo = new MaintainerRepository();
  const maintainer = await repo.getMaintainerById(id);
  return maintainer;
}

export async function getMaintainerByEmail(email: string) {
  const repo = new MaintainerRepository();
  const maintainer = await repo.getMaintainerByEmail(email);
  return maintainer;
}

export async function updateMaintainer(id: number, fields: { name?: string; email?: string; categories?: OfficeType[]; active?: boolean; }) {
  const repo = new MaintainerRepository();
  const updatedMaintainer = await repo.updateMaintainer(id, fields as any);
  return updatedMaintainer;
}

export async function assignReportToMaintainer(reportId: number, maintainerId: number) {
  const reportRepo = new ReportRepository();
  const maintainerRepo = new MaintainerRepository();
  
    // Verifica che il report non sia già risolto o rifiutato
    const report = await reportRepo.getReportById(reportId);
    if (report.state === ReportState.RESOLVED || report.state === ReportState.DECLINED) {
      throw new Error("Cannot assign resolved or declined reports");
    }
  
    // Verifica che il maintainer esista
    const maintainer = await maintainerRepo.getMaintainerById(maintainerId);
    if (!maintainer) {
      throw new Error("Maintainer not found");
    }

    await reportRepo.assignReportToMaintainer(reportId, maintainerId);
}

export async function getAssignedReportsForMaintainer(maintainerId: number) {
  const reportRepo = new ReportRepository();
  const reports = await reportRepo.getReportsByMaintainerId(maintainerId);
  const opts = { includeFollowerUsers: false };
  return reports.map(r => mapReportDAOToDTO(r, opts));
}

// PT-25: Il maintainer aggiorna lo stato di un report assegnato a lui
export async function updateReportStatusByMaintainer(
  maintainerId: number,
  reportId: number,
  nextState: ReportState,
  reason?: string
) : Promise<Report> {
  const reportRepo = new ReportRepository();
  const notificationRepo = new NotificationRepository();
  
  const report = await reportRepo.getReportById(reportId);

  // Consentito solo se il report è assegnato a questo maintainer
  if (report.assignedMaintainerId !== maintainerId) {
    throw new Error("You can only update reports assigned to you as maintainer");
  }

  // Blocca doppie chiusure o declini
  if (report.state === ReportState.RESOLVED || report.state === ReportState.DECLINED) {
    const payload = {
      message: `Report with id '${reportId}' is already in state '${report.state}' and cannot be reviewed again.`,
      status: 400
    };
    throw new Error(JSON.stringify(payload));
  }

  // Consenti transizioni operative parallele al technical officer: IN_PROGRESS, SUSPENDED, RESOLVED
  const allowedTargets = [ReportState.IN_PROGRESS, ReportState.SUSPENDED, ReportState.RESOLVED];
  if (!allowedTargets.includes(nextState)) {
    throw new Error("Invalid target state for maintainer");
  }

  // Stato corrente deve essere operativo (ASSIGNED/IN_PROGRESS/SUSPENDED)
  const operational = [ReportState.ASSIGNED, ReportState.IN_PROGRESS, ReportState.SUSPENDED];
  if (!operational.includes(report.state)) {
    throw new Error("Report is not in an operational state");
  }

  // Applica reason solo per SUSPENDED
  let updatedReport = await reportRepo.updateReportState(reportId, nextState, nextState === ReportState.SUSPENDED ? reason : undefined);

  // Per il maintainer non si riassegna, si opera solo sugli stati

  // Notifica cambio stato al cittadino (e agli attori interessati) come per officer
  const notification = await notificationRepo.createStatusChangeNotification(updatedReport);
    const followRepo = new FollowRepository();
    const followers = await followRepo.getFollowersOfReport(updatedReport.id, "telegram");
    const s_title = updatedReport.title;
    let s_state = updatedReport.state.toString();
    if (s_state === ReportState.IN_PROGRESS.toString())
      s_state = "IN PROGRESS";
    for (const follower of followers ?? []) {
      await sendTelegramMessage(follower.id, `The report (ID: ${updatedReport.id}), title "${s_title}" you are following has been updated to '${s_state}'.`);
    }

  if(!notification) {
    throw new Error("Failed to create notification for report status change");
  }

   return mapReportDAOToDTO(updatedReport);
  
}

export async function deleteMaintainer(id: number) {
  const repo = new MaintainerRepository();
  const reportRepo = new ReportRepository();

  // Prima di eliminare il maintainer, resetta l'assegnazione dei report
  await reportRepo.resetReportsAssignmentByMaintainer(id);

  // Ora elimina il maintainer
  await repo.deleteMaintainer(id);
}
