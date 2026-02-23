import { Box, Button, Stack, Typography, Alert, Badge, IconButton } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ChatIcon from '@mui/icons-material/Chat';
import { useState } from 'react';
import { approveReport, declineReport } from '../../API/API';

interface ReportActionsProps {
  readonly report: any;
  readonly onUpdate: () => void;
  readonly onOpenChat?: () => void;
}

export function ReportActions({ report, onUpdate, onOpenChat }: ReportActionsProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount] = useState(0);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this report?')) return;
    
    try {
      setProcessing(true);
      setError(null);
      await approveReport(report.id);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to approve report');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    const explanation = prompt('Please provide a reason for declining:');
    if (!explanation) return;
    
    try {
      setProcessing(true);
      setError(null);
      await declineReport(report.id, explanation);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to decline report');
    } finally {
      setProcessing(false);
    }
  };

  // Pending reports - waiting for public relations officer review
  if (report.reviewStatus === 'PENDING') {
    return (
      <Box>
        <Typography variant="subtitle2" mb={2} fontWeight={600}>Actions</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1}>
          <Button 
            variant="contained" 
            color="success" 
            fullWidth
            startIcon={<CheckIcon />}
            onClick={handleApprove}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Approve & Forward to Technical Office'}
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            fullWidth
            startIcon={<CloseIcon />}
            onClick={handleDecline}
            disabled={processing}
          >
            Decline Report
          </Button>
        </Stack>
      </Box>
    );
  }

  // If already assigned to maintainer, show chat button (any state except pending/declined)
  if (report.assignedMaintainerId) {
    return (
      <Box>
        <Typography variant="subtitle2" mb={2} fontWeight={600}>Communication</Typography>
        <Box display="flex" justifyContent="center">
          <IconButton 
            color="primary"
            onClick={onOpenChat}
            sx={{ 
              width: 64, 
              height: 64,
              bgcolor: 'primary.light',
              '&:hover': { bgcolor: 'primary.main', color: 'white' }
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <ChatIcon sx={{ fontSize: 32 }} />
            </Badge>
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
          Open internal chat with maintainer
        </Typography>
      </Box>
    );
  }

  // Approved reports - handled by technical office (not yet assigned)
  if (report.reviewStatus === 'APPROVED' || report.state === 'ASSIGNED') {
    return (
      <Box>
        <Typography variant="subtitle2" mb={2} fontWeight={600}>Actions</Typography>
        <Stack spacing={1}>
          <Button 
            variant="contained"
            fullWidth
            startIcon={<AssignmentIndIcon />}
            disabled
          >
            Assign to External Maintainer
          </Button>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            External maintainer assignment coming soon
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Declined reports
  if (report.reviewStatus === 'DECLINED') {
    return (
      <Alert severity="warning">
        This report was declined. {report.explanation && `Reason: ${report.explanation}`}
      </Alert>
    );
  }

  // Resolved or other statuses
  return (
    <Alert severity="info">
      Report status: {report.reviewStatus || report.status}
    </Alert>
  );
}
