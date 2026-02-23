import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import type { ReactElement } from 'react';
import {
  HourglassEmpty,
  Assignment,
  Block,
  Autorenew,
  Pause,
  CheckCircle
} from '@mui/icons-material';

interface StateData {
  state: string;
  count: number;
}

interface StateBreakdownProps {
  data: StateData[];
}

const stateConfig: Record<string, { label: string; icon: ReactElement; color: string }> = {
  PENDING: {
    label: 'Pending',
    icon: <HourglassEmpty />,
    color: '#ff9800'
  },
  ASSIGNED: {
    label: 'Assigned',
    icon: <Assignment />,
    color: '#2196f3'
  },
  DECLINED: {
    label: 'Declined',
    icon: <Block />,
    color: '#f44336'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: <Autorenew />,
    color: '#9c27b0'
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: <Pause />,
    color: '#607d8b'
  },
  RESOLVED: {
    label: 'Resolved',
    icon: <CheckCircle />,
    color: '#4caf50'
  }
};

export function StateBreakdown({ data }: Readonly<StateBreakdownProps>) {
  const totalReports = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Reports Status</Typography>
          <Chip
            label={`${totalReports} total`}
            color="primary"
            size="small"
          />
        </Box>

        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No data available
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2 }}>
            {data
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const config = stateConfig[item.state] || stateConfig.PENDING;
                const percentage = totalReports > 0 ? (item.count / totalReports) * 100 : 0;

                return (
                  <Box
                    key={item.state}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: `${config.color}10`,
                      border: `2px solid ${config.color}30`,
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: 2,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, color: config.color }}>
                      {config.icon}
                    </Box>
                    <Typography variant="h4" align="center" fontWeight="bold" color={config.color} sx={{ mb: 0.5 }}>
                      {item.count}
                    </Typography>
                    <Typography variant="caption" align="center" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                      {config.label}
                    </Typography>
                    <Typography variant="caption" align="center" display="block" fontWeight="bold" color={config.color}>
                      {percentage.toFixed(0)}%
                    </Typography>
                  </Box>
                );
              })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
