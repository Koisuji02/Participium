import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { ReportDAO } from "@models/dao/ReportDAO";
import { UserDAO } from "@models/dao/UserDAO";

@Entity({ name: "public_messages" })
export class PublicMessageDAO {
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
  senderType!: 'citizen' | 'officer';

  @Column({ type: "int" })
  senderId!: number;

  @ManyToOne(() => UserDAO, { nullable: true })
  @JoinColumn({ name: "sender_id" })
  sender?: UserDAO;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "boolean", default: false })
  read!: boolean;
}
