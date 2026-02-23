import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { OfficerDAO } from "./OfficerDAO";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";

@Entity("role")
export class RoleDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OfficerDAO, (officer) => officer.roles, {
    onDelete: "CASCADE", 
  })
  @JoinColumn({ name: "officerID" })
  officer!: OfficerDAO;

  // SQLite: store enum as text
  @Column({ type: "text", nullable: false })
  officerRole!: OfficerRole;

  @Column({ type: "text", nullable: true })
  officeType!: OfficeType | null;
}
