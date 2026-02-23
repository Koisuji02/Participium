import type { Officer as OfficerDTO, RoleEntry } from "@models/dto/Officer";
import { OfficerRoleFromJSON, OfficerRoleToJSON } from "@models/dto/OfficerRole";
import { OfficeTypeFromJSON, OfficeTypeToJSON } from "@models/dto/OfficeType";
import { OfficerDAO } from "@models/dao/OfficerDAO";
import { RoleDAO } from "@models/dao/RoleDAO";

/**
 * Map OfficerDAO -> OfficerDTO
 */
export function toOfficerDTO(dao: OfficerDAO): OfficerDTO {
  return {
    id: dao.id,
    username: dao.username,
    name: dao.name,
    surname: dao.surname,
    email: dao.email,
    // mai esporre la password in chiaro: qui è hashed, quindi omettila nel DTO
    password: undefined,
    roles: (dao.roles ?? []).map((r) => ({
      // converte dagli enum di dominio ai tipi DTO
      role: OfficerRoleFromJSON(r.officerRole as any),
      office: OfficeTypeFromJSON(r.officeType as any),
    })),
  };
}

/**
 * Map OfficerDTO -> OfficerDAO (istanze non gestite da TypeORM)
 * Nota: non salva su DB, crea solo oggetti in memoria.
 */
export function toOfficerDAO(dto: OfficerDTO): OfficerDAO {
  const officer = new OfficerDAO();
  officer.id = dto.id as number;
  officer.username = dto.username as string;
  officer.name = dto.name as string;
  officer.surname = dto.surname as string;
  officer.email = dto.email as string;
  officer.password = dto.password as string;

  officer.roles = (dto.roles ?? []).map((entry: RoleEntry) => {
    const role = new RoleDAO();
    role.officer = officer;
    // converte dai tipi DTO agli enum di dominio
    role.officerRole = OfficerRoleToJSON(entry.role);
    role.officeType = OfficeTypeToJSON(entry.office);
    return role;
  });

  return officer;
}