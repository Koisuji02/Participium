import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";


@Entity("faqs")
export class FaqDAO {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", nullable: false })
  question!: string;

  @Column({ type: "text", nullable: false })
  answer!: string;
}