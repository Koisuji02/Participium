import { Alert, Box, Button, Container, Snackbar, Stack, TextField } from "@mui/material";
import './Forms.css';
import { useState } from "react";
import { userLogin, officerLogin, maintainerLogin, getUserProfile, generateOtp } from "../API/API";
import { setToken, setRole, getRoleFromToken, setPicture } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { OtpForm } from "./RegisterForm";

interface LoginFormProps {
    readonly setShowLogin: (show: boolean) => void;
}

export function LoginForm({ setShowLogin }: LoginFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');
    const [otp, setOtp] = useState(false);
    const [username, setUsername] = useState('');
    const [fromPath] = useState('');
    const [password, setPassword] = useState('');

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const username = (formData.get('username') as string).trim();
        const password = formData.get('password') as string;
        const user = {
            username,
            email: username, // Use username as email for maintainer login compatibility
            password
        };

        try {
            // first try officer login
            const token = await officerLogin(user);
            setToken(token);
            // try to read role from token if available

            const detected = getRoleFromToken(token);
            setRole(detected ?? []);
            globalThis.dispatchEvent(new Event('authChange'));
            setLoading(false);

            // Redirect based on role
            if (detected.includes('municipal_administrator')) {
                navigate('/admin');
            } else if (detected.includes('municipal_public_relations_officer')) {
                navigate('/officer');
            } else if (detected.includes('technical_office_staff')) {
                navigate('/technical');
            } else {
                navigate('/technical'); // default fallback
            }
        } catch (e) {
            console.error('Officer login failed:', e);
            // if officer login failed, try maintainer login
            try {
                const token = await maintainerLogin(user);
                setToken(token);
                setRole(['external_maintainer']);
                globalThis.dispatchEvent(new Event('authChange'));
                setLoading(false);
                navigate('/maintainer');
            } catch (error_) {
                console.error('Maintainer login failed:', error_);
                // if maintainer login failed, try user login
                try {
                    const token = await userLogin(user);
                    setToken(token);
                    const details = await getUserProfile();
                    setPicture(details.avatar);
                    setRole(['citizen']);
                    globalThis.dispatchEvent(new Event('authChange'));
                    setLoading(false);
                    navigate('/map');
                } catch (err) {
                    if (err instanceof Error && err.message.includes('301')) {
                        try {
                            await generateOtp(username);
                            setOtp(true);
                            setLoading(false);
                            return;
                        } catch (otpError) {
                            if (otpError instanceof Error && otpError.message.includes('email')) {
                                setSnackMessage(otpError.message);
                                setSnackSeverity('error');
                                setSnackOpen(true);
                                setLoading(false);
                            }
                        }
                    } else {
                        setSnackMessage('Login failed. Please check your credentials.');
                        setSnackSeverity('error');
                        setSnackOpen(true);
                        setLoading(false);
                    }
                }
            }
        }
    }

    return (
        <Container id="login-form">
            {otp ? (
                <OtpForm username={username} email={username} password={password} setSnackMessage={setSnackMessage} setSnackSeverity={setSnackSeverity} setSnackOpen={setSnackOpen} setOtp={setOtp} fromPath={fromPath} />
            ) : (
                <>
                    <form onSubmit={handleLogin}>
                        <Stack spacing={2}>
                            <TextField fullWidth id="username" name="username" label="Username" variant="outlined" required onChange={(e) => setUsername(e.target.value)} />
                            <TextField fullWidth id="password" name="password" label="Password" variant="outlined" type="password" required onChange={(e) => setPassword(e.target.value)}/>

                            <Button variant="contained" type="submit" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Button>
                            <Button variant="outlined" onClick={() => setShowLogin(false)}>Go Back</Button>
                            {error && <Box className="error">{error}</Box>}
                        </Stack>
                    </form>
                    <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
                            {snackMessage}
                        </Alert>
                    </Snackbar>
                </>
            )}
        </Container>
    );
}
