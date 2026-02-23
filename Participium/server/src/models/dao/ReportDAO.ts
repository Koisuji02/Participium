import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, AfterLoad } from "typeorm";
import { UserDAO } from "./UserDAO";
import { OfficeType } from "@models/enums/OfficeType";
import { ReportState } from "@models/enums/ReportState";
import { FollowDAO } from "./FollowDAO";

@Entity("reports")
export class ReportDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", nullable: false })
  title!: string;

  @Column({ 
    type: "text",
    transformer: {
      to: (value) => JSON.stringify(value),
      from: (value) => JSON.parse(value)
    }
  })
  location!: {
    id?: number;
    name?: string;
    Coordinates?: {
      longitude: number;
      latitude: number;
    };
  };

  @ManyToOne(() => UserDAO, { nullable: true })
  @JoinColumn({ name: "author_id" })
  author!: UserDAO | null;

  @Column({ type: "boolean", default: false })
  anonymity!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  date!: Date;

  @Column({ type: "text", nullable: false })
  category!: OfficeType;

  @Column({ 
    type: "text",
    transformer: {
      to: (value) => JSON.stringify(value),
      from: (value) => JSON.parse(value)
    }
  })
  document!: {
    Description?: string;
    Photos?: string[];
  };

  @Column({ type: "text", default: ReportState.PENDING })
  state!: ReportState;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "integer", nullable: true })
  assignedOfficerId!: number | null;

  @Column({ type: "integer", nullable: true })
  assignedMaintainerId!: number | null;

  @Column({ type: "text", nullable: true })
  reviewStatus!: string | null;

  @Column({ type: "text", nullable: true })
  explanation!: string | null;

  // analogo alla spiegazione in UserDAO, ma per Report
  @OneToMany(() => FollowDAO, (f) => f.report)
  followers?: FollowDAO[];

  followerUsers?: UserDAO[];

  @AfterLoad()
  private _fillFollowerUsers() {
    if (this.followers) {
      this.followerUsers = this.followers.map((f) => f.user).filter(Boolean);
    }
  }
}