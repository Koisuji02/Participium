import React, { useEffect, useState, useMemo } from 'react';
import { Box, Button, Chip, DialogActions, DialogContentText, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Snackbar, Alert, Dialog, DialogContent, Select, Stack, MenuItem, FormControl, InputLabel, Grid, Tabs, Tab } from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { CategoryFilter } from './filters';
import type { ReportCategory } from './filters';
import { getAllMaintainers, getAllOfficers, getAvailableOfficerTypes, updateOfficer, deleteOfficer, updateMaintainers, deleteMaintainer } from '../API/API';
import { formatString } from '../utils/StringUtils';
import { getOfficerIdFromToken, getToken, setRole, type Role } from '../services/auth';

const CATEGORY_COLORS: Record<string, string> = {
    water_supply: '#8b5cf6',
    architectural_barriers: '#10b981',
    public_lighting: '#ef4444',
    waste: '#f59e0b',
    road_signs_and_traffic_lights: '#3b82f6',
    roads_and_urban_furnishings: '#955c51ff',
    public_green_areas_and_playgrounds: '#af589bff',
    organization: '#79005dff',
    other: '#6b7280',
};

const getCategoryColor = (category?: string): string => {
    return (category && CATEGORY_COLORS[category.toLowerCase()]) || '#6b7280';
};

type Officer = {
    id: number;
    email: string;
    name: string;
    surname: string;
    password: string;
    roles:
    {
        office: string;
        role: string;
    }[];
}

type Maintainer = {
    id: number;
    name: string;
    email: string;
    password: string;
    categories:
    string[];
    active: boolean
}

interface EditOfficersFormProps {
    setShowForm: (show: boolean) => void;
}

interface EditMaintainerDialogProps {
    open: boolean;
    onClose: () => void;
    maintainer: Maintainer | null;
    allCategories: ReportCategory[];
    onSave: (maintainer: Maintainer) => Promise<void>;
    setShowForm: (show: boolean) => void;
}

