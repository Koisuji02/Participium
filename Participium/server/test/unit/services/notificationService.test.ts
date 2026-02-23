import "reflect-metadata";
import { sendNotificationEmail } from "../../../src/services/notificationService";
import * as mailService from "../../../src/services/mailService";
import { UserDAO } from "../../../src/models/dao/UserDAO";
import { NotificationDAO } from "../../../src/models/dao/NotificationDAO";

// Mock mailService
jest.mock("../../../src/services/mailService");

describe("NotificationService Unit Tests", () => {
  let mockUser: UserDAO;
  let mockNotification: NotificationDAO;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Create mock user with default values
    mockUser = {
      id: 1,
      username: "testuser",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "hashed_password",
      isActive: true,
      avatar: null,
      telegramUsername: null,
      emailNotifications: true,
      follows: [],
      followedReports: []
    } as any as UserDAO;

    // Create mock notification
    mockNotification = {
      id: 1,
      userId: 1,
      reportId: 123,
      type: "STATUS_CHANGE",
      message: "Your report #123 is now APPROVED",
      createdAt: new Date(),
      read: false
    } as NotificationDAO;

    // Mock sendMail to resolve successfully by default
    (mailService.sendMail as jest.Mock).mockResolvedValue("message-id-123");
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ===================== sendNotificationEmail - Basic Functionality =====================
  describe("sendNotificationEmail - Basic Functionality", () => {
    it("should send email when user has emailNotifications enabled", async () => {
      mockUser.emailNotifications = true;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Report Update"),
          html: expect.any(String),
          text: expect.any(String)
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Email notification sent to ${mockUser.email}`)
      );
    });

    it("should NOT send email when user has emailNotifications disabled", async () => {
      mockUser.emailNotifications = false;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Email notifications disabled for user ${mockUser.id}`)
      );
    });

    it("should include user email in log when notifications are disabled", async () => {
      mockUser.emailNotifications = false;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.email)
      );
    });
  });

  // ===================== STATUS_CHANGE Notifications =====================
  describe("STATUS_CHANGE Notifications", () => {
    beforeEach(() => {
      mockNotification.type = "STATUS_CHANGE";
      mockNotification.reportId = 456;
      mockNotification.message = "Your report #456 is now IN_PROGRESS";
    });

    it("should send email with correct subject for STATUS_CHANGE", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `Participium - Report Update #${mockNotification.reportId}`
        })
      );
    });

    it("should include user firstName in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockUser.firstName);
      expect(callArgs.text).toContain(mockUser.firstName);
    });

    it("should include report ID in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(`Report #${mockNotification.reportId}`);
      expect(callArgs.text).toContain(`Report #${mockNotification.reportId}`);
    });

    it("should include notification message in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockNotification.message);
      expect(callArgs.text).toContain(mockNotification.message);
    });

    it("should use green header color (#4CAF50) in HTML template", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("background-color: #4CAF50");
    });

    it("should include 'Report Update' in header", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("Report Update");
    });

    it("should include footer with disable instructions", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("disable email notifications");
      expect(callArgs.text).toContain("disable email notifications");
    });
  });

  // ===================== OFFICER_MESSAGE Notifications =====================
  describe("OFFICER_MESSAGE Notifications", () => {
    beforeEach(() => {
      mockNotification.type = "OFFICER_MESSAGE";
      mockNotification.reportId = 789;
      mockNotification.message = "Message from officer #5: Please provide more details";
    });

    it("should send email with correct subject for OFFICER_MESSAGE", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `Participium - New Message for Report #${mockNotification.reportId}`
        })
      );
    });

    it("should include user firstName in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockUser.firstName);
      expect(callArgs.text).toContain(mockUser.firstName);
    });

    it("should include officer message in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockNotification.message);
      expect(callArgs.text).toContain(mockNotification.message);
    });

    it("should use blue header color (#2196F3) in HTML template", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("background-color: #2196F3");
    });

    it("should include 'New Message' in header", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("New Message");
    });

    it("should use yellow message box (#fff3cd) in HTML template", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("background-color: #fff3cd");
    });

    it("should include reply instruction in email", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("reply");
      expect(callArgs.text).toContain("reply");
    });
  });

  // ===================== Generic Notifications =====================
  describe("Generic Notifications", () => {
    beforeEach(() => {
      mockNotification.type = "CUSTOM_TYPE";
      mockNotification.reportId = null;
      mockNotification.message = "This is a generic notification message";
    });

    it("should send email with generic subject", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Participium - New Notification"
        })
      );
    });

    it("should include user firstName in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockUser.firstName);
      expect(callArgs.text).toContain(mockUser.firstName);
    });

    it("should include notification message in email body", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockNotification.message);
      expect(callArgs.text).toContain(mockNotification.message);
    });

    it("should use grey header color (#607D8B) in HTML template", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("background-color: #607D8B");
    });

    it("should include 'Notification' in header", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("Participium - Notification");
    });

    it("should handle notification without reportId", async () => {
      mockNotification.reportId = null;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toBeDefined();
      expect(callArgs.text).toBeDefined();
    });
  });

  // ===================== Error Handling =====================
  describe("Error Handling", () => {
    it("should handle sendMail failure gracefully", async () => {
      const error = new Error("SMTP connection failed");
      (mailService.sendMail as jest.Mock).mockRejectedValue(error);

      // Should not throw
      await expect(sendNotificationEmail(mockUser, mockNotification)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send email notification"),
        error
      );
    });

    it("should not throw error when email sending fails", async () => {
      (mailService.sendMail as jest.Mock).mockRejectedValue(new Error("Network error"));

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should log specific error message when sendMail fails", async () => {
      const specificError = new Error("Invalid email address");
      (mailService.sendMail as jest.Mock).mockRejectedValue(specificError);

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        specificError
      );
    });

    it("should include user email in error log", async () => {
      (mailService.sendMail as jest.Mock).mockRejectedValue(new Error("SMTP error"));

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.email),
        expect.any(Error)
      );
    });
  });

  // ===================== HTML Template Structure =====================
  describe("HTML Template Structure", () => {
    it("should generate valid HTML with DOCTYPE", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("<!DOCTYPE html>");
    });

    it("should include UTF-8 charset", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('charset="UTF-8"');
    });

    it("should have proper CSS styling", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("<style>");
      expect(callArgs.html).toContain("font-family: Arial");
    });

    it("should have container with max-width", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("max-width: 600px");
    });

    it("should have rounded corners on header", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("border-radius");
    });

    it("should include footer section", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('<div class="footer">');
    });
  });

  // ===================== Text Template Structure =====================
  describe("Text Template Structure", () => {
    it("should generate plain text version", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
      expect(callArgs.text).not.toContain("<");
      expect(callArgs.text).not.toContain(">");
    });

    it("should include greeting in text version", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.text).toContain(`Hello ${mockUser.firstName}`);
    });

    it("should include separator line in footer", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.text).toContain("---");
    });

    it("should include thank you message", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.text).toContain("Thank you for using Participium");
    });
  });

  // ===================== Edge Cases =====================
  describe("Edge Cases", () => {
    it("should handle user with very long firstName", async () => {
      mockUser.firstName = "A".repeat(100);

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
    });

    it("should handle notification with very long message", async () => {
      mockNotification.message = "Long message ".repeat(100);

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockNotification.message);
    });

    it("should handle special characters in firstName", async () => {
      mockUser.firstName = "José María";

      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("José María");
    });

    it("should handle special characters in notification message", async () => {
      mockNotification.message = "Report with <special> & 'chars'";

      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain(mockNotification.message);
    });

    it("should handle zero reportId", async () => {
      mockNotification.reportId = 0;

      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("Report #0");
    });

    it("should handle negative reportId", async () => {
      mockNotification.reportId = -1;

      await sendNotificationEmail(mockUser, mockNotification);

      const callArgs = (mailService.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("Report #-1");
    });

    it("should handle empty notification message", async () => {
      mockNotification.message = "";

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ===================== Integration with mailService =====================
  describe("Integration with mailService", () => {
    it("should pass correct email address to sendMail", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email
        })
      );
    });

    it("should pass both html and text content", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
          text: expect.any(String)
        })
      );
    });

    it("should log success message with notification ID", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`notification #${mockNotification.id}`)
      );
    });

    it("should work with different email addresses", async () => {
      mockUser.email = "another.user@test.com";

      await sendNotificationEmail(mockUser, mockNotification);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "another.user@test.com"
        })
      );
    });
  });

  // ===================== Multiple Notification Types =====================
  describe("Multiple Notification Types", () => {
    it("should handle switching between notification types", async () => {
      // First STATUS_CHANGE
      mockNotification.type = "STATUS_CHANGE";
      await sendNotificationEmail(mockUser, mockNotification);
      
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Report Update")
        })
      );

      jest.clearAllMocks();

      // Then OFFICER_MESSAGE
      mockNotification.type = "OFFICER_MESSAGE";
      await sendNotificationEmail(mockUser, mockNotification);
      
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("New Message")
        })
      );
    });

    it("should generate different HTML for different types", async () => {
      // STATUS_CHANGE
      mockNotification.type = "STATUS_CHANGE";
      await sendNotificationEmail(mockUser, mockNotification);
      const statusChangeHtml = (mailService.sendMail as jest.Mock).mock.calls[0][0].html;

      jest.clearAllMocks();

      // OFFICER_MESSAGE
      mockNotification.type = "OFFICER_MESSAGE";
      await sendNotificationEmail(mockUser, mockNotification);
      const officerMessageHtml = (mailService.sendMail as jest.Mock).mock.calls[0][0].html;

      expect(statusChangeHtml).not.toEqual(officerMessageHtml);
    });
  });

  // ===================== Logging Behavior =====================
  describe("Logging Behavior", () => {
    it("should log when notifications are disabled", async () => {
      mockUser.emailNotifications = false;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("disabled")
      );
    });

    it("should log when email is sent successfully", async () => {
      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("sent to")
      );
    });

    it("should log error when email fails", async () => {
      (mailService.sendMail as jest.Mock).mockRejectedValue(new Error("SMTP error"));

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should not log success when notifications are disabled", async () => {
      mockUser.emailNotifications = false;

      await sendNotificationEmail(mockUser, mockNotification);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("sent to")
      );
    });
  });
});
