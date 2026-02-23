//! OFFICER CONTROLLER

import { Officer } from "@dto/Officer";
import { Report } from "@dto/Report";
import { OfficerRepository } from "@repositories/OfficerRepository";
import { ReportRepository } from "@repositories/ReportRepository";
import { mapOfficerDAOToDTO, mapReportDAOToDTO } from "@services/mapperService";
import { ReportState } from "@models/enums/ReportState";
import { NotificationRepository } from "@repositories/NotificationRepository";
import { FollowRepository } from "@repositories/FollowRepository";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
import { sendTelegramMessage } from "@services/telegramService";

export async function getAllOfficers(): Promise<Officer[]> {
  const officerRepo = new OfficerRepository();
  const officers = await officerRepo.getAllOfficers();
  return officers.map(mapOfficerDAOToDTO);
}

export async function getAllOfficersByOfficeType(officeType: string): Promise<Officer[]> {
  const officerRepo = new OfficerRepository();
  const officeTypeEnum = officeType as OfficeType;
  const officers = await officerRepo.getOfficersByOffice(officeTypeEnum);
  return officers.map(mapOfficerDAOToDTO);
}

export async function getOfficer(email: string): Promise<Officer> {
  const officerRepo = new OfficerRepository();
  const officer = await officerRepo.getOfficerByEmail(email);
  return mapOfficerDAOToDTO(officer);
}

export async function createOfficer(officerDto: Officer): Promise<Officer> {
  const officerRepo = new OfficerRepository();

  const firstRole = officerDto.roles?.[0];
  if (!firstRole) {
    throw new Error("At least one role is required to create an officer");
  }

  const createdOfficer = await officerRepo.createOfficer(
    officerDto.username!,
    officerDto.name!,
    officerDto.surname!,
    officerDto.email!,
    officerDto.password!, // plain qui
  );

  await officerRepo.updateOfficerRoles(createdOfficer.id, [
    { role: firstRole.role as OfficerRole, office: (firstRole.office as OfficeType) ?? null }
  ]);

  const extraRoles = (officerDto.roles ?? []).slice(1).map(r => ({
    role: r.role as OfficerRole,
    office: (r.office as OfficeType) ?? null, // forza null se non presente
  }));
  if (extraRoles.length > 0) {
    await officerRepo.updateOfficerRoles(createdOfficer.id, [
      { role: firstRole.role as OfficerRole, office: (firstRole.office as OfficeType) ?? null },
      ...extraRoles,
    ]);
  }

  const finalOfficer = await officerRepo.getOfficerById(createdOfficer.id);
  return mapOfficerDAOToDTO(finalOfficer);
}

export async function updateOfficer(officerDto: Officer): Promise<Officer> {
  const officerRepo = new OfficerRepository();

  const officer = await officerRepo.updateOfficer(
    officerDto.id!,
    officerDto.username!,
    officerDto.name!,
    officerDto.surname!,
    officerDto.email!,
    (officerDto.roles?.[0]?.role as OfficerRole) ?? OfficerRole.TECHNICAL_OFFICE_STAFF,
    ((officerDto.roles?.[0]?.office as OfficeType) ?? null) // passa null se assente
  );

  if (officerDto.roles && officerDto.roles.length > 0) {
    await officerRepo.updateOfficerRoles(officer.id, officerDto.roles.map(r => ({
      role: r.role as OfficerRole,
      office: (r.office as OfficeType) ?? null, // passa null
    })));
  }

  const refreshed = await officerRepo.getOfficerById(officer.id);
  return mapOfficerDAOToDTO(refreshed);
}

/**
 * Aggiunge un ruolo all'officer senza rimuovere gli altri.
 */
export async function addRoleToOfficer(
  officerId: number,
  role: OfficerRole,
  office?: OfficeType
): Promise<Officer> {
  const officerRepo = new OfficerRepository();
  const current = await officerRepo.getOfficerById(officerId);

  // Tipizza office come OfficeType | null
  const currentRoles: { role: OfficerRole; office: OfficeType | null }[] =
    (current.roles ?? []).map(r => ({
      role: r.officerRole,
      office: (r.officeType as OfficeType) ?? null, // normalizza a null
    }));

  const normalizedOffice: OfficeType | null = office ?? null;
  const exists = currentRoles.some(r => r.role === role && r.office === normalizedOffice);
  if (!exists) {
    currentRoles.push({ role, office: normalizedOffice }); // usa null se non fornito
    await officerRepo.updateOfficerRoles(officerId, currentRoles);
  }

  const refreshed = await officerRepo.getOfficerById(officerId);
  return mapOfficerDAOToDTO(refreshed);
}

/**
 * Rimuove un ruolo specifico (coppia role+office) dall'officer.
 */
