import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("notifications")
export class NotificationDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "integer", nullable: true })
  reportId!: number | null;

  @Column({ type: "text" })
  type!: string; // STATUS_CHANGE | OFFICER_MESSAGE

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "boolean", default: false })
  read!: boolean;
}
