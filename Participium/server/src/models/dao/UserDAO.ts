import { Entity, PrimaryGeneratedColumn, Column, OneToMany, AfterLoad } from "typeorm";
import { FollowDAO } from "./FollowDAO";
import { ReportDAO } from "./ReportDAO";

@Entity("users")
export class UserDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: false })
  username!: string;

  @Column({ nullable: false })
  firstName!: string;

  @Column({ nullable: false })
  lastName!: string;

  @Column({ nullable: false })
  password!: string; // hashed con bcrypt

  @Column({ unique: true, nullable: false })
  email!: string;

  @Column({type: "boolean", default: false })
  isActive!: boolean;

  @Column({ type: "text", nullable: true })
  avatar!: string | null;

  @Column({ type: "text", nullable: true })
  telegramUsername!: string | null;

  @Column({ default: true })
  emailNotifications!: boolean;

  // follows = lista di follow, ma solo dello user corrente (quindi tutti gli oggetti Follow con dentro user e report, ma con user = this)
  @OneToMany(() => FollowDAO, (f) => f.user)
  follows?: FollowDAO[];

  // non è nel DB, ma comoda per avere direttamente i report seguiti dallo user
  followedReports?: ReportDAO[];

  // AfterLoad dice che va eseguito appena l'entità viene aggiunta al DB, quindi se ha follows e non è vuota, allora mappa i report seguiti in followedReports
  @AfterLoad()
  private _fillFollowedReports() {
    if (this.follows) {
      // filter(Boolean) filtra i valori falsy
      this.followedReports = this.follows.map((f) => f.report).filter(Boolean);
    }
  }
}