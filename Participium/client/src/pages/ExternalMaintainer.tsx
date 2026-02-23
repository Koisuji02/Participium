import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Snackbar, Alert, ButtonGroup, IconButton, Badge } from '@mui/material';
import ReportDetailDialog from '../components/ReportDetailDialog';
import { getMaintainerAssignedReports, updateReportStatusByMaintainer } from '../services/reportService';
import type { OfficerReport } from '../services/reportService';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

// Category colors matching the map (kept small and consistent)
const CATEGORY_COLORS: Record<string, string> = {
    water_supply: '#8b5cf6',
    architectural_barriers: '#10b981',
    public_lighting: '#ef4444',
    waste: '#f59e0b',
    road_signs_and_traffic_lights: '#3b82f6',
    roads_and_urban_furnishings: '#955c51ff',
    public_green_areas_and_playgrounds: '#af589bff',
    other: '#6b7280',
};

const getCategoryColor = (category?: string): string => {
  return (category && CATEGORY_COLORS[category.toLowerCase()]) || '#6b7280';
};

const getStatusColor = (reportState?: string) => {
  switch (reportState) {
    case 'RESOLVED':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'SUSPENDED':
      return 'warning';
    default:
      return 'default';
  }
};

// Status type for better type safety
type ReportStatusType = 'ASSIGNED' | 'IN_PROGRESS' | 'SUSPENDED' | 'RESOLVED';

