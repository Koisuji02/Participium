import { sendMail } from "./mailService";
import { UserDAO } from "@dao/UserDAO";
import { NotificationDAO } from "@dao/NotificationDAO";

/**
 * Service to send email to users based on their notification preferences
 * @module notificationService
 */

export async function sendNotificationEmail(
  user: UserDAO,
  notification: NotificationDAO
): Promise<void> {
  // Verifica se l'utente ha abilitato le notifiche email
  if (!user.emailNotifications) {
    console.log(`Email notifications disabled for user ${user.id} (${user.email})`);
    return;
  }

  // Prepara il contenuto dell'email in base al tipo di notifica
  let subject: string;
  let htmlContent: string;
  let textContent: string;

  if (notification.type === "STATUS_CHANGE") {
    subject = `Participium - Report Update #${notification.reportId}`;
    htmlContent = generateStatusChangeEmailHTML(user, notification);
    textContent = generateStatusChangeEmailText(user, notification);
  } else if (notification.type === "OFFICER_MESSAGE") {
    subject = `Participium - New Message for Report #${notification.reportId}`;
    htmlContent = generateOfficerMessageEmailHTML(user, notification);
    textContent = generateOfficerMessageEmailText(user, notification);
  } else {
    subject = `Participium - New Notification`;
    htmlContent = generateGenericEmailHTML(user, notification);
    textContent = generateGenericEmailText(user, notification);
  }

  try {
    await sendMail({
      to: user.email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    console.log(`Email notification sent to ${user.email} for notification #${notification.id}`);
  } catch (error) {
    console.error(`Failed to send email notification to ${user.email}:`, error);
    // Non propaghiamo l'errore per non bloccare il processo di notifica
  }
}

/**
 * Template HTML per notifica di cambio stato
 */
function generateStatusChangeEmailHTML(user: UserDAO, notification: NotificationDAO): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: white;
      padding: 20px;
      border-radius: 0 0 5px 5px;
    }
    .notification-box {
      background-color: #e7f3fe;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Participium - Report Update</h2>
    </div>
    <div class="content">
      <p>Hello ${user.firstName},</p>
      <p>Your report has received a status update:</p>
      
      <div class="notification-box">
        <strong>Report #${notification.reportId}</strong><br>
        ${notification.message}
      </div>
      
      <p>You can view all the details by accessing the Participium platform.</p>
      
      <p>Thank you for using Participium!</p>
    </div>
    <div class="footer">
      <p>This is an automated message. To disable email notifications, access your configuration panel on Participium.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template testo semplice per notifica di cambio stato
 */
function generateStatusChangeEmailText(user: UserDAO, notification: NotificationDAO): string {
  return `
Hello ${user.firstName},

Your report has received a status update:

Report #${notification.reportId}
${notification.message}

You can view all the details by accessing the Participium platform.

Thank you for using Participium!

---
This is an automated message. To disable email notifications, access your configuration panel on Participium.
  `;
}

/**
 * Template HTML per messaggio da officer
 */
function generateOfficerMessageEmailHTML(user: UserDAO, notification: NotificationDAO): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #2196F3;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: white;
      padding: 20px;
      border-radius: 0 0 5px 5px;
    }
    .message-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>💬 Participium - New Message</h2>
    </div>
    <div class="content">
      <p>Hello ${user.firstName},</p>
      <p>You have received a new message regarding your report:</p>
      
      <div class="message-box">
        <strong>Report #${notification.reportId}</strong><br>
        ${notification.message}
      </div>
      
      <p>You can reply by accessing the Participium platform.</p>
      
      <p>Thank you for using Participium!</p>
    </div>
    <div class="footer">
      <p>This is an automated message. To disable email notifications, access your configuration panel on Participium.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template testo semplice per messaggio da officer
 */
function generateOfficerMessageEmailText(user: UserDAO, notification: NotificationDAO): string {
  return `
Hello ${user.firstName},

You have received a new message regarding your report:

Report #${notification.reportId}
${notification.message}

You can reply by accessing the Participium platform.

Thank you for using Participium!

---
This is an automated message. To disable email notifications, access your configuration panel on Participium.
  `;
}

/**
 * Template HTML generico
 */
function generateGenericEmailHTML(user: UserDAO, notification: NotificationDAO): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #607D8B;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: white;
      padding: 20px;
      border-radius: 0 0 5px 5px;
    }
    .notification-box {
      background-color: #f5f5f5;
      border-left: 4px solid #607D8B;
      padding: 15px;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Participium - Notification</h2>
    </div>
    <div class="content">
      <p>Hello ${user.firstName},</p>
      <p>You have a new notification:</p>
      
      <div class="notification-box">
        ${notification.message}
      </div>
      
      <p>You can view all the details by accessing the Participium platform.</p>
      
      <p>Thank you for using Participium!</p>
    </div>
    <div class="footer">
      <p>This is an automated message. To disable email notifications, access your configuration panel on Participium.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template testo semplice generico
 */
function generateGenericEmailText(user: UserDAO, notification: NotificationDAO): string {
  return `
Hello ${user.firstName},

You have a new notification:

${notification.message}

You can view all the details by accessing the Participium platform.

Thank you for using Participium!

---
This is an automated message. To disable email notifications, access your configuration panel on Participium.
  `;
}
