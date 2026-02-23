import React from 'react';
import { IconButton, Avatar, Menu, MenuItem, Typography, Box } from '@mui/material';
import { getPicture, getRole, getToken, getUserFromToken, logout } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { static_ip_address } from '../API/API';

const UserMenu: React.FC = () => {
  const token = getToken();
  const user = getUserFromToken(token);
  const displayName = user?.name || user?.username || 'User';

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const navigate = useNavigate();
  const role = getRole();


  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/');
  };

  const picture = getPicture();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography id="user-display-name" variant="body1" sx={{ mr: 1 }}>{displayName}</Typography>
      <IconButton onClick={handleOpen} size="small" sx={{ p: 0.5 }} aria-controls={open ? 'user-menu' : undefined} aria-haspopup="true">
        <Avatar sx={{ width: 32, height: 32 }}> {
          (picture != null && role?.includes('citizen')) ?
          <img src={static_ip_address + picture} alt="User Avatar" style={{ width: '100%', height: '100%' }} />
          : (displayName || 'U').charAt(0).toUpperCase()}</Avatar>
      </IconButton>

      <Menu id="user-menu" anchorEl={anchorEl} open={open} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {role?.includes('citizen') && <Box>
        <MenuItem onClick={() => navigate('/user')}>Account Settings</MenuItem>
        <MenuItem onClick={() => window.open('https://t.me/gsixtparticipiumbot', '_blank')}>Telegram Bot</MenuItem>
        </Box>
        }
        {/* Role-specific shortcuts */}
        {}
        {/* Citizen shortcut */}
        {
        /*!role && (
          <MenuItem onClick={() => { handleClose(); navigate('/submitReport'); }}>Write a report</MenuItem>
        )
          */}
       
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};

export default UserMenu;
