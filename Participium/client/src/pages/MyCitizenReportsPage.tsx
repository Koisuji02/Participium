import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, Message } from '@mui/icons-material';
import { getMyCitizenReports } from '../services/reportService';
import type { OfficerReport } from '../services/reportService';
import { ReportDetailsSection } from '../components/report-details/ReportDetailsSection';
import { StatusFilter } from '../components/filters';
import type { ReportStatus, StatusOption } from '../components/filters';
import { formatStatus, formatString } from '../utils/StringUtils';

// Status options for citizens viewing their own reports
const CITIZEN_STATUSES: StatusOption[] = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending', color: '#f59e0b' },
  { value: 'APPROVED', label: 'Approved', color: '#10b981' },
  { value: 'DECLINED', label: 'Declined', color: '#ef4444' },
  { value: 'ASSIGNED', label: 'Assigned', color: '#3b82f6' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#8b5cf6' },
  { value: 'SUSPENDED', label: 'Suspended', color: '#f59e0b' },
  { value: 'RESOLVED', label: 'Resolved', color: '#10b981' },
];

export default function MyCitizenReportsPage() {
  const [reports, setReports] = useState<OfficerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<OfficerReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyCitizenReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your reports');
      console.error('Error fetching citizen reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: OfficerReport) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const handleChat = (reportId: number) => {
    navigate(`/reports/${reportId}/details?chatType=public`);
  };

  const getStateColor = (state?: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (state) {
      case 'RESOLVED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'SUSPENDED':
        return 'warning';
      case 'ASSIGNED':
        return 'primary';
      case 'PENDING':
        return 'default';
      case 'DECLINED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCategoryColor = (category?: string): string => {
    const colors: Record<string, string> = {
      infrastructure: '#FF6B6B',
      environment: '#4ECDC4',
      safety: '#45B7D1',
      sanitation: '#96CEB4',
      transport: '#FFEAA7',
      other: '#DDA15E'
    };
    return colors[category?.toLowerCase() || 'other'] || '#DDA15E';
  };

  // Filter reports based on selected status
  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') {
      return reports;
    }
    return reports.filter(report => report.state === statusFilter);
  }, [reports, statusFilter]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: 2
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading your reports...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchReports}
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Container>
    );
  }

  if (reports.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
            No reports yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            You haven't submitted any reports yet. Submit your first report to help improve your city!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/map')}
          >
            Submit a Report
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
            My Reports
          </Typography>
          <Typography color="text.secondary">
            View and manage all your submitted reports
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => navigate('/submitReport')}
          sx={{
            px: 3,
            py: 1.2,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: '0 6px 18px rgba(255,107,53,0.3)',
            background: 'linear-gradient(90deg,#ff6b35,#ff3d00)'
          }}
        >
          Submit New Report
        </Button>
      </Box>

      {/* Status Filter Tabs */}
      <Box sx={{ mb: 3 }}>
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          statuses={CITIZEN_STATUSES}
          variant="tabs"
        />
      </Box>

      {/* Reports Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table sx={{ minWidth: 750 }}>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No reports found for this status
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
              <TableRow key={report.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                <TableCell sx={{ fontWeight: 500 }}>#{report.id}</TableCell>
                <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {report.title}
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatString(report.category) || 'Other'}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(report.category),
                      color: '#fff',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatStatus(report.state) || 'PENDING'}
                    color={getStateColor(report.state)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(report)}
                      color="primary"
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send Message">
                    <IconButton
                      size="small"
                      onClick={() => handleChat(report.id)}
                      color="secondary"
                    >
                      <Message fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Report Details #{selectedReport?.id}</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          {selectedReport && (
            <ReportDetailsSection 
              report={selectedReport}
              onUpdate={fetchReports}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {selectedReport && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setDetailDialogOpen(false);
                handleChat(selectedReport.id);
              }}
            >
              Send Message
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
