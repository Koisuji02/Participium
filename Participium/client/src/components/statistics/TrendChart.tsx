import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useMemo } from 'react';

interface TrendData {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: TrendData[];
  color?: string;
}

export function TrendChart({ title, data, color = '#1976d2' }: Readonly<TrendChartProps>) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  const formatLabel = (label: string) => {
    const date = new Date(label);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return label;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">{title}</Typography>
          <Chip
            label={`${data.reduce((sum, d) => sum + d.value, 0)} total`}
            color="primary"
            size="small"
          />
        </Box>

        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No data available
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200 }}>
            {data.map((item, index) => (
              <Box
                key={item.label + index}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    mb: 0.5,
                    fontWeight: 'bold',
                    color: color,
                    minHeight: '20px'
                  }}
                >
                  {item.value > 0 ? item.value : ''}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: `${(item.value / maxValue) * 100}%`,
                    minHeight: item.value > 0 ? '4px' : '0px',
                    bgcolor: color,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                    '&:hover': {
                      opacity: 0.8,
                    }
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    fontSize: '0.65rem',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'top left',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    left: '10px'
                  }}
                >
                  {formatLabel(item.label)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
