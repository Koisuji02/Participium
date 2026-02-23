import { Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import type { ReactElement } from 'react';
import {
  CleaningServices,
  DirectionsBus,
  Category as CategoryIcon,
  WaterDrop,
  Lightbulb,
  CarCrash,
  ParkSharp,
  SportsSoccer
} from '@mui/icons-material';

interface CategoryData {
  category: string;
  count: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
}

const categoryConfig: Record<string, { label: string; icon: ReactElement; color: string }> = {
  water_supply: {
    label: 'Water Supply - Drinking Water',
    icon: <WaterDrop />,
    color: '#f57c00'
  },
  architectural_barriers: {
    label: 'Architectural Barriers',
    icon: <ParkSharp />,
    color: '#388e3c'
  },
  public_lighting: {
    label: 'Public Lighting',
    icon: <Lightbulb />,
    color: '#ef4444'
  },
  waste: {
    label: 'Waste',
    icon: <CleaningServices />,
    color: '#f59e0b'
  },
  road_signs_and_traffic_lights: {
    label: 'Road Signs and Traffic Lights',
    icon: <DirectionsBus />,
    color: '#3b82f6'
  },
  roads_and_urban_furnishings: {
    label: 'Roads and Urban Furnishings',
    icon: <CarCrash />,
    color: '#955c51ff'
  },
  public_green_areas_and_playgrounds: {
    label: 'Public Green Areas and Playgrounds',
    icon: <SportsSoccer />,
    color: '#af589bff'
  },
  other: {
    label: 'Other',
    icon: <CategoryIcon />,
    color: '#616161'
  }
};

export function CategoryBreakdown({ data }: Readonly<CategoryBreakdownProps>) {
  const totalReports = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Active reports by category</Typography>
          <Chip
            label={`${totalReports} total`}
            color="primary"
            size="small"
          />
        </Box>

        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No reports available
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {data
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const config = categoryConfig[item.category] || categoryConfig.other;
                const percentage = totalReports > 0 ? (item.count / totalReports) * 100 : 0;

                return (
                  <Box key={item.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: config.color, display: 'flex', alignItems: 'center' }}>
                          {config.icon}
                        </Box>
                        <Typography variant="body2" fontWeight="medium">
                          {config.label}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {percentage.toFixed(0)}%
                        </Typography>
                        <Chip
                          label={item.count}
                          size="small"
                          sx={{
                            bgcolor: `${config.color}20`,
                            color: config.color,
                            fontWeight: 'bold',
                            minWidth: '40px'
                          }}
                        />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: `${config.color}15`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: config.color,
                          borderRadius: 4,
                        }
                      }}
                    />
                  </Box>
                );
              })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
