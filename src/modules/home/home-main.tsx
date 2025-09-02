import React, { useState, useEffect } from "react";
import { Box, Grid, Paper, Typography, Button, Card, CardContent, Divider, List, ListItem, ListItemText, Avatar, Stack, CircularProgress, Alert, Snackbar } from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import StoreIcon from '@mui/icons-material/Store';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

// 统计数据接口
interface HomeStatistics {
  todayCount: number;
  todayPurchase: number;
  todaySales: number;
  todayVehicles: number;
  todayAbnormal: number;
  customerCount: number;
  supplierCount: number;
  totalPurchase: number;
  totalSales: number;
  latestRecords: Array<{
    time: string;
    plate: string;
    type: string;
    weight: string;
  }>;
}

// 图表数据接口
interface ChartData {
  weeklyTrend: Array<{
    date: string;
    day: string;
    count: number;
    weight: number;
  }>;
  monthlyComparison: Array<{
    month: string;
    monthName: string;
    purchaseCount: number;
    purchaseWeight: number;
    salesCount: number;
    salesWeight: number;
  }>;
  supplierDistribution: Array<{
    name: string;
    count: number;
    weight: number;
  }>;
}

// 组件 Props 接口
interface HomeMainProps {
  onNavigate: (tabIndex: number) => void;
}