export async function removeRoleFromOfficer(
  officerId: number,
  role: OfficerRole,
  office: OfficeType
): Promise<Officer> {
  const officerRepo = new OfficerRepository();
  const current = await officerRepo.getOfficerById(officerId);

  const reportRepo = new ReportRepository();
  if (role === OfficerRole.TECHNICAL_OFFICE_STAFF)
    await reportRepo.resetPartialReportsAssignmentByOfficer(officerId, office);

  // Tipizza office come OfficeType | null per compatibilità
  const filtered: { role: OfficerRole; office: OfficeType | null }[] =
    (current.roles ?? [])
      .map(r => ({
        role: r.officerRole,
        office: (r.officeType as OfficeType) ?? null
      }))
      .filter(r => !(r.role === role && r.office === office));



  await officerRepo.updateOfficerRoles(officerId, filtered);

  const refreshed = await officerRepo.getOfficerById(officerId);
  return mapOfficerDAOToDTO(refreshed);
}


export async function assignReportToOfficer(reportId: number, officerId: number): Promise<void> {
  const reportRepo = new ReportRepository();
  const officerRepo = new OfficerRepository();
  const notificationRepo = new NotificationRepository();

  const report = await reportRepo.getReportById(reportId);
  if (report.state !== ReportState.PENDING) {
    throw new Error("Only PENDING reports can be assigned");
  }

  const officer = await officerRepo.getOfficerById(officerId);
  if (!officer) {
    throw new Error("Officer not found");
  }

  await reportRepo.assignReportToOfficer(reportId, officerId);

  const assignedReport = await reportRepo.getReportById(reportId)

  await notificationRepo.createStatusChangeNotification(assignedReport);
}

export async function retrieveDocs(officerId: number): Promise<Report[]> {
  const reportRepo = new ReportRepository();

  const allPending = await reportRepo.getReportsByState(ReportState.PENDING);
  const reports = allPending.filter(r => r.assignedOfficerId === null || r.assignedOfficerId === officerId);
  const opts = { includeFollowerUsers: false };
  return reports.map(r => mapReportDAOToDTO(r, opts));
}

export async function getAssignedReports(officerId: number): Promise<Report[]> {
  const reportRepo = new ReportRepository();
  const reports = await reportRepo.getReportsByAssignedOfficer(officerId);
  const opts = { includeFollowerUsers: false };
  return reports.map(r => mapReportDAOToDTO(r, opts));
}

export async function reviewDoc(officerId: number, idDoc: number, state: ReportState, reason?: string): Promise<Report> {
  const reportRepo = new ReportRepository();
  const officerRepo = new OfficerRepository();
  const notificationRepo = new NotificationRepository();

  const report = await reportRepo.getReportById(idDoc);

  if (report.assignedOfficerId !== null && report.assignedOfficerId !== officerId) {
    throw new Error("You can only review reports assigned to you");
  }
  if (report.state === ReportState.RESOLVED || report.state === ReportState.DECLINED) {
    const payload = {
      message: `Report with id '${idDoc}' is already in state '${report.state}' and cannot be reviewed again.`,
      status: 400
    };
    throw new Error(JSON.stringify(payload));
  }

  let updatedReport = await reportRepo.updateReportState(idDoc, state, reason);

  // Se stato ASSIGNED, scegli un officer dell'ufficio della categoria
  if (state === ReportState.ASSIGNED) {
    const officers = await officerRepo.getOfficersByOffice(report.category);

    if (officers.length > 0) {
      // preferisci officer con almeno un ruolo TECHNICAL_OFFICE_STAFF
      const preferred = officers.find(o => (o.roles ?? []).some(r => r.officerRole === OfficerRole.TECHNICAL_OFFICE_STAFF)) || officers[0];
      updatedReport = await reportRepo.assignReportToOfficer(idDoc, preferred.id);
    }
  }
  await notificationRepo.createStatusChangeNotification(updatedReport);

  const followRepo = new FollowRepository();
  const followers = await followRepo.getFollowersOfReport(updatedReport.id, "telegram");
  const s_title = updatedReport.title;
  let s_state = updatedReport.state.toString();
  if (s_state === ReportState.IN_PROGRESS.toString())
    s_state = "IN PROGRESS";
  for (const follower of followers ?? []) {
    await sendTelegramMessage(follower.id, `The report (ID: ${updatedReport.id}), title "${s_title}" you are following has been updated to '${s_state}'.`);
  }

  return mapReportDAOToDTO(updatedReport);
}

export async function deleteOfficer(id: number): Promise<void> {
  const officerRepo = new OfficerRepository();
  const existingOfficer = await officerRepo.getOfficerById(id);
  if (!existingOfficer) {
    throw new Error(`Officer with id '${id}' does not exist.`);
  }
  const reportRepo = new ReportRepository();
  for (const role of existingOfficer.roles ?? []) {
    if (role.officerRole === OfficerRole.TECHNICAL_OFFICE_STAFF) {
      await reportRepo.resetReportsAssignmentByOfficer(existingOfficer.id);
    }
  }
  await officerRepo.deleteOfficer(id);
}