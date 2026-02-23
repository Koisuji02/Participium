# Backend Integration Requirements - Notifications & Messaging System

## Overview
The client-side implementation for the notification and messaging system is complete and currently using localStorage as a mock backend. This document outlines the API endpoints and database schema required for backend integration.

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  report_id INT NOT NULL,
  message TEXT NOT NULL,
  type ENUM('success', 'error') NOT NULL,
  timestamp BIGINT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES reports(id),
  INDEX idx_user_id (user_id),
  INDEX idx_read (read),
  INDEX idx_timestamp (timestamp)
);
```

**Fields:**
- `id`: Unique identifier (UUID format)
- `user_id`: ID of the citizen who created the report
- `report_id`: ID of the report being reviewed
- `message`: Notification text (e.g., "Your report #123 has been approved")
- `type`: 'success' for approvals, 'error' for rejections
- `timestamp`: Unix timestamp in milliseconds
- `read`: Whether the user has clicked on the notification
- `processed`: Whether the notification has been fetched by the client (prevents duplicates)

### Messages Table
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  report_id INT NOT NULL,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (report_id) REFERENCES reports(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  INDEX idx_report_id (report_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_timestamp (timestamp)
);
```

**Fields:**
- `id`: Unique identifier (UUID format)
- `report_id`: ID of the report this conversation is about
- `sender_id`: User ID of the message sender (officer)
- `recipient_id`: User ID of the message recipient (citizen)
- `message`: Message content from officer
- `timestamp`: Unix timestamp in milliseconds
- `read`: Whether the recipient has viewed the message

## Required API Endpoints

### Notifications API

#### 1. Get User Notifications
```
GET /api/v1/notifications
Authorization: Bearer <token>

Response 200:
{
  "notifications": [
    {
      "id": "uuid",
      "userId": 123,
      "reportId": 456,
      "message": "Your report #456 has been approved",
      "type": "success",
      "timestamp": 1700000000000,
      "read": false,
      "processed": false
    }
  ]
}
```

#### 2. Mark Notification as Read
```
PATCH /api/v1/notifications/:id/read
Authorization: Bearer <token>

Request Body:
{
  "read": true
}

Response 200:
{
  "success": true
}
```

#### 3. Mark All Notifications as Read
```
PATCH /api/v1/notifications/read-all
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "updated": 5
}
```

#### 4. Delete Notification
```
DELETE /api/v1/notifications/:id
Authorization: Bearer <token>

Response 200:
{
  "success": true
}
```

### Messages API

#### 1. Get User Messages
```
GET /api/v1/messages
Authorization: Bearer <token>

Response 200:
{
  "messages": [
    {
      "id": "uuid",
      "reportId": 456,
      "senderId": 789,
      "recipientId": 123,
      "message": "Your report has been approved. Thank you!",
      "timestamp": 1700000000000,
      "read": false
    }
  ]
}
```

#### 2. Get Messages for a Specific Report
```
GET /api/v1/messages/report/:reportId
Authorization: Bearer <token>

Response 200:
{
  "messages": [
    {
      "id": "uuid",
      "reportId": 456,
      "senderId": 789,
      "recipientId": 123,
      "message": "Your report has been approved.",
      "timestamp": 1700000000000,
      "read": false
    }
  ]
}
```

#### 3. Send Message (Used when officer approves/rejects report)
```
POST /api/v1/messages
Authorization: Bearer <token>

Request Body:
{
  "reportId": 456,
  "recipientId": 123,
  "message": "Your report has been approved. Great work!"
}

Response 201:
{
  "message": {
    "id": "uuid",
    "reportId": 456,
    "senderId": 789,
    "recipientId": 123,
    "message": "Your report has been approved. Great work!",
    "timestamp": 1700000000000,
    "read": false
  }
}
```

#### 4. Mark Messages as Read
```
PATCH /api/v1/messages/report/:reportId/read
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "updated": 3
}
```

## Integration in Report Review Process

When an officer reviews a report (`reviewReport` function in `reportController.ts`), the backend should:

1. **Update the report status** (APPROVED or DECLINED)
2. **Create a notification** for the citizen:
   ```typescript
   {
     userId: report.creatorId,
     reportId: report.id,
     message: state === 'APPROVED' 
       ? `Your report #${report.id} has been approved`
       : `Your report #${report.id} has been declined. Reason: ${reviewMessage}`,
     type: state === 'APPROVED' ? 'success' : 'error',
     timestamp: Date.now(),
     read: false,
     processed: false
   }
   ```
3. **Create a message** if the officer provided one:
   ```typescript
   {
     reportId: report.id,
     senderId: officerId, // from JWT token
     recipientId: report.creatorId,
     message: reviewMessage,
     timestamp: Date.now(),
     read: false
   }
   ```

## Client-Side Files to Update (After APIs are Ready)

### 1. `client/src/contexts/NotificationContext.tsx`
Replace localStorage operations with API calls:
- `checkPendingNotifications()` → `GET /api/v1/notifications`
- `markAsRead()` → `PATCH /api/v1/notifications/:id/read`
- `markAllAsRead()` → `PATCH /api/v1/notifications/read-all`
- `deleteNotification()` → `DELETE /api/v1/notifications/:id`

### 2. `client/src/pages/MessagesPage.tsx`
Replace localStorage with API:
- `loadConversations()` → `GET /api/v1/messages`
- Mark as read → `PATCH /api/v1/messages/report/:reportId/read`

### 3. `client/src/pages/OfficerMessagesPage.tsx`
Replace localStorage with API:
- `loadConversations()` → `GET /api/v1/messages` (filter by officer as sender)

### 4. `client/src/services/reportService.ts`
Remove localStorage operations from `reviewReport()` - backend will handle notification/message creation

## Current localStorage Keys (For Reference)
- `participium_all_notifications`: Array of all notifications
- `participium_pending_notifications`: Array of unprocessed notifications
- `participium_messages`: Array of all messages

## Future Enhancements (Post-MVP)
- **WebSockets**: For real-time notifications and bidirectional messaging
- **Citizen Reply Feature**: Allow citizens to reply to officer messages
- **Push Notifications**: Browser push notifications for new messages
- **Message Attachments**: Support for images/documents in messages
- **Notification Preferences**: Allow users to customize notification settings

## Testing Checklist
- [ ] Notification created when report is approved
- [ ] Notification created when report is rejected (includes reason)
- [ ] Message created when officer provides a message during review
- [ ] Notifications appear in bell dropdown
- [ ] Unread count badge updates correctly
- [ ] Mark as read/unread works
- [ ] Delete notification works
- [ ] Messages grouped by reportId in citizen inbox
- [ ] Officer can view all conversations
- [ ] No duplicate notifications on multiple logins
- [ ] Notifications persist across sessions

## Contact
For questions about the client-side implementation, refer to:
- `client/src/components/NotificationBell.tsx` - UI component
- `client/src/contexts/NotificationContext.tsx` - State management
- `client/src/pages/MessagesPage.tsx` - Citizen message inbox
- `client/src/pages/OfficerMessagesPage.tsx` - Officer conversation view
