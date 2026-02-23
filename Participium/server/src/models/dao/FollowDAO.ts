import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique, CreateDateColumn, Column } from "typeorm";
import { UserDAO } from "./UserDAO";
import { ReportDAO } from "./ReportDAO";

@Entity("follows")
@Unique(["user", "report", "notifyVia"]) // user_id + report_id + notifyVia = UNIQUE
export class FollowDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserDAO, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: UserDAO;

  @ManyToOne(() => ReportDAO, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "report_id" })
  report!: ReportDAO;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @Column({ default: "web" })
  notifyVia!: string;
}
