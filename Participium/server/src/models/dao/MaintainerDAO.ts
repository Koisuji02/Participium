//! MAINTAINER DAO
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { OfficeType } from "@models/enums/OfficeType";

@Entity("maintainers")
export class MaintainerDAO {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "text", nullable: false })
    name!: string;

    @Column({ type: "text", nullable: false, unique: true })
    email!: string;

    @Column({ nullable: false })
    password!: string; // hashed
        
    //? un mantainer può occuparsi di più categorie se esterno (?)
    @Column({
        type: "text",
        transformer: {
        to: (value: OfficeType[] | string[]) => JSON.stringify(value),
        from: (value: string) => JSON.parse(value)
        },
        nullable: false
    })
    categories!: OfficeType[];

    @Column({ type: "boolean", default: true })
    active!: boolean;
}
