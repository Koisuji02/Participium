import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, ButtonGroup, Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, DialogActions, IconButton, Badge } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ReportDetailDialog from '../components/ReportDetailDialog';
import { assignReportToMaintainer, getMaintainersByCategory, getMyAssignedReports, updateReportStatus } from '../services/reportService';
import type { Maintainer, OfficerReport } from '../services/reportService';
import { CategoryFilter, StatusFilter, TECHNICAL_STATUSES } from '../components/filters';
import type { ReportCategory, ReportStatus } from '../components/filters';
import { formatStatus, formatString } from '../utils/StringUtils';

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

// Status type for better type safety
type ReportStatusType = 'ASSIGNED' | 'IN_PROGRESS' | 'SUSPENDED' | 'RESOLVED';

const TechnicalOfficerPage: React.FC = () => {
  const [reports, setReports] = useState<OfficerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<OfficerReport | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedReportForAssignment, setSelectedReportForAssignment] = useState<OfficerReport | null>(null);
  const [selectedMaintainerId, setSelectedMaintainerId] = useState<number | null>(null);
  const [maintainers, setMaintainers] = useState<Maintainer[]>([]);
  const [loadingMaintainers, setLoadingMaintainers] = useState(false);
  const [changingStatusIds, setChangingStatusIds] = useState<number[]>([]); // Track reports with active status changes
  const navigate = useNavigate();
  // Filter state
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all' | null>('all');

  useEffect(() => {
    fetchAssigned();
  }, []);

  const fetchAssigned = async () => {
    setLoading(true);
    const data = await getMyAssignedReports();
    // Filter out RESOLVED reports from the queue
    const activeReports = data.filter(report => report.state?.toUpperCase() !== 'RESOLVED');
    setReports(activeReports);
    setChangingStatusIds([]); // Reset changing status when fetching new data
    setLoading(false);
  };

  const handleStatusChange = async (reportId: number, newStatus: 'IN_PROGRESS' | 'SUSPENDED' | 'RESOLVED') => {
    // Add report ID to changing status list
    setChangingStatusIds(prev => [...prev, reportId]);

    const success = await updateReportStatus(reportId, newStatus);

    // Remove report ID from changing status list
    setChangingStatusIds(prev => prev.filter(id => id !== reportId));

    if (success) {
      fetchAssigned(); // Refresh the list
    }
  };

  const handleOpenAssignDialog = async (report: OfficerReport) => {
    setSelectedReportForAssignment(report);
    setSelectedMaintainerId(null);
    setAssignDialogOpen(true);

    // Fetch maintainers for this report's category
    if (report.category) {
      setLoadingMaintainers(true);
      const fetchedMaintainers = await getMaintainersByCategory(report.category);
      setMaintainers(fetchedMaintainers);
      setLoadingMaintainers(false);
    }
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedReportForAssignment(null);
    setSelectedMaintainerId(null);
    setMaintainers([]);
  };

  const handleAssignToMaintainer = async () => {
    if (!selectedReportForAssignment || !selectedMaintainerId) return;

    const success = await assignReportToMaintainer(selectedReportForAssignment.id, selectedMaintainerId);
    if (success) {
      handleCloseAssignDialog();
      // Small delay to ensure DB is updated
      setTimeout(() => {
        fetchAssigned(); // Refresh the list
      }, 300);
    } else {
      alert('Failed to assign report to maintainer');
    }
  };

  // Extract unique categories from officer's assigned reports (dynamic filtering)
  const availableCategories = useMemo(() => {
    const cats = new Set<ReportCategory>();
    reports.forEach(r => {
      if (r.category) {
        cats.add(r.category as ReportCategory);
      }
    });
    return Array.from(cats);
  }, [reports]);

  // Map status for display: if assigned but no maintainer -> show as "Awaiting maintainer"
  const withDisplayStatus = useMemo(() => {
    return reports.map(r => ({
      ...r,
      displayState: r.state === 'ASSIGNED' && !r.assignedMaintainerId ? 'AWAITING_MAINTAINER' : r.state
    }));
  }, [reports]);

  // Filtered reports based on status and category
  const filteredReports = useMemo(() => {
    return withDisplayStatus.filter(report => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'AWAITING_MAINTAINER') {
          if (!(report.state === 'ASSIGNED' && !report.assignedMaintainerId)) return false;
        } else if (statusFilter === 'ASSIGNED') {
          // Show in ASSIGNED tab only if already assigned to an external maintainer
          if (report.state !== 'ASSIGNED' || !report.assignedMaintainerId) return false;
        } else if (report.state !== statusFilter) {
          return false;
        }
      }
      // Category filter
      if (categoryFilter && categoryFilter !== 'all' && report.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [withDisplayStatus, statusFilter, categoryFilter]);

  // group filtered reports by category for a compact overview
  const grouped = filteredReports.reduce((acc: Record<string, OfficerReport[]>, r) => {
    const key = (r.category || 'other').toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, OfficerReport[]>);
  const categories = Object.keys(grouped);
  const singleCategory = categories.length === 1 ? categories[0] : null;

  const renderStatusChip = (state?: string, hasMaintainer?: boolean) => {
    const effective = state === 'ASSIGNED' && !hasMaintainer ? 'AWAITING_MAINTAINER' : state;
    const label = effective === 'AWAITING_MAINTAINER' ? 'AWAITING_MAINTAINER' : (effective || 'ASSIGNED');
    const color = (() => {
      switch (effective) {
        case 'AWAITING_MAINTAINER':
          return 'error';
        case 'RESOLVED':
          return 'success';
        case 'IN_PROGRESS':
          return 'primary';
        case 'SUSPENDED':
          return 'warning';
        default:
          return 'default';
      }
    })();
    return (
      <Chip
        label={formatStatus(label)}
        size="small"
        color={color as any}
      />
    );
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
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Typography variant="h5" gutterBottom>Technical Officer Workspace</Typography>
        <Typography variant="body2" color="text.secondary">This view shows reports that were assigned to you by the review process.</Typography>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={0}>
        {loading && <div>Loading...</div>}
        {!loading && reports.length === 0 && <Typography>No reports assigned to you.</Typography>}

        {!loading && reports.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <StatusFilter
                value={statusFilter}
                onChange={setStatusFilter}
                statuses={TECHNICAL_STATUSES}
                variant="tabs"
              />
            </Box>
            <CategoryFilter
              value={categoryFilter}
              onChange={setCategoryFilter}
              availableCategories={availableCategories}
              variant="chips"
              size="small"
            />
          </Box>
        )}

        {!loading && filteredReports.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {singleCategory ? (
              // single category: show one chip and a single table
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={formatString(singleCategory)} size="small" sx={{ backgroundColor: getCategoryColor(singleCategory), color: 'white', fontWeight: 'bold', textTransform: 'capitalize' }} />
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
                      {filteredReports.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ width: 60 }}>{r.id}</TableCell>
                          <TableCell>{r.title}</TableCell>
                          <TableCell>
                            {renderStatusChip(r.state, !!r.assignedMaintainerId)}
                          </TableCell>
                          <TableCell>{r.date ? new Date(r.date).toLocaleString() : '—'}</TableCell>
                          <TableCell align="right">

                            <Button variant="outlined" size="small" onClick={() => setSelected(r)} sx={{ mr: 1 }}>View</Button>

                            {/* Public Chat Button */}
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{ mr: 1 }}
                              onClick={() => navigate(`/reports/${r.id}/details?chatType=public`)}
                              title="Chat with citizen"
                            >
                              <ChatIcon />
                            </IconButton>

                            {r.assignedMaintainerId ? (
                              <>
                                {/* Internal Chat Button (only when maintainer assigned) */}
                                <IconButton
                                  size="small"
                                  color="warning"
                                  sx={{ mr: 1 }}
                                  onClick={() => navigate(`/reports/${r.id}/details?chatType=internal`)}
                                  title="Internal chat with maintainer"
                                >
                                  <Badge badgeContent={0} color="error">
                                    <ChatIcon />
                                  </Badge>
                                </IconButton>
                                <Typography variant="body2" color="text.secondary">Report assigned to external maintainer {r.assignedMaintainerId}</Typography>
                              </>
                            ) : (
                              <Button variant="outlined" size="small" color="secondary" onClick={() => handleOpenAssignDialog(r)} sx={{ mr: 1 }}>Assign to External Maintainer</Button>
                            )}

                            {!r.assignedMaintainerId && (
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
                            )}
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
                    <Chip label={formatString(cat)} size="small" sx={{ backgroundColor: getCategoryColor(cat), color: 'white', fontWeight: 'bold', textTransform: 'capitalize' }} />
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
                              {renderStatusChip(r.state, !!r.assignedMaintainerId)}
                            </TableCell>
                            <TableCell>{r.date ? new Date(r.date).toLocaleString() : '—'}</TableCell>
                            <TableCell align="right">
                              <Button variant="outlined" size="small" onClick={() => setSelected(r)} sx={{ mr: 1 }}>View</Button>

                              {/* Public Chat Button */}
                              <IconButton
                                size="small"
                                color="primary"
                                sx={{ mr: 1 }}
                                onClick={() => navigate(`/reports/${r.id}/details?chatType=public`)}
                                title="Chat with citizen"
                              >
                                <ChatIcon />
                              </IconButton>

                              {/* Internal Chat Button (only when maintainer assigned) */}
                              {r.assignedMaintainerId && (
                                <IconButton
                                  size="small"
                                  color="warning"
                                  sx={{ mr: 1 }}
                                  onClick={() => navigate(`/reports/${r.id}/details?chatType=internal`)}
                                  title="Internal chat with maintainer"
                                >
                                  <Badge badgeContent={0} color="error">
                                    <ChatIcon />
                                  </Badge>
                                </IconButton>
                              )}
                              {r.state === 'ASSIGNED' && !r.assignedMaintainerId && (
                                <Button variant="outlined" size="small" onClick={() => handleOpenAssignDialog(r)} sx={{ mr: 1 }}>Assign to External Maintainer</Button>
                              )}
                              {!r.assignedMaintainerId && (
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
                              )}
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

        {!loading && reports.length > 0 && filteredReports.length === 0 && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>No reports match the selected filters.</Typography>
        )}
      </Paper>

      <ReportDetailDialog open={selected !== null} report={selected} onClose={() => setSelected(null)} />

      <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign to External Maintainer
          {selectedReportForAssignment && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Report: {selectedReportForAssignment.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Available External Maintainers for {formatString(selectedReportForAssignment?.category || 'unknown')} category:
          </Typography>
          {(() => {
            if (loadingMaintainers) {
              return (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading maintainers...
                </Typography>
              );
            } else if (maintainers.length === 0) {
              return (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  No maintainers available for this category
                </Typography>
              );
            } else {
              return (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="maintainer-select-label">Select a maintainer</InputLabel>
                  <Select
                    labelId="maintainer-select-label"
                    value={selectedMaintainerId || ''}
                    label="Select a maintainer"
                    onChange={(e) => setSelectedMaintainerId(Number(e.target.value))}
                  >
                    {maintainers.map((maintainer) => (
                      <MenuItem key={maintainer.id} value={maintainer.id}>
                        {maintainer.name} ({maintainer.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignToMaintainer} variant="contained" disabled={!selectedMaintainerId || loadingMaintainers}>
            ASSIGN
          </Button>
          <Button onClick={handleCloseAssignDialog} variant="outlined">
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnicalOfficerPage;