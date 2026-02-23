/**
 * Test di esempio per il sistema di notifiche email
 * 
 * Questo file mostra come testare il sistema di notifiche email.
 * Per eseguire questi test, assicurati che:
 * 1. Il database sia configurato correttamente
 * 2. Le credenziali SMTP siano valide
 * 3. L'utente di test abbia un'email valida
 */

import { NotificationRepository } from "../../src/repositories/NotificationRepository";
import { UserRepository } from "../../src/repositories/UserRepository";
import { ReportRepository } from "../../src/repositories/ReportRepository";

/**
 * Test manuale: crea una notifica e verifica che venga inviata l'email
 */
async function testEmailNotification() {
    console.log("🧪 Testing email notification system...\n");

    try {
        const userRepo = new UserRepository();
        const notificationRepo = new NotificationRepository();

        // 1. Crea o recupera un utente di test
        console.log("📝 Step 1: Get test user");
        const testUser = await userRepo.getUserById(1); // Modifica con un ID valido
        console.log(`   User: ${testUser.email}`);
        console.log(`   Email notifications enabled: ${testUser.emailNotifications}\n`);

        // 2. Crea una notifica di test
        console.log("📧 Step 2: Create test notification");
        const notification = await notificationRepo.createNotification({
            userId: testUser.id,
            reportId: null,
            type: "TEST",
            message: "This is a test notification to verify email delivery",
            read: false
        });
        console.log(`   Notification created: #${notification.id}\n`);

        // 3. Verifica l'invio
        console.log("✅ Test completed!");
        console.log("   Check the email inbox for:", testUser.email);
        console.log("   Expected subject: 'Participium - Nuova Notifica'\n");

        return notification;

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

/**
 * Test manuale: verifica cambio preferenze email
 */
async function testEmailPreferences() {
    console.log("🧪 Testing email preferences...\n");

    try {
        const userRepo = new UserRepository();

        // 1. Recupera utente
        console.log("📝 Step 1: Get test user");
        const testUser = await userRepo.getUserById(1);
        console.log(`   Current emailNotifications: ${testUser.emailNotifications}\n`);

        // 2. Disabilita notifiche email
        console.log("🔕 Step 2: Disable email notifications");
        await userRepo.updateProfile(testUser.id, {
            emailNotifications: false
        });
        const updatedUser1 = await userRepo.getUserById(testUser.id);
        console.log(`   emailNotifications: ${updatedUser1.emailNotifications}\n`);

        // 3. Crea notifica (non dovrebbe inviare email)
        console.log("📧 Step 3: Create notification (should NOT send email)");
        const notificationRepo = new NotificationRepository();
        await notificationRepo.createNotification({
            userId: testUser.id,
            reportId: null,
            type: "TEST",
            message: "This notification should NOT trigger an email",
            read: false
        });
        console.log("   Notification created (email should NOT be sent)\n");

        // 4. Riabilita notifiche email
        console.log("🔔 Step 4: Re-enable email notifications");
        await userRepo.updateProfile(testUser.id, {
            emailNotifications: true
        });
        const updatedUser2 = await userRepo.getUserById(testUser.id);
        console.log(`   emailNotifications: ${updatedUser2.emailNotifications}\n`);

        // 5. Crea notifica (dovrebbe inviare email)
        console.log("📧 Step 5: Create notification (SHOULD send email)");
        await notificationRepo.createNotification({
            userId: testUser.id,
            reportId: null,
            type: "TEST",
            message: "This notification SHOULD trigger an email",
            read: false
        });
        console.log("   Notification created (email should be sent)\n");

        console.log("✅ Test completed!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

/**
 * Test manuale: simula cambio stato report
 */
async function testReportStatusChange() {
    console.log("🧪 Testing report status change notification...\n");

    try {
        const reportRepo = new ReportRepository();
        const notificationRepo = new NotificationRepository();

        // 1. Recupera un report di test
        console.log("📝 Step 1: Get test report");
        const testReport = await reportRepo.getReportById(1); // Modifica con un ID valido
        console.log(`   Report #${testReport.id}`);
        console.log(`   Author: ${testReport.author?.email || 'Anonymous'}\n`);

        // 2. Crea notifica di cambio stato
        console.log("📧 Step 2: Create status change notification");
        const notification = await notificationRepo.createStatusChangeNotification(testReport);
        
        if (notification) {
            console.log(`   Notification created: #${notification.id}`);
            console.log(`   Email sent to followers of report #${testReport.id}\n`);
        } else {
            console.log("   No notification created (anonymous report)\n");
        }

        console.log("✅ Test completed!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

// Export delle funzioni di test
export {
    testEmailNotification,
    testEmailPreferences,
    testReportStatusChange
};

/**
 * COME ESEGUIRE I TEST
 * 
 * 1. Importa questo file nel tuo test runner o in un endpoint di sviluppo
 * 
 * 2. Esegui i test manualmente:
 * 
 *    import { testEmailNotification } from './test/emailNotificationTest';
 *    await testEmailNotification();
 * 
 * 3. Oppure crea un endpoint temporaneo per testing:
 * 
 *    router.get('/test/email-notification', async (req, res) => {
 *        try {
 *            await testEmailNotification();
 *            res.json({ success: true });
 *        } catch (error) {
 *            res.status(500).json({ error: error.message });
 *        }
 *    });
 * 
 * 4. Verifica nella console del server i log di invio email
 * 
 * 5. Controlla la casella di posta dell'utente di test
 */