export default function HomeMain({ onNavigate }: HomeMainProps) {
  const [statistics, setStatistics] = useState<HomeStatistics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/home-statistics');
      
      if (response.data.code === 0) {
        setStatistics(response.data.data);
        setError("");
      } else {
        setError(response.data.msg || '获取统计数据失败');
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('获取首页统计数据失败:', err);
      setError('网络连接失败，请检查服务器状态');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 加载图表数据
  const loadChartData = async () => {
    try {
      setChartLoading(true);
      const response = await axios.get('http://localhost:3001/api/chart-data');
      
      if (response.data.code === 0) {
        setChartData(response.data.data);
      } else {
        console.error('获取图表数据失败:', response.data.msg);
      }
    } catch (err) {
      console.error('获取图表数据失败:', err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
    loadChartData();
    
    // 每30秒自动刷新数据
    const interval = setInterval(() => {
      loadStatistics();
      loadChartData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <Box sx={{ 
        p: { xs: 1, md: 3 }, 
        background: '#f5f7fa', 
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: '#666' }}>
            正在加载数据...
          </Typography>
        </Box>
      </Box>
    );
  }

  // 如果没有数据，使用默认值
  const stats = statistics ? [
    { label: "今日过磅总数", value: statistics.todayCount, unit: "次", icon: <AssessmentIcon />, color: 'linear-gradient(135deg, #1976d2 30%, #64b5f6 100%)' },
    { label: "今日采购总量", value: statistics.todayPurchase, unit: "吨", icon: <ShoppingCartIcon />, color: 'linear-gradient(135deg, #43a047 30%, #a5d6a7 100%)' },
    { label: "今日销售总量", value: statistics.todaySales, unit: "吨", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #fbc02d 30%, #ffe082 100%)' },
    { label: "今日车辆数", value: statistics.todayVehicles, unit: "辆", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #8e24aa 30%, #ce93d8 100%)' },
    { label: "今日异常数", value: statistics.todayAbnormal, unit: "条", icon: <WarningAmberIcon />, color: 'linear-gradient(135deg, #d32f2f 30%, #ef9a9a 100%)' },
    { label: "客户总数", value: statistics.customerCount, unit: "家", icon: <PeopleIcon />, color: 'linear-gradient(135deg, #0288d1 30%, #81d4fa 100%)' },
    { label: "供应商总数", value: statistics.supplierCount, unit: "家", icon: <StoreIcon />, color: 'linear-gradient(135deg, #388e3c 30%, #a5d6a7 100%)' },
    { label: "累计采购总量", value: statistics.totalPurchase, unit: "吨", icon: <ShoppingCartIcon />, color: 'linear-gradient(135deg, #1e88e5 30%, #90caf9 100%)' },
    { label: "累计销售总量", value: statistics.totalSales, unit: "吨", icon: <LocalShippingIcon />, color: 'linear-gradient(135deg, #fbc02d 30%, #ffe082 100%)' },
  ] : [];

  const latestRecords = statistics?.latestRecords || [];

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, background: '#f5f7fa', minHeight: '100%' }}>
      {/* 错误提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

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
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => onNavigate(1)}
          sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            px: 4, 
            py: 1.5,
            '&:hover': {
              boxShadow: 3,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          新增采购过磅
        </Button>
        <Button 
          variant="contained" 
          color="success"
          startIcon={<LocalShippingIcon />}
          sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            px: 4, 
            py: 1.5,
            '&:hover': {
              boxShadow: 3,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          新增销售过磅
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<HistoryIcon />}
          onClick={() => onNavigate(1)}
          sx={{ 
            borderRadius: 3, 
            px: 4, 
            py: 1.5,
            '&:hover': {
              boxShadow: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          历史记录
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<SettingsIcon />}
          onClick={() => onNavigate(2)}
          sx={{ 
            borderRadius: 3, 
            px: 4, 
            py: 1.5,
            '&:hover': {
              boxShadow: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          系统设置
        </Button>
        <Button 
          variant="outlined" 
          startIcon={loading || chartLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => {
            loadStatistics();
            loadChartData();
          }}
          disabled={loading || chartLoading}
          sx={{ 
            borderRadius: 3, 
            px: 4, 
            py: 1.5,
            '&:hover': {
              boxShadow: 2,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {(loading || chartLoading) ? '刷新中...' : '刷新数据'}
        </Button>
      </Stack>

      {/* 图表区域 */}
      <Box sx={{ mt: 5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* 近7天过磅量趋势图 */}
        <Paper sx={{ flex: 1, minWidth: 320, minHeight: 280, p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
            近7天过磅量趋势
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {chartLoading ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : chartData?.weeklyTrend && chartData.weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value} 次` : `${value} 吨`,
                    name === 'count' ? '过磅次数' : '过磅重量'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                  name="过磅次数"
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#43a047" 
                  strokeWidth={2}
                  dot={{ fill: '#43a047', strokeWidth: 2, r: 4 }}
                  name="过磅重量(吨)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              <Typography>暂无数据</Typography>
            </Box>
          )}
        </Paper>

        {/* 月度采购对比图 */}
        <Paper sx={{ flex: 1, minWidth: 320, minHeight: 280, p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
            月度采购趋势
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {chartLoading ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : chartData?.monthlyComparison && chartData.monthlyComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="monthName" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  formatter={(value: number, name: string) => [
                    name.includes('Count') ? `${value} 次` : `${value} 吨`,
                    name === 'purchaseCount' ? '采购次数' : 
                    name === 'purchaseWeight' ? '采购重量' :
                    name === 'salesCount' ? '销售次数' : '销售重量'
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="purchaseWeight" 
                  fill="#43a047" 
                  name="采购重量(吨)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="salesWeight" 
                  fill="#fbc02d" 
                  name="销售重量(吨)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              <Typography>暂无数据</Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* 供应商分布图 */}
      {chartData?.supplierDistribution && chartData.supplierDistribution.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
              供应商分布（按重量排序）
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.supplierDistribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'weight' ? `${value} 吨` : `${value} 次`,
                    name === 'weight' ? '总重量' : '过磅次数'
                  ]}
                />
                <Bar 
                  dataKey="weight" 
                  fill="#1976d2" 
                  name="总重量(吨)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      {/* 最新动态/过磅记录 */}
      <Box sx={{ mt: 5 }}>
        <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="subtitle1" gutterBottom>最新过磅记录</Typography>
          <Divider sx={{ mb: 1 }} />
          <List>
            {latestRecords.length > 0 ? (
              latestRecords.map((rec, idx) => (
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
              ))
            ) : (
              <ListItem sx={{ py: 4, textAlign: 'center' }}>
                <ListItemText
                  primary={
                    <Typography variant="body1" color="textSecondary">
                      暂无过磅记录
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      开始过磅后，最新记录将显示在这里
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </Box>
  );
} 