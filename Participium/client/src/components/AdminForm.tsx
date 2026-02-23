import { Alert, Button, Container, FormControl, Grid, InputLabel, MenuItem, Select, Snackbar, TextField } from "@mui/material";
import './Forms.css';
import { useActionState, useEffect, useState } from "react";
import { getAvailableOfficerTypes, maintainerRegister, officerRegister } from "../API/API";
import { formatString } from "../utils/StringUtils.ts";

interface AdminFormProps {
    readonly setShowForm: (show: boolean) => void;
}

type RegisterState =
    | { success: boolean }
    | { error: string };

export function AdminForm({ setShowForm }: AdminFormProps) {
    const [officeTypes, setOfficeTypes] = useState<string[]>([]);
    const [officerTypes, setOfficerTypes] = useState<string[]>([]);
    const [role, setRole] = useState("");
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');

    useEffect(() => {
        const fetchOfficerTypes = async () => {
            try {
                const types = await getAvailableOfficerTypes();
                setOfficeTypes(types.officeTypes || []);
                setOfficerTypes(types.officerRoles || []);
            } catch (error) {
                console.error("Error fetching officer types:", error);
            }
        };
        fetchOfficerTypes();
    }, []);

    const [, formAction] = useActionState(register, { success: false, error: '' } as RegisterState);

    async function register(prevData: RegisterState, formData: FormData) {
        const role = formData.get("role") as string;
        const validateMatch = (a: string | FormDataEntryValue | null, b: string | FormDataEntryValue | null, message: string) => {
            if (a !== b) {
                setSnackMessage(message);
                setSnackSeverity("error");
                setSnackOpen(true);
                return { error: message };
            }
            return null;
        };

        const createMaintainer = () => ({
            name: formData.get("username") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            categories: [formData.get("office") as string],
            active: true,
        });

        const createOfficer = () => {
            const officer = {
                name: formData.get("name") as string,
                surname: formData.get("surname") as string,
                username: formData.get("username") as string,
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                roles: [
                    {
                        office: formData.get("office") as string,
                        role: formData.get("role") as string,
                    },
                ],
            };
            const officerRole = officer.roles[0].role;
            if (
                officerRole === "municipal_public_relations_officer" ||
                officerRole === "municipal_administrator"
            ) {
                officer.roles[0].office = "organization";
            }
            else if (officer.roles[0].office === "organization") {
                officer.roles[0].office = "other";
            }
            return officer;
        };

        // --- Validations ---
        const emailCheck = validateMatch(
            formData.get("email"),
            formData.get("cemail"),
            "Emails do not match"
        );
        if (emailCheck) return emailCheck;

        const passwordCheck = validateMatch(
            formData.get("password"),
            formData.get("confirm-password"),
            "Passwords do not match"
        );
        if (passwordCheck) return passwordCheck;

        try {
            if (role === "external_maintainer") {
                await maintainerRegister(createMaintainer());
            } else {
                await officerRegister(createOfficer());
            }
            setSnackMessage("Officer registered successfully");
            setSnackSeverity("success");
            setSnackOpen(true);
            return { success: true };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            if (message.includes("409")) {
                const msg = "Username or email already in use";
                setSnackMessage(msg);
                setSnackSeverity("error");
                setSnackOpen(true);
                return { error: msg };
            }
            if (message.includes("400")) {
                const msg = "Invalid email. Please use a valid email address.";
                setSnackMessage(msg);
                setSnackSeverity("error");
                setSnackOpen(true);
                return { error: msg };
            }
            setSnackMessage("Registration failed");
            setSnackSeverity("error");
            setSnackOpen(true);
            return { error: message };
        }
    }

    return (
        <Container id="admin-form">
            <form action={formAction}>
                <Grid container spacing={2} maxWidth="sm">
                    <Grid size={6}>
                        <TextField id="name" name="name" label="Name" variant="outlined" fullWidth required />
                    </Grid>
                    <Grid size={6}>
                        <TextField id="surname" name="surname" label="Surname" variant="outlined" fullWidth required />
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
                    <FormControl fullWidth>
                        <InputLabel id="role-select-label">Officer Role</InputLabel>
                        <Grid size={12}>
                            <Select id="role" name="role" label="Officer Role" variant="outlined" fullWidth defaultValue={''} required
                                onChange={(e) => setRole(e.target.value)}> {
                                    officerTypes.map((type) => (<MenuItem key={type} value={type}>{formatString(type)}</MenuItem>
                                    ))
                                }
                            </Select>
                        </Grid>
                    </FormControl>
                    {(role === 'technical_office_staff' || role === 'external_maintainer') && (
                        <FormControl fullWidth>
                            <InputLabel id="office-select-label">{role === 'technical_office_staff' ? 'Office' : 'Category'}</InputLabel>
                            <Grid size={12}>
                                <Select id="office" name="office" label={role === 'technical_office_staff' ? 'Office' : 'Category'} variant="outlined" fullWidth defaultValue={''} required> {
                                    officeTypes.filter((type) => type !== "organization").map((type) => (<MenuItem key={type} value={type}>{formatString(type)}</MenuItem>
                                    ))
                                }
                                </Select>
                            </Grid>
                        </FormControl>
                    )}
                    <Grid size={6}>
                        <Button variant="outlined" onClick={() => setShowForm(false)} fullWidth>Go Back</Button>
                    </Grid>
                    <Grid size={6}>
                        <Button variant="contained" fullWidth type="submit">Register</Button>
                    </Grid>
                </Grid>
            </form>
            <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}