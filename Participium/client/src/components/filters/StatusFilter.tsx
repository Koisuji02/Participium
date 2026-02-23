import React from 'react';
import { Tabs, Tab, Box, Chip } from '@mui/material';

export type ReportStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'ASSIGNED' 
  | 'DECLINED' 
  | 'IN_PROGRESS' 
  | 'SUSPENDED' 
  | 'RESOLVED'
  | 'AWAITING_MAINTAINER';

export interface StatusOption {
  value: ReportStatus | 'all';
  label: string;
  color?: string;
}

// Default status options for Public Relations Officer (review flow)
export const REVIEW_STATUSES: StatusOption[] = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending', color: '#f59e0b' },
];

// Default status options for Technical Officer (work flow)
export const TECHNICAL_STATUSES: StatusOption[] = [
  { value: 'all', label: 'All' },
  { value: 'AWAITING_MAINTAINER', label: 'Awaiting maintainer', color: '#f59e0b' },
  { value: 'ASSIGNED', label: 'Assigned', color: '#3b82f6' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#8b5cf6' },
  { value: 'SUSPENDED', label: 'Suspended', color: '#f59e0b' },
];

interface StatusFilterProps {
  /** Current selected status ('all' means no filter) */
  value: ReportStatus | 'all';
  /** Callback when status changes */
  onChange: (status: ReportStatus | 'all') => void;
  /** Status options to display (defaults to REVIEW_STATUSES) */
  statuses?: StatusOption[];
  /** Display variant: tabs or chips */
  variant?: 'tabs' | 'chips';
  /** Optional: size for chips variant */
  size?: 'small' | 'medium';
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  statuses = REVIEW_STATUSES,
  variant = 'tabs',
  size = 'medium',
}) => {
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    onChange(newValue as ReportStatus | 'all');
  };

  const handleChipClick = (status: ReportStatus | 'all') => {
    onChange(status);
  };

  if (variant === 'chips') {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {statuses.map(status => (
          <Chip
            key={status.value}
            label={status.label}
            onClick={() => handleChipClick(status.value)}
            sx={{
              backgroundColor: value === status.value && status.color ? status.color : 'transparent',
              color: value === status.value && status.color ? 'white' : 'text.primary',
              borderColor: status.color || 'primary.main',
              fontWeight: value === status.value ? 'bold' : 'normal',
              '&:hover': {
                backgroundColor: (() => {
                  if (value === status.value && status.color) {
                    return status.color;
                  } else if (status.color) {
                    return `${status.color}20`;
                  } else {
                    return 'action.hover';
                  }
                })(),
              }
            }}
            variant={value === status.value ? 'filled' : 'outlined'}
            size={size}
          />
        ))}
      </Box>
    );
  }

  // Tabs variant
  return (
    <Tabs
      value={value}
      onChange={handleTabChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 2,
      }}
    >
      {statuses.map(status => (
        <Tab
          key={status.value}
          label={status.label}
          value={status.value}
          sx={{
            textTransform: 'none',
            fontWeight: value === status.value ? 'bold' : 'normal',
          }}
        />
      ))}
    </Tabs>
  );
};

export default StatusFilter;
