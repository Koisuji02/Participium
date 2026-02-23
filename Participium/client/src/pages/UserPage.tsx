import { Box, Container, Stack, TextField, Switch, IconButton, Badge } from "@mui/material";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import TelegramIcon from '@mui/icons-material/Telegram';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useEffect, useState } from "react";
import { getUserProfile, updateUserProfile, static_ip_address } from "../API/API";
import { EditUserForm } from "../components/EditUserForm";

export interface User {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    email?: string;
    avatar?: string;
    telegramUsername?: string;
    emailNotifications?: boolean;
}


export function UserPage() {

    const [edit, setEdit] = useState(false);
    const [user, setUser] = useState<User>({});
    const [telegramValue, setTelegramValue] = useState('');
    const [emailNotificationsValue, setEmailNotificationsValue] = useState(false);

    useEffect(() => {
        getUserProfile().then((data) => {
            setUser(data);
            setTelegramValue(data.telegramUsername || '');
            setEmailNotificationsValue(data.emailNotifications || false);
        });
    }, [edit]);

    const handleTelegramChange = async (newValue: string) => {
        setTelegramValue(newValue);
        try {
            await updateUserProfile({ telegram: newValue });
            setUser({...user, telegramUsername: newValue});
        } catch (error) {
            console.error('Failed to update telegram:', error);
        }
    };

    const handleEmailNotificationsToggle = async () => {
        const newValue = !emailNotificationsValue;
        setEmailNotificationsValue(newValue);
        try {
            await updateUserProfile({ emailNotifications: newValue });
            setUser({...user, emailNotifications: newValue});
        } catch (error) {
            console.error('Failed to update email notifications:', error);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                await updateUserProfile({ avatar: file });
                getUserProfile().then((data) => {
                    setUser(data);
                });
            } catch (error) {
                console.error('Failed to update avatar:', error);
            }
        }
    };

    const userData = {
        avatar: user.avatar == null ? '../assets/userImage.png' :  static_ip_address + user.avatar,
        name: user?.firstName,
        surname: user?.lastName,
        username: user?.username,
        email: user?.email,
        telegram: user?.telegramUsername,
        emailNotifications: user?.emailNotifications || false
    }

    return (
            <Container maxWidth="sm">
                <Box my={4}>
                    <Box 
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '16px 16px 0 0',
                            p: 4,
                            textAlign: 'center',
                            color: 'white',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 600 }}>Your Profile</h1>
                    </Box>
                    
                    <Box 
                        sx={{
                            bgcolor: 'white',
                            borderRadius: '0 0 16px 16px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            p: 3,
                            pt: 1,
                            pb: 3
                        }}
                    >
                        {edit ? (
                            <EditUserForm setShowEdit={setEdit} avatar={userData.avatar} telegram={userData.telegram} emailNotifications={userData.emailNotifications} />
                        ) : (
                            <Box>
                                <Box display="flex" justifyContent="center" mb={2.5} mt={-5}>
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        badgeContent={
                                            <IconButton
                                                component="label"
                                                sx={{
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    '&:hover': { bgcolor: 'primary.dark' },
                                                    width: 40,
                                                    height: 40,
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                <PhotoCameraIcon fontSize="small" />
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept="image/*"
                                                    onChange={handleAvatarChange}
                                                />
                                            </IconButton>
                                        }
                                    >
                                        <img 
                                            src={userData.avatar} 
                                            alt="User Avatar" 
                                            style={{ 
                                                borderRadius: '50%', 
                                                height: '120px', 
                                                width: '120px',
                                                border: '4px solid white',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                objectFit: 'cover'
                                            }} 
                                        />
                                    </Badge>
                                </Box>
                                
                                <Stack spacing={2}>
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <PersonIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Name:</Box>
                                        <Box sx={{ fontSize: '1rem' }}>{userData.name}</Box>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <PersonIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Surname:</Box>
                                        <Box sx={{ fontSize: '1rem' }}>{userData.surname}</Box>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <AccountCircleIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Username:</Box>
                                        <Box sx={{ fontSize: '1rem' }}>@{userData.username}</Box>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <EmailIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Email:</Box>
                                        <Box sx={{ fontSize: '1rem' }}>{userData.email}</Box>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <TelegramIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Telegram:</Box>
                                        <TextField
                                            value={telegramValue}
                                            onChange={(e) => setTelegramValue(e.target.value)}
                                            onBlur={(e) => handleTelegramChange(e.target.value)}
                                            size="small"
                                            placeholder="username"
                                            variant="standard"
                                            sx={{ flex: 1, maxWidth: 250 }}
                                            InputProps={{
                                                startAdornment: <span style={{ marginRight: '4px', color: '#667eea', fontWeight: 600 }}>@</span>
                                            }}
                                        />
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center">
                                        <Box sx={{ width: 30, display: 'flex', justifyContent: 'flex-start' }}>
                                            <NotificationsIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 110, color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' }}>Notifications:</Box>
                                        <Switch
                                            checked={emailNotificationsValue}
                                            onChange={handleEmailNotificationsToggle}
                                            color="primary"
                                            size="small"
                                        />
                                        <Box sx={{ color: 'text.secondary', fontSize: '0.9rem', ml: 1 }}>
                                            {emailNotificationsValue ? 'Enabled' : 'Disabled'}
                                        </Box>
                                    </Box>
                                </Stack>
                            </Box>
                        )}
                    </Box>
            </Box>
        </Container>
    );
}
