import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignedReports, reviewReport } from '../services/reportService';
import type { OfficerReport } from '../services/reportService';
import { Box, Button, Chip, DialogActions, DialogContentText, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Snackbar, Alert, Dialog, DialogContent, IconButton } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ReportDetailDialog from './ReportDetailDialog';
import AssignOfficerDialog from './AssignOfficerDialog';
import { CategoryFilter } from './filters';
import type { ReportCategory } from './filters';
import { formatString } from '../utils/StringUtils';

interface RejectState {
  open: boolean;
  reportId: number | null;
  reason: string;
}

// Category colors matching the map
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

const OfficerReview: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<OfficerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reject, setReject] = useState<RejectState>({ open: false, reportId: null, reason: '' });
  const [selected, setSelected] = useState<OfficerReport | null>(null);
  const [view, setView] = useState(false);
  // image/lightbox is handled in the shared ReportDetailDialog
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [showingAssign, setShowingAssign] = useState(false);
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all' | null>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const data = await getAssignedReports();
    setReports(data);
    setLoading(false);
  };

  const openAssign = (report: OfficerReport) => {
    setSelected(report);
    setShowingAssign(true);
  }

  const closeAssign = () => {
    setSelected(null);
    setShowingAssign(false);
  }

  const openView = (report: OfficerReport) => {
    setSelected(report);
    setView(true);
  }

  const closeView = () => {
    setSelected(null);
    setView(false);
  }

  const successfulAssign = async (id: number) => {
    setReports((r) => r.filter((x) => x.id !== id));
    setSnackMessage('Report ' + id + ' forwarded to technical office');
    setSnackSeverity('success');
    setSnackOpen(true);
  };

  const failedAssign = async (id: number) => {
    setSnackMessage('Failed to assign report ' + id);
    setSnackSeverity('error');
    setSnackOpen(true);
  };

  const openRejectDialog = (id: number) => setReject({ open: true, reportId: id, reason: '' });

  const handleConfirmReject = async () => {
    if (!reject.reportId) return;
    if ((reject.reason || '').trim().length < 30) {
      alert('The rejection reason must be at least 30 characters long.');
      return;
    }
    const ok = await reviewReport(reject.reportId, 'DECLINED', reject.reason.trim());
    if (ok) {
      setReports((r) => r.filter((x) => x.id !== reject.reportId));
      setSnackMessage('Report ' + reject.reportId + ' rejected');
      setSnackSeverity('success');
      setSnackOpen(true);
    } else {
      setSnackMessage('Failed to reject report ' + reject.reportId);
      setSnackSeverity('error');
      setSnackOpen(true);
    }
    setReject({ open: false, reportId: null, reason: '' });
  };


  // Filtered reports based on category only
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Category filter
      if (categoryFilter && categoryFilter !== 'all' && report.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [reports, categoryFilter]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Pending Reports for Review</Typography>
      {loading && <div>Loading...</div>}
      {!loading && reports.length === 0 && (
        <Typography>No pending reports assigned.</Typography>
      )}
      {!loading && reports.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <CategoryFilter
            value={categoryFilter}
            onChange={setCategoryFilter}
            variant="chips"
            size="small"
          />
        </Box>
      )}
      {!loading && filteredReports.length > 0 && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Reporter</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((r) => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ width: 60, fontWeight: 'bold' }}>{r.id}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{r.title}</Typography>
                    </TableCell>
                    <TableCell sx={{ width: 160 }}>
                      <Chip
                        label={formatString(r.category) || 'Unknown'}
                        size="small"
                        sx={{
                          backgroundColor: getCategoryColor(r.category),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 160 }}>
                      {(() => {
                          if (r.author) {
                            return `${r.author.firstName || ''} ${r.author.lastName || ''}`.trim();
                          } else {
                            return '—';
                          }
                        })()}
                    </TableCell>
                    <TableCell sx={{ width: 180 }}>{r.date ? new Date(r.date).toLocaleString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button variant="contained" color="primary" size="small" onClick={() => openView(r)} sx={{ mr: 1 }}>View</Button>
                      <IconButton
                        size="small"
                        color="primary"
                        sx={{ mr: 1 }}
                        onClick={() => navigate(`/reports/${r.id}/details?chatType=public`)}
                        title="Chat with citizen"
                      >
                        <ChatIcon />
                      </IconButton>
                      <Button variant="contained" color="success" size="small" onClick={() => openAssign(r)} sx={{ mr: 1 }}>Assign</Button>
                      <Button variant="outlined" color="error" size="small" onClick={() => openRejectDialog(r.id)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      {!loading && reports.length > 0 && filteredReports.length === 0 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary">No reports match the selected filters.</Typography>
        </Paper>
      )}
      <Dialog open={reject.open} onClose={() => setReject({ open: false, reportId: null, reason: '' })} fullWidth maxWidth="sm">
        <DialogTitle>Reject Report</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for rejecting this report (required, minimum 30 characters).
          </DialogContentText>
          <TextField
            autoFocus
            margin="normal"
            id="reason"
            label="Rejection Reason"
            type="text"
            fullWidth
            multiline
            minRows={4}
            value={reject.reason}
            onChange={(e) => setReject((s) => ({ ...s, reason: e.target.value }))}
            placeholder="Explain why this report is being rejected..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReject({ open: false, reportId: null, reason: '' })}>Cancel</Button>
          <Button color="error" onClick={handleConfirmReject}>Confirm Reject</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
          {snackMessage}
        </Alert>
      </Snackbar>
      {!loading && view && (
        <ReportDetailDialog open={selected !== null} report={selected} onClose={() => closeView()} />
      )}
      {!loading && showingAssign && (
        <AssignOfficerDialog open={showingAssign} successfulAssign={(id) => successfulAssign(id)} failedAssign={(id) => failedAssign(id)} onClose={() => closeAssign()} office={selected?.category || ''} report={selected} />
      )}
    </Box>
  );
};

export default OfficerReview;