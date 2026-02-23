//! MAPPER SERVICE (converts DAO to DTO)

import { UserDAO } from "@dao/UserDAO";
import { OfficerDAO } from "@dao/OfficerDAO";
import { ReportDAO } from "@dao/ReportDAO";
import { User } from "@dto/User";
import { Officer } from "@dto/Officer";
import { Report } from "@dto/Report";

// Usa gli enum del DTO per tipizzare il risultato
import { OfficerRole as DtoOfficerRole } from "@dto/OfficerRole";
import { OfficeType as DtoOfficeType } from "@dto/OfficeType";

/**
 * DAO -> DTO: User
 */
export function mapUserDAOToDTO(dao: UserDAO, opts?: { includeFollowedReports?: boolean }): User {
  const base: User = {
    id: dao.id,
    username: dao.username,
    firstName: dao.firstName,
    lastName: dao.lastName,
    email: dao.email,
    // Non restituiamo mai la password in DTO!
    password: undefined,
    avatar: dao.avatar || undefined,
    telegramUsername: dao.telegramUsername || undefined,
    emailNotifications: dao.emailNotifications,
  };

  if (opts?.includeFollowedReports && dao.followedReports) {
    (base as any).followedReports = dao.followedReports.map(r => mapReportDAOToDTO(r, { includeFollowerUsers: false }));
  }

  return base;
}

/**
 * DAO -> DTO: Officer
 */
export function mapOfficerDAOToDTO(dao: OfficerDAO): Officer {
  return {
    id: dao.id,
    username: dao.username,
    name: dao.name,
    surname: dao.surname,
    email: dao.email,
    roles: (dao.roles ?? []).map(r => ({
      // converte tra enum di model -> enum di dto
      role: (r.officerRole as unknown as DtoOfficerRole),
      office: r.officeType == null
        ? null
        : ((r.officeType as unknown as DtoOfficeType))
    })),
    password: undefined
  };
}

/**
 * DAO -> DTO: Report
 */
export function mapReportDAOToDTO(dao: ReportDAO, opts?: { includeFollowerUsers?: boolean }): Report {
  const base: Report = {
    id: dao.id,
    title: dao.title,
    location: dao.location,
    author: dao.author ? mapUserDAOToDTO(dao.author, { includeFollowedReports: false }) : undefined,
    anonymity: dao.anonymity,
    date: dao.date.toISOString(),
    category: dao.category as any,
    document: {
      description: dao.document?.Description,
      photos: dao.document?.Photos
    },
    state: dao.state,
    assignedOfficerId: dao.assignedOfficerId ?? undefined,
    assignedMaintainerId: dao.assignedMaintainerId ?? undefined,
    reason: dao.reason ?? undefined
  };

  if (opts?.includeFollowerUsers && (dao as any).followerUsers) {
    (base as any).followerUsers = (dao as any).followerUsers.map((u: UserDAO) => mapUserDAOToDTO(u, { includeFollowedReports: false }));
  }

  return base;
}
