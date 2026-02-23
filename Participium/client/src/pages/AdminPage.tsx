import { Box, Button, Container, Stack } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AdminForm } from "../components/AdminForm";
import EditOfficersForm from "../components/EditOfficersForm";

export function AdminScreen() {

    const [showForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const navigate = useNavigate();

    return (
        <>
            {!showForm && !showEditForm && (
            <Container id="login-screen">
                <Box my={4} mx={4}>
                    <Stack spacing={5}>
                        <h1 id="login-title">Admin Dashboard</h1>
                        <Stack spacing={2}>
                            <Button variant="contained" onClick={() => setShowForm(true)}>Register new officer</Button>
                            <Button variant="outlined" onClick={() => setShowEditForm(true)}>Update officer accounts</Button>
                            <Button variant="outlined" color="primary" onClick={() => navigate('/faq-management')}>
                                Manage FAQs
                            </Button>
                        </Stack>
                        {/* reverted to original simple login screen (no mock buttons) */}
                    </Stack>
                </Box>
            </Container>
            )}
            {showForm && (<AdminForm setShowForm={setShowForm} />)}
            {showEditForm && (<EditOfficersForm setShowForm={setShowEditForm}/>)}
        </>
    );
}
