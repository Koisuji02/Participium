import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { ReportDAO } from "@models/dao/ReportDAO";
import { OfficerRole } from "@models/enums/OfficerRole";

export type ParticipantType = OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER;

@Entity({ name: "internal_messages" })
export class InternalMessageDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ReportDAO, { onDelete: "CASCADE" })
  @JoinColumn({ name: "report_id" })
  report!: ReportDAO;

  @Column({ name: "report_id" })
  @Index()
  reportId!: number;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "text" })
  senderType!: ParticipantType;

  @Column({ type: "int" })
  senderId!: number;

  @Column({ type: "text" })
  receiverType!: ParticipantType;

  @Column({ type: "int" })
  receiverId!: number;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "boolean", default: false })
  read!: boolean;
}
