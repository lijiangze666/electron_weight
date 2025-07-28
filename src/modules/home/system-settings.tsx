import React from "react";
import { Box, Paper, Typography, List, ListItemButton, ListItemText, Divider, Avatar, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const menuItems = [
  { key: "user", label: "用户管理" },
  { key: "role", label: "权限设置" },
  { key: "base", label: "基础配置" },
  { key: "db", label: "数据库连接配置" },
  { key: "card", label: "一卡通设置" },
];

function DbConfigForm() {
  const [form, setForm] = React.useState({
    host: '',
    user: '',
    password: '',
    database: '',
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: 保存逻辑，写入db.js或调用API
    alert('保存成功（仅前端演示）');
  };
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400 }}>
      {/* <Typography variant="subtitle1" sx={{ mb: 2 }}>数据库连接配置</Typography> */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">数据库IP</Typography>
        <input name="host" value={form.host} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">用户名</Typography>
        <input name="user" value={form.user} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">密码</Typography>
        <input name="password" type="password" value={form.password} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">数据库</Typography>
        <input name="database" value={form.database} onChange={handleChange} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
      </Box>
      <button type="submit" style={{ padding: '8px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>保存</button>
    </Box>
  );
}

function CardSetting() {
  const [cards, setCards] = React.useState<Array<{ id: string; cardNumber: string; description: string; dbId?: number }>>([]);
  const [newCard, setNewCard] = React.useState({ cardNumber: '', description: '' });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 加载卡号列表
  const loadCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/cards');
      if (response.data.code === 0) {
        const formattedCards = response.data.data.map((card: any) => ({
          id: card.id.toString(),
          dbId: card.id,
          cardNumber: card.card_number,
          description: card.description || ''
        }));
        setCards(formattedCards);
      } else {
        setMessage({ type: 'error', text: response.data.msg || '加载失败' });
      }
    } catch (error) {
      console.error('加载卡号失败:', error);
      setMessage({ type: 'error', text: '加载卡号失败，请检查网络连接' });
    } finally {
      setLoading(false);
    }
  };

  // 添加卡号
  const handleAddCard = async () => {
    if (!newCard.cardNumber.trim()) {
      setMessage({ type: 'error', text: '请输入卡号' });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3001/api/cards', {
        card_number: newCard.cardNumber.trim(),
        description: newCard.description.trim()
      });

      if (response.data.code === 0) {
        // 添加成功后重新加载列表
        await loadCards();
        setNewCard({ cardNumber: '', description: '' });
        setMessage({ type: 'success', text: '添加成功' });
      } else {
        setMessage({ type: 'error', text: response.data.msg || '添加失败' });
      }
    } catch (error: any) {
      console.error('添加卡号失败:', error);
      if (error.response?.data?.msg) {
        setMessage({ type: 'error', text: error.response.data.msg });
      } else {
        setMessage({ type: 'error', text: '添加卡号失败，请检查网络连接' });
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除卡号
  const handleDeleteCard = async (id: string) => {
    try {
      setLoading(true);
      const response = await axios.delete(`http://localhost:3001/api/cards/${id}`);
      
      if (response.data.code === 0) {
        // 删除成功后重新加载列表
        await loadCards();
        setMessage({ type: 'success', text: '删除成功' });
      } else {
        setMessage({ type: 'error', text: response.data.msg || '删除失败' });
      }
    } catch (error: any) {
      console.error('删除卡号失败:', error);
      if (error.response?.data?.msg) {
        setMessage({ type: 'error', text: error.response.data.msg });
      } else {
        setMessage({ type: 'error', text: '删除卡号失败，请检查网络连接' });
      }
    } finally {
      setLoading(false);
    }
  };

  // 批量保存卡号
  const handleSave = async () => {
    if (cards.length === 0) {
      setMessage({ type: 'error', text: '没有卡号需要保存' });
      return;
    }

    try {
      setLoading(true);
      const cardsToSave = cards.filter(card => !card.dbId); // 只保存未保存的卡号
      
      if (cardsToSave.length === 0) {
        setMessage({ type: 'success', text: '所有卡号已保存' });
        return;
      }

      const response = await axios.post('http://localhost:3001/api/cards/batch', {
        cards: cardsToSave.map(card => ({
          card_number: card.cardNumber,
          description: card.description
        }))
      });

      if (response.data.code === 0) {
        await loadCards(); // 重新加载以获取数据库ID
        setMessage({ type: 'success', text: `保存成功！成功${response.data.data.successCount}个，失败${response.data.data.failCount}个` });
      } else {
        setMessage({ type: 'error', text: response.data.msg || '保存失败' });
      }
    } catch (error: any) {
      console.error('保存卡号失败:', error);
      if (error.response?.data?.msg) {
        setMessage({ type: 'error', text: error.response.data.msg });
      } else {
        setMessage({ type: 'error', text: '保存卡号失败，请检查网络连接' });
      }
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取卡号列表
  React.useEffect(() => {
    loadCards();
  }, []);

  return (
    <Box sx={{ maxWidth: 800 }}>
      {/* 添加卡号表单 */}
      <Paper sx={{ p: 3, mb: 3, background: '#f8f9fa' }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
          添加卡号
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            label="卡号"
            value={newCard.cardNumber}
            onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
            placeholder="请输入卡号"
            sx={{ minWidth: 200 }}
            size="small"
            disabled={loading}
          />
          <TextField
            label="备注"
            value={newCard.description}
            onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
            placeholder="可选备注信息"
            sx={{ minWidth: 200 }}
            size="small"
            disabled={loading}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCard}
            disabled={!newCard.cardNumber.trim() || loading}
            sx={{ 
              background: '#1976d2',
              '&:hover': { background: '#1565c0' }
            }}
          >
            添加
          </Button>
        </Box>
      </Paper>

      {/* 卡号列表表格 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
            卡号列表 ({cards.length} 张)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={loadCards}
              disabled={loading}
              sx={{ 
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': { borderColor: '#1565c0', background: 'rgba(25, 118, 210, 0.04)' }
              }}
            >
              刷新
            </Button>
            {cards.length > 0 && (
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={loading}
                sx={{ 
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': { borderColor: '#1565c0', background: 'rgba(25, 118, 210, 0.04)' }
                }}
              >
                保存设置
              </Button>
            )}
          </Box>
        </Box>
        
        {cards.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: '#666' }}>
            <Typography variant="body1">
              {loading ? '加载中...' : '暂无卡号，请在上方添加卡号'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>序号</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>卡号</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.map((card, index) => (
                  <TableRow key={card.id} sx={{ '&:hover': { background: '#f8f9fa' } }}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {card.cardNumber}
                    </TableCell>
                    <TableCell>{card.description || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1,
                        fontSize: '12px',
                        fontWeight: 500,
                        ...(card.dbId ? {
                          bgcolor: '#e8f5e8',
                          color: '#2e7d32'
                        } : {
                          bgcolor: '#fff3e0',
                          color: '#f57c00'
                        })
                      }}>
                        {card.dbId ? '已保存' : '未保存'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleDeleteCard(card.id)}
                        size="small"
                        disabled={loading}
                        sx={{ color: '#d32f2f' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 消息提示 */}
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
}

export default function SystemSettings() {
  const [selected, setSelected] = React.useState("user");

  const renderContent = () => {
    switch (selected) {
      case "user":
        return <Typography>这里是用户管理内容</Typography>;
      case "role":
        return <Typography>这里是权限设置内容</Typography>;
      case "base":
        return <Typography>这里是基础配置内容</Typography>;
      case "db":
        return <DbConfigForm />;
      case "card":
        return <CardSetting />;
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 0, height: "100%", display: "flex", borderRadius: 3, boxShadow: 3, overflow: 'hidden', background: '#f4f6fa' }}>
      {/* 左侧菜单栏 */}
      <Box
        sx={{
          width: 200,
          borderRight: 1,
          borderColor: "divider",
          background: "linear-gradient(180deg, #e3eafc 0%, #f4f6fa 100%)",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 3,
        }}
      >
        <Avatar sx={{ bgcolor: '#1976d2', mb: 1 }}>
          <SettingsIcon />
        </Avatar>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#1976d2', letterSpacing: 1 }}>
          系统设置
        </Typography>
        <Divider sx={{ width: '80%', mb: 2 }} />
        <List sx={{ width: '100%' }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={selected === item.key}
              onClick={() => setSelected(item.key)}
              sx={{
                borderRadius: 2,
                mx: 2,
                mb: 1,
                fontWeight: selected === item.key ? 700 : 400,
                color: selected === item.key ? '#1976d2' : 'inherit',
                background: selected === item.key ? 'rgba(25, 118, 210, 0.08)' : 'none',
                '&:hover': {
                  background: 'rgba(25, 118, 210, 0.12)',
                },
              }}
            >
              <ListItemText primary={item.label} />
              {selected === item.key && <Box sx={{ width: 4, height: 24, bgcolor: '#1976d2', borderRadius: 2, ml: 1 }} />}
            </ListItemButton>
          ))}
        </List>
      </Box>
      {/* 右侧内容区 */}
      <Box sx={{ flex: 1, p: 4, background: '#fff', minHeight: 400, borderRadius: 0, boxShadow: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>
          {menuItems.find(m => m.key === selected)?.label}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ flex: 1 }}>{renderContent()}</Box>
      </Box>
    </Paper>
  );
} 