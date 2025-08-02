import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Divider, 
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Snackbar
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Refresh as RefreshIcon, 
  PlayArrow as TestIcon,
  Storage as DatabaseIcon 
} from '@mui/icons-material';

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  connectionLimit: number;
  queueLimit: number;
}

const DatabaseConfig: React.FC = () => {
  const [formData, setFormData] = useState<DatabaseConfig>({
    host: '',
    user: '',
    password: '',
    database: '',
    port: 3306,
    connectionLimit: 10,
    queueLimit: 0
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<DatabaseConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 获取当前配置
  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/database-config');
      const result = await response.json();
      
      if (result.code === 0) {
        setConfig(result.data);
        setFormData(result.data);
      } else {
        setMessage({ type: 'error', text: '获取配置失败: ' + result.msg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '获取配置失败: ' + error });
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/database-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        setMessage({ type: 'success', text: '配置保存成功' });
        setConfig(result.data);
      } else {
        setMessage({ type: 'error', text: '保存失败: ' + result.msg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败: ' + error });
    } finally {
      setLoading(false);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      setTestLoading(true);
      
      const response = await fetch('http://localhost:3001/api/test-database-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        setMessage({ type: 'success', text: '数据库连接测试成功' });
      } else {
        setMessage({ type: 'error', text: '连接测试失败: ' + result.msg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '连接测试失败: ' + error });
    } finally {
      setTestLoading(false);
    }
  };

  const handleInputChange = (field: keyof DatabaseConfig, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DatabaseIcon color="primary" />
              <Typography variant="h6">数据库配置管理</Typography>
            </Box>
          }
          action={
            <IconButton onClick={loadConfig} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            修改数据库配置后，系统会自动重新连接数据库。请确保配置信息正确，避免影响系统正常运行。
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="数据库主机"
                value={formData.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="例如: 47.94.131.132"
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="端口"
                type="number"
                value={formData.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 3306)}
                placeholder="例如: 3306"
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="用户名"
                value={formData.user}
                onChange={(e) => handleInputChange('user', e.target.value)}
                placeholder="例如: weight"
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="密码"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="请输入数据库密码"
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="数据库名"
                value={formData.database}
                onChange={(e) => handleInputChange('database', e.target.value)}
                placeholder="例如: weight"
                required
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading}
              sx={{ 
                background: '#1976d2',
                '&:hover': { background: '#1565c0' }
              }}
            >
              保存配置
            </Button>
            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={handleTestConnection}
              disabled={testLoading}
              sx={{ 
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': { borderColor: '#1565c0', background: 'rgba(25, 118, 210, 0.04)' }
              }}
            >
              测试连接
            </Button>
          </Box>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardContent>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="h6" color="primary">当前配置信息</Typography>
            </Divider>
            <Alert severity="success">
              <Box>
                <Typography variant="body2"><strong>主机:</strong> {config.host}</Typography>
                <Typography variant="body2"><strong>端口:</strong> {config.port}</Typography>
                <Typography variant="body2"><strong>数据库:</strong> {config.database}</Typography>
                <Typography variant="body2"><strong>用户名:</strong> {config.user}</Typography>
                <Typography variant="body2"><strong>连接池大小:</strong> {config.connectionLimit}</Typography>
              </Box>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.type}
          sx={{ width: '100%' }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseConfig; 