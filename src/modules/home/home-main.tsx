import React from "react";
import { Box, Grid, Paper, Typography, Button, Card, CardContent, Divider, List, ListItem, ListItemText, Avatar, Stack } from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import StoreIcon from '@mui/icons-material/Store';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function HomeMain() {
  // 示例数据
  const stats = [
    { label: "今日过磅总数", value: 32, unit: "次", icon: <AssessmentIcon />, color: 'linear-gradient(135deg, #1976d2 30%, #64b5f6 100%)' },
    { label: "今日采购总量", value: 128.5, unit: "吨", icon: <ShoppingCartIcon />, color: 'linear-gradient(135deg, #43a047 30%, #a5d6a7 100%)' },
    { label: "今日销售总量", value: 98.2, unit: "吨", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #fbc02d 30%, #ffe082 100%)' },
    { label: "今日车辆数", value: 27, unit: "辆", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #8e24aa 30%, #ce93d8 100%)' },
    { label: "今日异常数", value: 1, unit: "条", icon: <WarningAmberIcon />, color: 'linear-gradient(135deg, #d32f2f 30%, #ef9a9a 100%)' },
    { label: "客户总数", value: 56, unit: "家", icon: <PeopleIcon />, color: 'linear-gradient(135deg, #0288d1 30%, #81d4fa 100%)' },
    { label: "供应商总数", value: 18, unit: "家", icon: <StoreIcon />, color: 'linear-gradient(135deg, #388e3c 30%, #a5d6a7 100%)' },
    { label: "累计采购总量", value: 10234, unit: "吨", icon: <ShoppingCartIcon />, color: 'linear-gradient(135deg, #1e88e5 30%, #90caf9 100%)' },
    { label: "累计销售总量", value: 9876, unit: "吨", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #fbc02d 30%, #ffe082 100%)' },
  ];
  const latestRecords = [
    { time: "09:12", plate: "鲁A12345", type: "采购", weight: "32.5吨" },
    { time: "09:05", plate: "鲁B67890", type: "销售", weight: "28.0吨" },
    { time: "08:55", plate: "鲁C54321", type: "采购", weight: "25.0吨" },
    { time: "08:40", plate: "鲁D11223", type: "采购", weight: "30.0吨" },
    { time: "08:30", plate: "鲁E44556", type: "销售", weight: "22.0吨" },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, background: '#f5f7fa', minHeight: '100%' }}>
      {/* 统计卡片 */}
      <Grid container spacing={2}>
        {stats.map((item, idx) => (
          <Grid item xs={12} sm={6} md={3} lg={2.4} key={item.label}>
            <Card sx={{
              background: item.color,
              color: '#fff',
              borderRadius: 3,
              boxShadow: 3,
              minHeight: 110,
              display: 'flex',
              alignItems: 'center',
              px: 2,
            }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', mr: 2, width: 48, height: 48 }}>
                {item.icon}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>{item.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>{item.value} <Typography component="span" variant="body2">{item.unit}</Typography></Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 快捷操作 */}
      <Stack direction="row" spacing={2} sx={{ mt: 4, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" sx={{ borderRadius: 3, boxShadow: 2, px: 4 }}>新增采购过磅</Button>
        <Button variant="contained" color="success" sx={{ borderRadius: 3, boxShadow: 2, px: 4 }}>新增销售过磅</Button>
        <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }}>历史记录</Button>
        <Button variant="outlined" sx={{ borderRadius: 3, px: 4 }}>系统设置</Button>
      </Stack>

      {/* 图表占位 */}
      <Box sx={{ mt: 5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ flex: 1, minWidth: 320, minHeight: 220, p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom>近7天过磅量趋势</Typography>
          <Box sx={{ height: 160, background: '#e3eafc', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#90caf9', fontSize: 20 }}>
            图表占位
          </Box>
        </Paper>
        <Paper sx={{ flex: 1, minWidth: 320, minHeight: 220, p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom>采购与销售对比</Typography>
          <Box sx={{ height: 160, background: '#fffde7', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffe082', fontSize: 20 }}>
            图表占位
          </Box>
        </Paper>
      </Box>

      {/* 最新动态/过磅记录 */}
      <Box sx={{ mt: 5 }}>
        <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom>最新过磅记录</Typography>
          <Divider sx={{ mb: 1 }} />
          <List>
            {latestRecords.map((rec, idx) => (
              <React.Fragment key={idx}>
                <ListItem sx={{ py: 1 }}>
                  <Avatar sx={{ bgcolor: rec.type === '采购' ? '#43a047' : '#fbc02d', mr: 2, width: 36, height: 36 }}>
                    {rec.type === '采购' ? <ShoppingCartIcon /> : <LocalShippingIcon />}
                  </Avatar>
                  <ListItemText
                    primary={<>
                      <Typography component="span" sx={{ fontWeight: 700 }}>{rec.plate}</Typography>
                      <Typography component="span" sx={{ mx: 1, color: rec.type === '采购' ? '#43a047' : '#fbc02d' }}>{rec.type}</Typography>
                      <Typography component="span">{rec.weight}</Typography>
                    </>}
                    secondary={rec.time}
                  />
                </ListItem>
                {idx < latestRecords.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
    </Box>
  );
} 