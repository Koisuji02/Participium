import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Select, Stack, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import type { OfficerReport } from '../services/reportService';
import { getOfficersByOffice, assignOfficer } from "../API/API";
import { formatString } from '../utils/StringUtils';

interface Props {
    open: boolean;
    report: OfficerReport | null;
    office: string;
    onClose: () => void;
    successfulAssign: (reportId: number) => void;
    failedAssign: (reportId: number) => void;
}

interface Officer {
    id: string;
    name: string;
    surname: string;
}

const AssignOfficerDialog: React.FC<Props> = ({ open, report, onClose, office, successfulAssign, failedAssign }) => {

    const [officers, setOfficers] = useState<Officer[]>([]);

    useEffect(() => {
        const fetchOfficers = async () => {
            const result = await getOfficersByOffice(office);
            setOfficers(result);
        };
        fetchOfficers();
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const officerId = formData.get('officer');

        try {
            // first try officer login
            await assignOfficer(report!.id, officerId);
            successfulAssign(report!.id);
            onClose();
        } catch (e) {
            console.error('Failed to assign officer:', e);
            failedAssign(report!.id);
            onClose();
        }
    }
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Choose the officer to assign the report to {report?.title}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <Stack spacing={2}>
                            <Box>
                                {officers.length > 0 &&
                                    `Available Officers for ${formatString(office)} office:`}
                            </Box>
                            <FormControl fullWidth>
                                <Grid size={12}>
                                    {officers.length === 0 && <Box>No officers available for this office.</Box>}
                                    {officers.length > 0 &&
                                        <>
                                            <InputLabel id="officer-select-label">Select an officer</InputLabel>
                                            <Select id="officer" name="officer" label="Select an officer" variant="outlined" fullWidth defaultValue={''} required> {
                                                officers.map((officer) => (<MenuItem key={officer.id} value={officer.id}>{officer.name} {officer.surname}</MenuItem>
                                                ))
                                            }
                                            </Select>
                                        </>
                                    }
                                </Grid>
                            </FormControl>
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions>
                    {officers.length > 0 && <Button variant="contained" type="submit">Assign</Button>}
                    <Button variant="outlined" onClick={onClose}>Close</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AssignOfficerDialog;