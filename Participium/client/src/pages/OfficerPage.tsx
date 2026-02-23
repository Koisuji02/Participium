import React from 'react';
import OfficerReview from '../components/OfficerReview';
import { Box, Paper, Typography } from '@mui/material';

const OfficerPage: React.FC = () => {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Typography variant="h5" gutterBottom>Officer Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Here you can review pending reports, approve or reject them with a reason. Approved reports will be forwarded to the appropriate technical office.</Typography>
      </Paper>

      <Paper sx={{ p: 2 }} elevation={0}>
        <OfficerReview />
      </Paper>
    </Box>
  );
};

export default OfficerPage;
