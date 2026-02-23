import { AppDataSource } from "@database";
import { Repository } from "typeorm";
import { NotificationDAO } from "@dao/NotificationDAO";
import { ReportDAO } from "@dao/ReportDAO";

import { FollowRepository } from "@repositories/FollowRepository";
import { UserRepository } from "@repositories/UserRepository";
import { mapUserDAOToDTO } from "@services/mapperService";
import { sendNotificationEmail } from "@services/notificationService";

function formatString(input: string): string {
    return input
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll(/\b\w/g, c => c.toUpperCase());
  }

export class NotificationRepository {
    private readonly repo: Repository<NotificationDAO>;

    constructor() {
        this.repo = AppDataSource.getRepository(NotificationDAO);
    }

    //? prende tutte le notifiche/messaggi per uno user (con filtro opzionale su non letti se dovesse servire)
    async listByUser(userId: number, unreadOnly?: boolean): Promise<NotificationDAO[]> {
        const where: any = { userId };
        if (unreadOnly) where.read = false;
        return this.repo.find({ where, order: { createdAt: "DESC" } });
    }

    //? segna come letta una notifica specifica per uno user
    async markRead(id: number, userId: number): Promise<NotificationDAO> {
        const notif = await this.repo.findOneByOrFail({ id });
        if (notif.userId !== userId) {
            throw new Error("Not allowed to modify this notification");
        }
        notif.read = true;
        return this.repo.save(notif);
    }
    async createNotification(notification: Partial<NotificationDAO>): Promise<NotificationDAO> {
        const newNotification = this.repo.create(notification);
        const savedNotification = await this.repo.save(newNotification);
        
        // Invia email se l'utente ha abilitato le notifiche email
        if (savedNotification.userId) {
            try {
                const userRepo = new UserRepository();
                const userDAO = await userRepo.getUserById(savedNotification.userId);
                await sendNotificationEmail(userDAO, savedNotification);
            } catch (error) {
                console.error(`Failed to send email for notification ${savedNotification.id}:`, error);
                // Continuiamo comunque, l'email è opzionale
            }
        }
        
        return savedNotification;
    }
    //? crea una notifica di cambio stato per l'autore del report (user quindi, se non è anonimo)
    async createStatusChangeNotification(report: ReportDAO): Promise<NotificationDAO | null> {

        const repo = new FollowRepository();
        const users = await repo.getFollowersOfReport(report.id);
        const dto = users.map(u => mapUserDAOToDTO(u));
        if (report.author?.id === undefined) return null; // anonymous
        let lastNotification: NotificationDAO | null = null;
        const userRepo = new UserRepository();
        
        for (const user of dto) {
           lastNotification = await this.repo.save({
                userId: user.id,
                reportId: report.id,
                type: "STATUS_CHANGE",
                message: this.buildStatusMessage(report),
                read: false
            });
            
            // Invia email se l'utente ha abilitato le notifiche email
            if (user.id !== undefined) {
                try {
                    const userDAO = await userRepo.getUserById(user.id);
                    await sendNotificationEmail(userDAO, lastNotification);
                } catch (error) {
                    console.error(`Failed to send email for notification ${lastNotification.id}:`, error);
                    // Continuiamo comunque, l'email è opzionale
                }
            }
        }
        return lastNotification;
    }

    //? come sopra, ma per Message (non per cambio di stato) da officer a user
    async createOfficerMessageNotification(report: ReportDAO, officerId: number, text: string): Promise<NotificationDAO | null> {
        if (report.author?.id === undefined) return null; // anonymous
        const msg = `Message from officer #${officerId}: ${text}`;
        const notification = await this.repo.save({
            userId: report.author.id,
            reportId: report.id,
            type: "OFFICER_MESSAGE",
            message: msg,
            read: false
        });
        
        // Invia email se l'utente ha abilitato le notifiche email
        try {
            const userRepo = new UserRepository();
            const userDAO = await userRepo.getUserById(report.author.id);
            await sendNotificationEmail(userDAO, notification);
        } catch (error) {
            console.error(`Failed to send email for notification ${notification.id}:`, error);
            // Continuiamo comunque, l'email è opzionale
        }
        
        return notification;
    }

    //? creazione di messaggio di notifica per cambio stato report (chiamato nella createStatusChangeNotification sopra)
    private buildStatusMessage(report: ReportDAO): string {
        // stato == declined (scrivo perchè in risposta, prendendo la reason implementata in precedenza)
        if (report.state === "DECLINED") {
            return `Your report ${report.title} has been DECLINED. Reason: ${report.reason || "N/A"}`;
        }

        if (report.state === "ASSIGNED") {
            return `Your report ${report.title} has been ACCEPTED and assigned to an operator.`;
        }
        // stato diverso da declined -> segno nuovo stato
        return `Your report ${report.title} is now ${formatString(report.state)}`;
    }
}
