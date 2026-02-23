import { Box, Button, Container, Stack } from "@mui/material";
import { useState } from "react";
import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";
import './LoginScreen.css';

export function LoginScreen() {

    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    return (
        <>
            {!showLogin && (!showRegister) && (
            <Container id="login-screen">
                <Box my={4} mx={4}>
                    <Stack spacing={5}>
                        <h1 id="login-title">Participium</h1>
                        <Stack spacing={2}>
                            <Button variant="contained" onClick={() => setShowLogin(true)}>Login</Button>
                            <Button variant="outlined" onClick={() => setShowRegister(true)}>Register</Button>
                        </Stack>
                        {/* reverted to original simple login screen (no mock buttons) */}
                    </Stack>
                </Box>
            </Container>
            )}
            {showLogin && (<LoginForm setShowLogin={setShowLogin} />)}
            {showRegister && (<RegisterForm setShowRegister={setShowRegister} />)}
        </>
    );
}