const ExternalMaintainersPage: React.FC = () => {
  const [reports, setReports] = useState<OfficerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<OfficerReport | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [changingStatusIds, setChangingStatusIds] = useState<number[]>([]); // Track reports with active status changes
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssigned();
  }, []);

  const fetchAssigned = async () => {
    setLoading(true);
    const data = await getMaintainerAssignedReports();
    // Filter out RESOLVED reports from the queue
    const activeReports = data.filter(report => report.state?.toUpperCase() !== 'RESOLVED');
    setReports(activeReports);
    setChangingStatusIds([]); // Reset changing status when fetching new data
    setLoading(false);
  };

  const handleStatusChange = async (reportId: number, newStatus: 'IN_PROGRESS' | 'SUSPENDED' | 'RESOLVED') => {
    // Add report ID to changing status list
    setChangingStatusIds(prev => [...prev, reportId]);
    
    const success = await updateReportStatusByMaintainer(reportId, newStatus);
    
    // Remove report ID from changing status list
    setChangingStatusIds(prev => prev.filter(id => id !== reportId));
    
    if (success) {
      setSnackMessage(`Report status updated to ${newStatus.replace('_', ' ')}`);
      setSnackSeverity('success');
      setSnackOpen(true);
      fetchAssigned(); // Refresh the list
    } else {
      setSnackMessage('Failed to update report status');
      setSnackSeverity('error');
      setSnackOpen(true);
    }
  };

  // Helper function to check if a status button should be disabled
  const isStatusButtonDisabled = (report: OfficerReport, targetStatus: ReportStatusType) => {
    // If status is already changing for this report, disable all buttons
    if (changingStatusIds.includes(report.id)) {
      return true;
    }
    
    // If the button is for the current status, disable it
    if (report.state === targetStatus) {
      return true;
    }
    
    return false;
  };

  // group reports by category for a compact overview
  const grouped = reports.reduce((acc: Record<string, OfficerReport[]>, r) => {
    const key = (r.category || 'other').toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, OfficerReport[]>);
  const categories = Object.keys(grouped);
  const singleCategory = categories.length === 1 ? categories[0] : null;

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Typography variant="h5" gutterBottom>External Maintainer Workspace</Typography>
        <Typography variant="body2" color="text.secondary">This view shows reports that were assigned to you as an external maintainer.</Typography>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={0}>
        {loading && <div>Loading...</div>}
        {!loading && reports.length === 0 && <Typography>No reports assigned to you.</Typography>}

        {!loading && reports.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {singleCategory ? (
              // single category: show one chip and a single table
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={singleCategory} size="small" sx={{ backgroundColor: getCategoryColor(singleCategory), color: 'white', fontWeight: 'bold', textTransform: 'capitalize' }} />
                  <Typography variant="body2" color="text.secondary">{reports.length} report{reports.length > 1 ? 's' : ''}</Typography>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ width: 60 }}>{r.id}</TableCell>
                          <TableCell>{r.title}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.state || 'ASSIGNED'}
                              size="small"
                              color={getStatusColor(r.state)}
                            />
                          </TableCell>
                          <TableCell>{r.date ? new Date(r.date).toLocaleString() : '—'}</TableCell>
                          <TableCell align="right">
                            <Button variant="outlined" size="small" onClick={() => setSelected(r)} sx={{ mr: 1 }}>View</Button>
                            
                            {/* Internal Chat Button - communicate with technical officer */}
                            <IconButton 
                              size="small" 
                              color="warning" 
                              sx={{ mr: 1 }} 
                              onClick={() => navigate(`/reports/${r.id}/details?chatType=internal`)}
                              title="Chat with technical officer"
                            >
                              <Badge badgeContent={0} color="error">
                                <ChatIcon />
                              </Badge>
                            </IconButton>

                            <ButtonGroup size="small" variant="contained">
                              <Button 
                                color="primary" 
                                onClick={() => handleStatusChange(r.id, 'IN_PROGRESS')}
                                disabled={isStatusButtonDisabled(r, 'IN_PROGRESS')}
                              >
                                In Progress
                              </Button>
                              <Button 
                                color="warning" 
                                onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
                                disabled={isStatusButtonDisabled(r, 'SUSPENDED')}
                              >
                                Suspend
                              </Button>
                              <Button 
                                color="success" 
                                onClick={() => handleStatusChange(r.id, 'RESOLVED')}
                                disabled={isStatusButtonDisabled(r, 'RESOLVED')}
                              >
                                Resolve
                              </Button>
                            </ButtonGroup>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              // multiple categories: keep grouped layout
              categories.map(cat => (
                <Box key={cat}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label={cat} size="small" sx={{ backgroundColor: getCategoryColor(cat), color: 'white', fontWeight: 'bold', textTransform: 'capitalize' }} />
                    <Typography variant="body2" color="text.secondary">{grouped[cat].length} report{grouped[cat].length > 1 ? 's' : ''}</Typography>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {grouped[cat].map(r => (
                          <TableRow key={r.id} hover>
                            <TableCell sx={{ width: 60 }}>{r.id}</TableCell>
                            <TableCell>{r.title}</TableCell>
                            <TableCell>
                              <Chip
                                label={r.state || 'ASSIGNED'}
                                size="small"
                                color={getStatusColor(r.state)}
                              />
                            </TableCell>
                            <TableCell>{r.date ? new Date(r.date).toLocaleString() : '—'}</TableCell>
                            <TableCell align="right">
                              <Button variant="outlined" size="small" onClick={() => setSelected(r)} sx={{ mr: 1 }}>View</Button>
                              
                              {/* Internal Chat Button - communicate with technical officer */}
                              <IconButton 
                                size="small" 
                                color="warning" 
                                sx={{ mr: 1 }} 
                                onClick={() => navigate(`/reports/${r.id}/details?chatType=internal`)}
                                title="Chat with technical officer"
                              >
                                <Badge badgeContent={0} color="error">
                                  <ChatIcon />
                                </Badge>
                              </IconButton>

                              <ButtonGroup size="small" variant="contained">
                                <Button 
                                  color="primary" 
                                  onClick={() => handleStatusChange(r.id, 'IN_PROGRESS')}
                                  disabled={isStatusButtonDisabled(r, 'IN_PROGRESS')}
                                >
                                  In Progress
                                </Button>
                                <Button 
                                  color="warning" 
                                  onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
                                  disabled={isStatusButtonDisabled(r, 'SUSPENDED')}
                                >
                                  Suspend
                                </Button>
                                <Button 
                                  color="success" 
                                  onClick={() => handleStatusChange(r.id, 'RESOLVED')}
                                  disabled={isStatusButtonDisabled(r, 'RESOLVED')}
                                >
                                  Resolve
                                </Button>
                              </ButtonGroup>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            )}
          </Box>
        )}
      </Paper>
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
          {snackMessage}
        </Alert>
      </Snackbar>

      <ReportDetailDialog open={selected !== null} report={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};

export default ExternalMaintainersPage;