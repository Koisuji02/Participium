import { Box, Button, Checkbox, Container, FormControlLabel, Stack, TextField } from "@mui/material";
import './Forms.css';
import { useState } from "react";
import {  updateUserProfile } from "../API/API";
import {  setPicture } from '../services/auth';
import UploadAvatar from "./UploadAvatar";

interface EditUserFormProps {
    readonly setShowEdit: (show: boolean) => void;
    readonly avatar: string | File;
    readonly telegram?: string;
    readonly emailNotifications: boolean;
}


interface UpdatedData {
    telegram?: string;
    emailNotifications?: boolean;
    avatar?: File;
}

export function EditUserForm({ setShowEdit, avatar, telegram, emailNotifications }: EditUserFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [userAvatar, setUserAvatar] = useState<string | File>(avatar);

    const previewURL =
        userAvatar instanceof File
            ? URL.createObjectURL(userAvatar)
            : userAvatar;

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const form = new FormData(e.currentTarget);

        const userDetails = new FormData();

        if (userAvatar instanceof File) {
            userDetails.append("avatar", userAvatar);
        }

        const updatedData: UpdatedData = {
            telegram: form.get("telegram") as string || "",
            emailNotifications: form.get("emailNotifications") === "on",
            avatar: userAvatar instanceof File ? userAvatar : undefined,
        };

        try {
            const response = await updateUserProfile(updatedData);
            setLoading(false);
            setPicture(response.avatar);
            if (response) {
                setShowEdit(false);
            }
        } catch {
            setLoading(false);
            setError("Failed to update profile");
        }
    }

    return (
        <form onSubmit={handleEdit}>
            <Stack spacing={2}>
                <Box mt={4}>
                    <Container>
                        <div className="avatar-wrapper" style={{ marginBottom: '1rem' }}>
                            <img src={previewURL} alt="User Avatar" />

                            <div className="avatar-overlay">Change avatar</div>

                            <UploadAvatar
                                onPhotoSelected={(file) => {
                                    if (file) setUserAvatar(file);
                                }}
                            />
                        </div>
                    </Container>

                    <Box mb={2}>
                        <TextField
                            label="Telegram"
                            name="telegram"
                            defaultValue={telegram}
                            fullWidth
                        />
                    </Box>

                    <Box mb={2}>
                        <FormControlLabel
                            control={<Checkbox defaultChecked={emailNotifications} />}
                            name="emailNotifications"
                            label="Email Notifications"
                        />
                    </Box>

                    <Button variant="contained" type="submit" disabled={loading} style={{margin: '0.5rem'}}>
                        {loading ? "Saving..." : "Save"}
                    </Button>

                    <Button variant="outlined" onClick={() => setShowEdit(false)} style={{margin: '0.5rem'}}>
                        Undo
                    </Button>

                    {error && <Box className="error">{error}</Box>}
                </Box>
            </Stack>
        </form>
    );
}