export interface Notification {
  id?: number;
  userId?: number;
  reportId?: number;
  type?: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
}

export function NotificationFromJSON(obj: any): Notification {
  return {
    id: obj.id,
    userId: obj.userId,
    reportId: obj.reportId,
    type: obj.type,
    message: obj.message,
    createdAt: obj.createdAt,
    read: obj.read
  };
}

export function NotificationToJSON(n: Notification): any {
  return { ...n };
}
