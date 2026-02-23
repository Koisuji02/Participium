import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Skeleton, Alert, Accordion, AccordionSummary, AccordionDetails, Typography, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import { getReportById } from '../API/API';
import { ReportDetailsSection } from '../components/report-details/ReportDetailsSection';
import { InternalChatSection } from '../components/report-details/InternalChatSection';
import { PublicChatSection } from '../components/report-details/PublicChatSection';
import { getRoleFromToken, getToken } from '../services/auth';

export function ReportDetailsPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!isMobile); // Collapsed on mobile by default

  // Determine which chat to show: 'internal' for officer-to-officer, 'public' (default) for citizen-officer
  const chatType = searchParams.get('chatType') || 'public';
  
  // Get current user role to determine access
  const token = getToken();
  const currentRole = getRoleFromToken(token);
  const isOfficer = currentRole && (
    currentRole.includes('technical_office_staff') ||
    currentRole.includes('public_relations_officer') ||
    currentRole.includes('municipal_administrator') ||
    currentRole.includes('maintainer') ||
    currentRole.includes('external_maintainer')
  );

  // Only officers can see internal chat
  const showInternalChat = chatType === 'internal' && isOfficer;

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getReportById(reportId);
      setReport(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 3, px: 2 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 120px)' }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rectangular" height="100%" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rectangular" height="100%" />
          </Box>
        </Box>
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 3, px: 2 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(-1)}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Reports
        </Button>
        <Alert severity="error">
          {error || 'Report not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Main content - full height */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0, flex: 1, overflow: 'hidden' }}>
        {/* Left: Report Details - collapsible on mobile */}
        {isMobile ? (
          <Accordion 
            expanded={expanded} 
            onChange={() => setExpanded(!expanded)}
            sx={{ 
              boxShadow: 'none',
              '&:before': { display: 'none' },
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Report #{reportId} - {report.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3, maxHeight: '50vh', overflowY: 'auto' }}>
              <ReportDetailsSection 
                report={report} 
                onUpdate={fetchReport}
              />
            </AccordionDetails>
          </Accordion>
        ) : (
          <Box sx={{ flex: '0 0 45%', borderRight: '1px solid', borderColor: 'divider', bgcolor: 'white', overflow: 'hidden' }}>
            <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
              <ReportDetailsSection 
                report={report} 
                onUpdate={fetchReport}
              />
            </Box>
          </Box>
        )}

        {/* Right: Chat Section - full height */}
        <Box sx={{ 
          flex: { xs: 1, md: '0 0 55%' }, 
          display: 'flex', 
          flexDirection: 'column', 
          bgcolor: 'white' 
        }}>
          {showInternalChat ? (
            <InternalChatSection reportId={Number.parseInt(reportId!)} />
          ) : (
            <PublicChatSection reportId={Number.parseInt(reportId!)} anonReport={report.anonymity} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
