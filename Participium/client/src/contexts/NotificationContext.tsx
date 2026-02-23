import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AlertColor } from '@mui/material';
import { getUserIdFromToken } from '../services/auth';
import { getNotifications, markNotificationAsRead, type Notification as BackendNotification } from '../API/API';

interface Notification {
  id: string;
  message: string;
  type: AlertColor;
  timestamp: number;
  read?: boolean;
  reportId?: number;
  backendId?: number;
}

interface NotificationContextType {
  addNotification: (message: string, type?: AlertColor) => void;
  allNotifications: Notification[];
  unreadCount: number;
  checkPendingNotifications: () => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const getNotificationType = (type: string): AlertColor => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'info';
      case 'OFFICER_MESSAGE':
        return 'warning';
      default:
        return 'info';
    }
  };

  const refreshNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backendNotifications = await getNotifications();
      
      const converted: Notification[] = backendNotifications.map((bn: BackendNotification) => ({
        id: `backend-${bn.id}`,
        backendId: bn.id,
        message: bn.message,
        type: getNotificationType(bn.type),
        timestamp: new Date(bn.createdAt).getTime(),
        read: bn.read,
        reportId: bn.reportId
      }));

      setAllNotifications(prev => {
        const localOnly = prev.filter(n => !n.backendId);
        return [...converted, ...localOnly].sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (error) {
      console.error('Error fetching notifications from backend:', error);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('participium_all_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAllNotifications(parsed);
      } catch (e) {
        console.error('Error parsing stored notifications:', e);
      }
    }
    
    checkPendingNotifications();

    refreshNotifications();

    const intervalId = setInterval(() => {
      refreshNotifications();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [refreshNotifications]);

  useEffect(() => {
    if (allNotifications.length > 0) {
      localStorage.setItem('participium_all_notifications', JSON.stringify(allNotifications));
    } else {
      localStorage.removeItem('participium_all_notifications');
    }
  }, [allNotifications]);

  const checkPendingNotifications = () => {
    const token = localStorage.getItem('token');
    const userId = getUserIdFromToken(token);
    
    if (!userId) return;
    
    const pendingStr = localStorage.getItem('participium_pending_notifications');
    if (!pendingStr) return;
    
    try {
      const pending = JSON.parse(pendingStr);
      const userNotifications = pending.filter((n: any) => n.userId === userId && !n.processed);
      
      if (userNotifications.length > 0) {
        const newNotifications = userNotifications.map((n: any) => ({
          id: n.id,
          message: n.message,
          type: n.type,
          timestamp: n.timestamp,
          read: false
        }));
        
        setAllNotifications(prev => [...newNotifications, ...prev]);
        
        const updated = pending.map((n: any) => 
          n.userId === userId && !n.processed ? { ...n, processed: true } : n
        );
        localStorage.setItem('participium_pending_notifications', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error checking pending notifications:', e);
    }
  };

  const addNotification = (message: string, type: AlertColor = 'success') => {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
      read: false,
    };
    setAllNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = (id: string) => {
    const notification = allNotifications.find(n => n.id === id);
    
    if (notification?.backendId) {
      markNotificationAsRead(notification.backendId).catch((error) => {
        console.error('Error marking notification as read on backend:', error);
      });
    }

    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const backendNotifications = allNotifications.filter(n => n.backendId && !n.read);
    Promise.all(
      backendNotifications.map(n => 
        n.backendId ? markNotificationAsRead(n.backendId).catch(e => console.error('Error marking as read:', e)) : Promise.resolve()
      )
    ).catch(() => {});

    setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const contextValue = React.useMemo(() => ({
    addNotification,
    allNotifications,
    unreadCount,
    checkPendingNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }), [
    addNotification,
    allNotifications,
    unreadCount,
    checkPendingNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
