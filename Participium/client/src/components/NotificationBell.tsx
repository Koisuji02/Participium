import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemText,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotification } from '../contexts/NotificationContext';

const NotificationBell: React.FC = () => {
  const { allNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 400,
              width: 360,
              mt: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography
              variant="caption"
              sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        <Divider />

        {allNotifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          allNotifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id)}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': {
                  backgroundColor: notification.read ? 'action.hover' : 'action.selected',
                },
                display: 'flex',
                alignItems: 'flex-start',
                whiteSpace: 'normal',
              }}
            >
              <Box sx={{ flex: 1, mr: 1 }}>
                <ListItemText
                  primary={notification.message}
                  secondary={formatTimestamp(notification.timestamp)}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      sx: {
                        fontWeight: notification.read ? 400 : 600,
                        color: notification.read ? 'text.secondary' : 'text.primary',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      },
                    },
                    secondary: {
                      variant: 'caption',
                      sx: { mt: 0.5 },
                    },
                  }}
                />
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleDelete(e, notification.id)}
                sx={{ ml: 1, mt: 0.5 }}
              >
                <Typography variant="caption" sx={{ fontSize: '18px' }}>×</Typography>
              </IconButton>
            </MenuItem>
          ))
        )}

        {allNotifications.length > 0 && [
          <Divider key="divider-bottom" />,
          <Box key="close-box" sx={{ py: 1, textAlign: 'center' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: 'pointer' }}
              onClick={handleClose}
            >
              Close
            </Typography>
          </Box>
        ]}
      </Menu>
    </>
  );
};

export default NotificationBell;