const EditMaintainerDialog: React.FC<EditMaintainerDialogProps> = ({ open, onClose, maintainer, allCategories, onSave, setShowForm }) => {
    const [currentCategories, setCurrentCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState<string>('');

    useEffect(() => {
        if (maintainer) {
            setCurrentCategories(maintainer.categories);
        } else {
            setCurrentCategories([]);
        }
        setNewCategory(allCategories.length > 0 ? allCategories[0] : '');
    }, [maintainer, allCategories]);

    const handleRemoveCategory = (category: string) => {
        setCurrentCategories(prevCategories => prevCategories.filter(c => c !== category));
    };

    const handleAddCategory = () => {
        if (newCategory && !currentCategories.includes(newCategory)) {
            setCurrentCategories(prevCategories => [...prevCategories, newCategory]);
            setNewCategory(allCategories.length > 0 ? allCategories[0] : '');
        }
    };

    const handleSave = async () => {
        if (!maintainer) return;
        const updatedMaintainer = { ...maintainer, categories: currentCategories };
        await onSave(updatedMaintainer);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit Maintainer Categories</DialogTitle>
            <DialogContent>
                {maintainer && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Maintainer: {maintainer.name} ({maintainer.email})
                        </Typography>

                        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                            Assigned Categories
                        </Typography>
                        {currentCategories.length === 0 ? (
                            <Typography color="textSecondary">No categories assigned yet.</Typography>
                        ) : (
                            <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                                {currentCategories.map((category) => (
                                    <Paper key={category} elevation={1} sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: getCategoryColor(category), color: '#fff' }}>
                                        <Typography sx={{ fontWeight: 'bold' }}>
                                            {formatString(category)}
                                        </Typography>
                                        <IconButton
                                            edge="end"
                                            aria-label="remove"
                                            onClick={() => handleRemoveCategory(category)}
                                            size="small"
                                            color="inherit"
                                            sx={{ color: 'white' }}
                                        >
                                            <RemoveCircleOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ))}
                            </Box>
                        )}

                        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                            Assign New Category
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={10}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={newCategory}
                                        label="Category"
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        disabled={allCategories.length === 0}
                                    >
                                        {allCategories.filter(c => !currentCategories.includes(c) && c !== "organization").map(category => (
                                            <MenuItem key={category} value={category}>{formatString(category)}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <IconButton
                                    aria-label="add category"
                                    onClick={handleAddCategory}
                                    color="primary"
                                    disabled={!newCategory || currentCategories.includes(newCategory) || allCategories.length === 0}
                                >
                                    <AddCircleOutlineIcon fontSize="large" />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={!maintainer}>Save Changes</Button>
            </DialogActions>
        </Dialog>
    );
};


type ViewMode = 'officers' | 'maintainers';

const EditOfficersForm: React.FC<EditOfficersFormProps> = ({ setShowForm }) => {

    const ownId = getOfficerIdFromToken(getToken()) || '';

    const [viewMode, setViewMode] = useState<ViewMode>('officers');

    const [officers, setOfficers] = useState<Officer[]>([]);
    const [maintainers, setMaintainers] = useState<Maintainer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
    const [showingAssign, setShowingAssign] = useState(false);
    const [showingDeleteOfficer, setShowingDeleteOfficer] = useState(false);

    const [selectedMaintainer, setSelectedMaintainer] = useState<Maintainer | null>(null);
    const [showingEditMaintainer, setShowingEditMaintainer] = useState(false);
    const [showingDeleteMaintainer, setShowingDeleteMaintainer] = useState(false);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');

    const [officeTypes, setOfficeTypes] = useState<string[]>([]);
    const [officerRoles, setOfficerRoles] = useState<string[]>([]);

    const allCategories: ReportCategory[] = ['water_supply', 'architectural_barriers', 'public_lighting', 'waste', 'road_signs_and_traffic_lights', 'roads_and_urban_furnishings', 'public_green_areas_and_playgrounds', 'organization', 'other'];


    const [currentRoles, setCurrentRoles] = useState<Officer['roles']>([]);
    const [newOffice, setNewOffice] = useState('');
    const [newRole, setNewRole] = useState('');


    const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all' | null>('all');

    useEffect(() => {
        fetchData();

        const fetchOfficerTypes = async () => {
            try {
                const types = await getAvailableOfficerTypes();
                const fetchedOfficeTypes = (types.officeTypes || []).filter((office: string) => office !== 'organization');

                const fetchedOfficerRoles = (types.officerRoles || []).filter((role: string) => role !== 'external_maintainer');

                setOfficeTypes(fetchedOfficeTypes);
                setOfficerRoles(fetchedOfficerRoles);


                if (fetchedOfficeTypes.length > 0) {
                    setNewOffice(fetchedOfficeTypes[0]);
                }
                if (fetchedOfficerRoles.length > 0) {
                    setNewRole(fetchedOfficerRoles[0]);
                }

            } catch (error) {
                console.error("Error fetching officer types:", error);
            }
        };

        fetchOfficerTypes();
    }, []);


    useEffect(() => {
        if (selectedOfficer) {
            setCurrentRoles(selectedOfficer.roles);
        } else {
            setCurrentRoles([]);
        }

        setNewOffice(officeTypes[0] || '');
        setNewRole(officerRoles[0] || '');


    }, [selectedOfficer, selectedMaintainer, officeTypes, officerRoles]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const officersData = await getAllOfficers();
            setOfficers(officersData);
            const maintainersData = await getAllMaintainers();
            setMaintainers(maintainersData);
        } catch (error) {
            console.error("Error fetching data:", error);
            setSnackMessage('Failed to fetch officer or maintainer data.');
            setSnackSeverity('error');
            setSnackOpen(true);
        } finally {
            setLoading(false);
        }
    };


    const openEditOfficer = (officer: Officer) => {
        setSelectedOfficer(officer);
        setShowingAssign(true);
    }

    const closeEditOfficer = () => {
        setSelectedOfficer(null);
        setShowingAssign(false);
    }

    const openDeleteOfficer = (officer: Officer) => {
        setSelectedOfficer(officer);
        setShowingDeleteOfficer(true);
    }

    const closeDeleteOfficer = () => {
        setSelectedOfficer(null);
        setShowingDeleteOfficer(false);
    }

    const handleRemoveRole = (index: number) => {
        setCurrentRoles(prevRoles => prevRoles.filter((_, i) => i !== index));
    };

    const handleAddRole = () => {
        const roleToCheck = newRole === 'municipal_public_relations_officer' || newRole === 'municipal_administrator' ? 'organization' : newOffice;
        const isDuplicate = currentRoles.some(r => r.office === roleToCheck && r.role === newRole);

        if (newOffice && newRole && !isDuplicate) {
            setCurrentRoles(prevRoles => [...prevRoles, { office: roleToCheck, role: newRole }]);
            setNewOffice(officeTypes[0] || '');
            setNewRole(officerRoles[0] || '');
        } else if (isDuplicate) {
            setSnackMessage(`Role "${formatString(newRole)}" in "${formatString(roleToCheck)}" Office is already assigned.`);
            setSnackSeverity('info');
            setSnackOpen(true);
        }
    };

    const handleSaveRoles = async () => {
        if (!selectedOfficer) return;
        const updatedOfficer = { ...selectedOfficer, roles: currentRoles };
        try {
            await updateOfficer(updatedOfficer);
            fetchData();
            if (updatedOfficer.id === Number.parseInt(ownId)) {
                setRole([...new Set(updatedOfficer.roles.map(r => r.role))] as Role[]);
                location.reload();
            }
            setSnackMessage('Officer roles updated successfully!');
            setSnackSeverity('success');
            setSnackOpen(true);
            closeEditOfficer();
        } catch (error) {
            console.error("Failed to save roles:", error);
            setSnackMessage('Failed to update officer roles.');
            setSnackSeverity('error');
            setSnackOpen(true);
        }
    };

    const handleDeleteOfficer = async () => {
        if (!selectedOfficer) return;

        try {
            await deleteOfficer(selectedOfficer.id);
            await fetchData();

            setSnackMessage(`Officer ${selectedOfficer.name} ${selectedOfficer.surname} successfully deleted.`);
            setSnackSeverity('success');
            setSnackOpen(true);
            closeDeleteOfficer();
        } catch (error) {
            console.error("Failed to delete officer:", error);
            setSnackMessage('Failed to delete officer.');
            setSnackSeverity('error');
            setSnackOpen(true);
            closeDeleteOfficer();
        }
    };

    const openEditMaintainer = (maintainer: Maintainer) => {
        setSelectedMaintainer(maintainer);
        setShowingEditMaintainer(true);
    }

    const closeEditMaintainer = () => {
        setSelectedMaintainer(null);
        setShowingEditMaintainer(false);
    }

    const openDeleteMaintainer = (maintainer: Maintainer) => {
        setSelectedMaintainer(maintainer);
        setShowingDeleteMaintainer(true);
    }

    const closeDeleteMaintainer = () => {
        setSelectedMaintainer(null);
        setShowingDeleteMaintainer(false);
    }


    const handleSaveMaintainerCategories = async (updatedMaintainer: Maintainer) => {
        try {
            await updateMaintainers(updatedMaintainer, updatedMaintainer.id);
            fetchData();

            setSnackMessage('Maintainer categories updated successfully!');
            setSnackSeverity('success');
            setSnackOpen(true);
        } catch (error) {
            console.error("Failed to save maintainer categories:", error);
            setSnackMessage('Failed to update maintainer categories.');
            setSnackSeverity('error');
            setSnackOpen(true);
        }
    };

    const handleDeleteMaintainer = async () => {
        if (!selectedMaintainer) return;

        try {
            await deleteMaintainer(selectedMaintainer.id);
            await fetchData();

            setSnackMessage(`Maintainer ${selectedMaintainer.name} successfully deleted.`);
            setSnackSeverity('success');
            setSnackOpen(true);
            closeDeleteMaintainer();
        } catch (error) {
            console.error("Failed to delete maintainer:", error);
            setSnackMessage('Failed to delete maintainer.');
            setSnackSeverity('error');
            setSnackOpen(true);
            closeDeleteMaintainer();
        }
    };

    const availableFilterCategories = useMemo(() => {
        const officeCategories = new Set<string>();

        if (viewMode === 'maintainers') {
            maintainers.forEach(maintainer => {
                maintainer.categories.forEach(c => {
                    officeCategories.add(c);
                });
            });
        } else {
            officers.forEach(officer => {
                officer.roles.forEach(role => {
                    officeCategories.add(role.office);
                });
            });
        }

        return Array.from(officeCategories) as ReportCategory[];
    }, [officers, viewMode, allCategories]);


    const filteredOfficers = useMemo(() => {
        return officers.filter(officer => {
            if (categoryFilter && categoryFilter !== 'all') {
                return officer.roles.some(role => role.office === categoryFilter);
            }
            return true;
        });
    }, [officers, categoryFilter]);

    const filteredMaintainers = useMemo(() => {
        return maintainers.filter(maintainer => {
            if (categoryFilter && categoryFilter !== 'all') {
                return maintainer.categories.includes(categoryFilter);
            }
            return true;
        });
    }, [maintainers, categoryFilter]);

    return (
        <Box>

            <Dialog open={showingAssign} onClose={closeEditOfficer} fullWidth maxWidth="sm">
                <DialogTitle>Assign Officer Roles</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select the offices and roles for this officer.
                    </DialogContentText>
                    {selectedOfficer && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Officer: {selectedOfficer.name} {selectedOfficer.surname}
                            </Typography>

                            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                                Current Assignments
                            </Typography>
                            {currentRoles.length === 0 ? (
                                <Typography color="textSecondary">No roles assigned yet.</Typography>
                            ) : (
                                <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                                    {currentRoles.map((assignment) => {
                                        const uniqueKey = `${assignment.office || 'no-office'}-${assignment.role}`;
                                        return (
                                            <Paper key={uniqueKey} elevation={1} sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography>
                                                    {assignment.office != null && formatString(assignment.office) + " - "} {formatString(assignment.role)}
                                                </Typography>
                                                <IconButton
                                                    edge="end"
                                                    aria-label="remove"
                                                    onClick={() => handleRemoveRole(currentRoles.indexOf(assignment))}
                                                    size="small"
                                                    color="error"
                                                    disabled={selectedOfficer.id === Number.parseInt(ownId) && assignment.role.includes('administrator')}
                                                >
                                                    <RemoveCircleOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            )}

                            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                                Assign New Role
                            </Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Role</InputLabel>
                                        <Select
                                            value={newRole}
                                            label="Role"
                                            onChange={(e) => setNewRole(e.target.value)}
                                            disabled={officerRoles.length === 0}
                                        >
                                            {officerRoles.map(role => (
                                                <MenuItem key={role} value={role}>{formatString(role)}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {
                                    (newRole === 'technical_office_staff') && <Grid>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Office</InputLabel>
                                            <Select
                                                value={newOffice}
                                                label="Office"
                                                onChange={(e) => setNewOffice(e.target.value)}
                                                disabled={officeTypes.length === 0}
                                            >
                                                {officeTypes.map(office => (
                                                    <MenuItem key={office} value={office}>{formatString(office)}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                }
                                <Grid sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton
                                        aria-label="add role"
                                        onClick={handleAddRole}
                                        color="primary"
                                        disabled={!newOffice || !newRole || currentRoles.some(r => r.office === (newRole === 'municipal_public_relations_officer' || newRole === 'municipal_administrator' ? 'organization' : newOffice) && r.role === newRole) || officerRoles.length === 0}
                                    >
                                        <AddCircleOutlineIcon fontSize="large" />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditOfficer}>Cancel</Button>
                    <Button onClick={handleSaveRoles} variant="contained" color="primary" disabled={!selectedOfficer || currentRoles.length === 0}>Save Changes</Button>
                </DialogActions>
            </Dialog>

            <EditMaintainerDialog
                open={showingEditMaintainer}
                onClose={closeEditMaintainer}
                maintainer={selectedMaintainer}
                allCategories={allCategories}
                onSave={handleSaveMaintainerCategories}
            />

            <Dialog
                open={showingDeleteOfficer}
                onClose={closeDeleteOfficer}
                aria-labelledby="alert-dialog-title-officer"
                aria-describedby="alert-dialog-description-officer"
            >
                <DialogTitle id="alert-dialog-title-officer">{"Confirm Officer Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description-officer">
                        Are you sure you want to delete the officer **{selectedOfficer?.name} {selectedOfficer?.surname}**?
                        This action is irreversible.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteOfficer} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteOfficer} color="error" variant="contained" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={showingDeleteMaintainer}
                onClose={closeDeleteMaintainer}
                aria-labelledby="alert-dialog-title-maintainer"
                aria-describedby="alert-dialog-description-maintainer"
            >
                <DialogTitle id="alert-dialog-title-maintainer">{"Confirm Maintainer Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description-maintainer">
                        Are you sure you want to delete the external maintainer **{selectedMaintainer?.name}** ({selectedMaintainer?.email})?
                        This action is irreversible.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteMaintainer} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteMaintainer} color="error" variant="contained" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Stack direction="column" spacing={2} sx={{ mb: 3 }}>

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Button sx={{ marginTop: 2 }} variant="contained" color="primary" onClick={() => setShowForm(false)}>Go Back</Button>
                    <Tabs centered value={viewMode} onChange={(e, newValue: ViewMode) => { setViewMode(newValue); setCategoryFilter('all'); }} aria-label="user type tabs">
                        <Tab label="Officers" value="officers" />
                        <Tab label="External Maintainers" value="maintainers" />
                    </Tabs>
                </Box>

            </Stack>

            {loading && <div>Loading...</div>}

            {!loading && (viewMode === 'officers' ? officers.length > 0 : maintainers.length > 0) && (
                <Box sx={{ mb: 3, margin: 1 }}>
                    <CategoryFilter
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        variant="chips"
                        size="small"
                        availableCategories={availableFilterCategories}
                    />
                </Box>
            )}

            {viewMode === 'officers' && !loading && (
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Available Officers ({officers.length})</Typography>
                    {officers.length === 0 && (
                        <Typography>No officers created.</Typography>
                    )}

                    {filteredOfficers.length > 0 ? (
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <TableContainer>
                                <Table sx={{ minWidth: 650 }} size="medium">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Offices & Roles</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredOfficers.map((officer) => (
                                            <TableRow key={officer.email} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{officer.name} {officer.surname}</TableCell>
                                                <TableCell>{officer.email}</TableCell>
                                                <TableCell>
                                                    {officer.roles.map((r) => {
                                                        const roleLabel = r.office && r.role === 'technical_office_staff'
                                                            ? formatString(r.role) + ' in ' + formatString(r.office) + ' Office'
                                                            : formatString(r.role);
                                                        return (
                                                            <Chip
                                                                key={`${r.role}-${r.office || 'no-office'}`}
                                                                label={roleLabel}
                                                                size="small"
                                                                sx={{ mr: 1, mb: 0.5, backgroundColor: getCategoryColor(r.office), color: '#fff' }}
                                                            />
                                                        );
                                                    })}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button variant="contained" color="primary" size="small" sx={{ mr: 1 }} onClick={() => openEditOfficer(officer)}>Edit Roles</Button>
                                                    <Button variant="outlined" color="error" size="small" disabled={officer.id === Number.parseInt(ownId)} onClick={() => openDeleteOfficer(officer)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    ) : (
                        officers.length > 0 && <Typography color="textSecondary">No officers found matching the filter.</Typography>
                    )}
                </Box>
            )}

            {viewMode === 'maintainers' && !loading && (
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>External Maintainers ({maintainers.length})</Typography>
                    {maintainers.length === 0 && (
                        <Typography>No external maintainers created.</Typography>
                    )}

                    {filteredMaintainers.length > 0 ? (
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <TableContainer>
                                <Table sx={{ minWidth: 650 }} size="medium">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Assigned Categories</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredMaintainers.map((maintainer) => (
                                            <TableRow key={maintainer.email} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{maintainer.name}</TableCell>
                                                <TableCell>{maintainer.email}</TableCell>
                                                <TableCell>
                                                    {maintainer.categories.map((c) => (
                                                        <Chip
                                                            key={c}
                                                            label={formatString(c)}
                                                            size="small"
                                                            sx={{ mr: 1, mb: 0.5, backgroundColor: getCategoryColor(c), color: '#fff' }}
                                                        />
                                                    ))}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button variant="contained" color="primary" size="small" sx={{ mr: 1 }} onClick={() => openEditMaintainer(maintainer)}>Edit Categories</Button>
                                                    <Button variant="outlined" color="error" size="small" onClick={() => openDeleteMaintainer(maintainer)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    ) : (
                        maintainers.length > 0 && <Typography color="textSecondary">No maintainers found matching the filter.</Typography>
                    )}
                </Box>
            )}

            <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EditOfficersForm;