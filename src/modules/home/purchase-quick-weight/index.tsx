import React from 'react';
import { Paper, Typography } from '@mui/material';

const PurchaseQuickWeight: React.FC = () => {
  return (
    <Paper sx={{ p: 3 , height: "100%" }}>
      <Typography variant="h5" component="h2" gutterBottom>
        采购快捷过磅
      </Typography>
      <Typography variant="body1" color="text.secondary">
        欢迎使用采购快捷过磅系统
      </Typography>
    </Paper>
  );
};

export default PurchaseQuickWeight; 