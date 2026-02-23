import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ExternalMaintainersPage from './ExternalMaintainer';

const MaintainerDashboardPage: React.FC = () => {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Typography variant="h5" gutterBottom>Maintainer Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Here you can view all reports assigned to you as an external maintainer. You can update the status of each report and communicate with the technical office through the internal chat.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={0}>
        <ExternalMaintainersPage />
      </Paper>
    </Box>
  );
};

export default MaintainerDashboardPage;
