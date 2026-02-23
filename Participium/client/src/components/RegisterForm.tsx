import { Alert, Button, Container, Grid, Snackbar, TextField } from "@mui/material";
import './Forms.css';
import { useNavigate, useLocation } from "react-router-dom";
import React, { useActionState, useState } from "react";
import { userLogin, userRegister, generateOtp, verifyOtp } from "../API/API";
import { clearPicture, setRole, setToken } from "../services/auth";

interface RegisterFormProps {
    readonly setShowRegister: (show: boolean) => void;
}

type RegisterState =
    | { success: boolean }
    | { error: string };


export function OtpForm({ username, email, password, setSnackMessage, setSnackSeverity, setSnackOpen, setOtp, fromPath }: Readonly<{ username: string, email: string, password: string, setSnackMessage: React.Dispatch<React.SetStateAction<string>>, setSnackSeverity: React.Dispatch<React.SetStateAction<'success' | 'error' | 'info'>>, setSnackOpen: React.Dispatch<React.SetStateAction<boolean>>, setOtp: React.Dispatch<React.SetStateAction<boolean>>, fromPath: string | null }>) {
    const navigate = useNavigate();
    async function register(_prevData: RegisterState, formData: FormData) {
        const otp = formData.get('otp') as string
        try {
            await verifyOtp(otp, email);

            const token = await userLogin({ username: username, password: password });
            setToken(token);
            clearPicture();
            setRole('citizen')
            globalThis.dispatchEvent(new Event('authChange'));
            // If a pending location exists, redirect to the submit report page so the selection is preserved
            const pending = localStorage.getItem('pendingReportLocation');
            if (pending) {
                navigate('/submitReport');
            } else if (fromPath) {
                navigate(fromPath);
            } else {
                navigate('/map');
            }
            return { success: true }
        }
        catch (error) {
            console.error('OTP verification error:', error);
            setSnackMessage('OTP authentication failed, please try again');
            setSnackSeverity('error');
            setSnackOpen(true);
            return { error: 'OTP authentication failed' };
        }
    }

    const [, formAction] = useActionState(register, { success: false, error: '' } as RegisterState);

    return <form action={formAction}>
        <Grid container spacing={2} maxWidth="sm">
            You've received an OTP code at the email address {email}.
            The code is valid for 30 minutes.
            Please enter it below to complete your registration.
            <Grid size={12}>
                <TextField id="otp" name="otp" label="OTP" variant="outlined" fullWidth required />
            </Grid>
            <Grid size={6}>
                <Button variant="outlined" onClick={() => setOtp(false)} fullWidth>Cancel</Button>
            </Grid>
            <Grid size={6}>
                <Button variant="contained" fullWidth type="submit">Confirm</Button>
            </Grid>
        </Grid>
    </form>
}

export function RegisterForm({ setShowRegister }: RegisterFormProps) {
    const location = useLocation();
    const fromPath = (location as any).state?.from?.pathname || null;

    const [, formAction, isPending] = useActionState(register, { success: false, error: '' } as RegisterState);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');
    const [otp, setOtp] = useState(false);
    const [user, setUser] = useState<{ username: string, email: string, password: string } | null>(null);

    async function register(_prevData: RegisterState, formData: FormData) {
        const user = {
            firstName: formData.get('name') as string,
            lastName: formData.get('surname') as string,
            username: formData.get('username') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string
        }
        setUser(user);

        if (formData.get('email') !== formData.get('cemail')) {
            setSnackMessage('Emails do not match');
            setSnackSeverity('error');
            setSnackOpen(true);
            return { error: 'Emails do not match' };
        }

        if (formData.get('password') !== formData.get('confirm-password')) {
            setSnackMessage('Passwords do not match');
            setSnackSeverity('error');
            setSnackOpen(true);
            return { error: 'Passwords do not match' };
        }

        try {
            await userRegister(user);
            await generateOtp(user.email);
            setOtp(true)
            return { success: true }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('409')) {
                try {
                    await generateOtp(user.email);
                } catch (e) {
                    if (e instanceof Error && e.message.includes('403')) {
                        setOtp(true);
                    } else {
                        setSnackMessage('Username or email already in use');
                        setSnackSeverity('error');
                        setSnackOpen(true);
                        return { error: 'Username or email already in use' };
                    }
                }
                return { success: true };
            }
            if (error instanceof Error && error.message.includes('400')) {
                setSnackMessage('Invalid email. Please use a valid email address.');
                setSnackSeverity('error');
                setSnackOpen(true);
                return { error: 'Invalid email. Please use a valid email address.' };
            }
            setSnackMessage('Registration failed, please try again');
            setSnackSeverity('error');
            setSnackOpen(true);
            return { error: 'Registration failed, please try again' };
        }
    }

    return (
        <Container id="login-form">
            {!otp &&
                <form action={formAction}>
                    <Grid container spacing={2} maxWidth="sm">
                        <Grid size={6}>
                            <TextField id="name" name="name" label="Name" variant="outlined" fullWidth required />
                        </Grid>
                        <Grid size={6}>
                            <TextField id="surname" name="surname" label="Surname" variant="outlined" fullWidth />
                        </Grid>
                        <Grid size={12}>
                            <TextField id="username" name="username" label="Username" variant="outlined" fullWidth required />
                        </Grid>
                        <Grid size={12}>
                            <TextField id="email" name="email" label="Email" variant="outlined" fullWidth required />
                        </Grid>
                        <Grid size={12}>
                            <TextField id="cemail" name="cemail" label="Confirm Email" variant="outlined" fullWidth required />
                        </Grid>
                        <Grid size={6}>
                            <TextField id="password" name="password" label="Password" variant="outlined" type="password" fullWidth required />
                        </Grid>
                        <Grid size={6}>
                            <TextField id="confirm-password" name="confirm-password" label="Confirm Password" variant="outlined" type="password" fullWidth required />
                        </Grid>
                        <Grid size={6}>
                            <Button variant="outlined" onClick={() => setShowRegister(false)} fullWidth>Go Back</Button>
                        </Grid>
                        <Grid size={6}>
                            <Button variant="contained" fullWidth type="submit" disabled={isPending}>Register</Button>
                        </Grid>
                    </Grid>
                </form>
            }
            {otp &&
                <OtpForm username={user?.username || ''} email={user?.email || ''} password={user?.password || ''} setOtp={setOtp} setSnackMessage={setSnackMessage} setSnackSeverity={setSnackSeverity} setSnackOpen={setSnackOpen} fromPath={fromPath} />
            }
            <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMessage}
                </Alert>
            </Snackbar>

        </Container>
    );
}
