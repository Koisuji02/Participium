import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Fade
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  Category,
  PieChart
} from '@mui/icons-material';
import { getPublicStatistics } from '../API/API';
import type { PublicStatistics } from '../API/API';
import { StatCard } from '../components/statistics/StatCard';
import { TrendChart } from '../components/statistics/TrendChart';
import { CategoryBreakdown } from '../components/statistics/CategoryBreakdown';
import { StateBreakdown } from '../components/statistics/StateBreakdown';

type TrendPeriod = 'daily' | 'weekly' | 'monthly';

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<PublicStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('daily');

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicStatistics();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const handleTrendPeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: TrendPeriod | null) => {
    if (newPeriod !== null) {
      setTrendPeriod(newPeriod);
    }
  };

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
          Loading statistics...
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
      </Container>
    );
  }

  if (!statistics) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No data available
        </Alert>
      </Container>
    );
  }

  const resolvedCount = statistics.byState.find(s => s.state === 'RESOLVED')?.count || 0;
  const pendingCount = statistics.byState.find(s => s.state === 'PENDING')?.count || 0;
  const inProgressCount = statistics.byState.find(s => s.state === 'IN_PROGRESS')?.count || 0;

  const getTrendData = () => {
    switch (trendPeriod) {
      case 'daily':
        return statistics.dailyTrend.map(d => ({ label: d.date, value: d.count }));
      case 'weekly':
        return statistics.weeklyTrend.map(d => ({ label: d.week, value: d.count }));
      case 'monthly':
        return statistics.monthlyTrend.map(d => ({ label: d.month, value: d.count }));
    }
  };

  const getTrendTitle = () => {
    switch (trendPeriod) {
      case 'daily':
        return 'Daily Trend (Last 30 days)';
      case 'weekly':
        return 'Weekly Trend (Last 12 weeks)';
      case 'monthly':
        return 'Monthly Trend (Last 12 months)';
    }
  };

  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', py: 5 }}>
      <Container maxWidth="xl">
        <Fade in timeout={800}>
          <Box>
            {/* Header */}
            <Box sx={{ mb: 5, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <Assessment sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h2" fontWeight="700" sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Public Statistics
                </Typography>
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
                Explore real-time data and trends of civic reports in your city
              </Typography>
            </Box>

            {/* Key Stats Cards */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 3,
              mb: 5
            }}>
              <StatCard
                title="Total Reports"
                value={statistics.totalReports}
                icon={<Assessment sx={{ fontSize: 32 }} />}
                color="#667eea"
                subtitle="All time submissions"
              />
              <StatCard
                title="Resolved"
                value={resolvedCount}
                icon={<PieChart sx={{ fontSize: 32 }} />}
                color="#4caf50"
                subtitle="Completed reports"
              />
              <StatCard
                title="In Progress"
                value={inProgressCount}
                icon={<TrendingUp sx={{ fontSize: 32 }} />}
                color="#9c27b0"
                subtitle="Currently active"
              />
              <StatCard
                title="Pending"
                value={pendingCount}
                icon={<Category sx={{ fontSize: 32 }} />}
                color="#ff9800"
                subtitle="Awaiting assignment"
              />
            </Box>

            {/* Trend Chart with Period Selector */}
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="600">
                  Reports Timeline
                </Typography>
                <ToggleButtonGroup
                  value={trendPeriod}
                  exclusive
                  onChange={handleTrendPeriodChange}
                  aria-label="trend period"
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 3,
                      textTransform: 'none',
                      fontWeight: 500
                    }
                  }}
                >
                  <ToggleButton value="daily" aria-label="daily">
                    Daily
                  </ToggleButton>
                  <ToggleButton value="weekly" aria-label="weekly">
                    Weekly
                  </ToggleButton>
                  <ToggleButton value="monthly" aria-label="monthly">
                    Monthly
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TrendChart
                title={getTrendTitle()}
                data={getTrendData()}
                color="#667eea"
              />
            </Box>

            {/* Category and State Breakdown */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
              gap: 3
            }}>
              <CategoryBreakdown data={statistics.byCategory} />
              <StateBreakdown data={statistics.byState} />
            </Box>

            {/* Footer Info */}
            <Box
              sx={{
                mt: 5,
                p: 3,
                borderRadius: 2,
                bgcolor: 'rgba(102, 126, 234, 0.05)',
                textAlign: 'center',
                border: '1px solid rgba(102, 126, 234, 0.1)'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Data is updated in real-time. All statistics are public and accessible to everyone.
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
