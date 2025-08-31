import React from "react";
import { Box, Paper, Typography, List, ListItemButton, ListItemText, Divider, Avatar, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import DatabaseConfig from '../settings/DatabaseConfig';

const menuItems = [
  { key: "user", label: "用户管理" },
  { key: "role", label: "权限设置" },
  { key: "base", label: "基础配置" },
  { key: "company", label: "公司配置" },
  { key: "db", label: "数据库连接配置" },
  { key: "card", label: "一卡通设置" },
];

function CompanySetting() {
  const [companyName, setCompanyName] = React.useState('一磅通');
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingName, setEditingName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 加载公司名称配置
  const loadCompanyConfig = async () => {
    try {
      setLoading(true);
      // 从localStorage或配置文件加载，如果没有则使用默认值
      const savedName = localStorage.getItem('companyName');
      if (savedName) {
        setCompanyName(savedName);
      }
    } catch (error) {
      console.error('加载公司配置失败:', error);
      setMessage({ type: 'error', text: '加载公司配置失败' });
    } finally {
      setLoading(false);
    }
  };

  // 保存公司名称
  const handleSaveCompanyName = async () => {
    if (!editingName.trim()) {
      setMessage({ type: 'error', text: '公司名称不能为空' });
      return;
    }

    try {
      setLoading(true);
      // 保存到localStorage
      localStorage.setItem('companyName', editingName.trim());
      setCompanyName(editingName.trim());
      setIsEditing(false);
      setMessage({ type: 'success', text: '公司名称保存成功' });

      // 触发全局事件，通知其他组件更新
      window.dispatchEvent(new CustomEvent('companyNameChanged', { 
        detail: { companyName: editingName.trim() } 
      }));
    } catch (error) {
      console.error('保存公司名称失败:', error);
      setMessage({ type: 'error', text: '保存公司名称失败' });
    } finally {
      setLoading(false);
    }
  };

  // 开始编辑
  const handleStartEdit = () => {
    setEditingName(companyName);
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingName('');
    setIsEditing(false);
  };

  // 组件加载时获取配置
  React.useEffect(() => {
    loadCompanyConfig();
  }, []);

  return (
    <Box sx={{ maxWidth: 600 }}>
      {/* 公司名称配置 */}
      <Paper sx={{ p: 4, mb: 3, background: 'linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%)' }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>
          📢 公司名称配置
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 当前公司名称显示 */}
          <Box sx={{ 
            p: 3, 
            border: '2px solid #e3f2fd', 
            borderRadius: 2, 
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                当前公司名称：
              </Typography>
              <Typography variant="h5" sx={{ 
                color: '#1976d2', 
                fontWeight: 700,
                letterSpacing: 1
              }}>
                {companyName}
              </Typography>
            </Box>
            {!isEditing && (
              <Button
                variant="outlined"
                onClick={handleStartEdit}
                disabled={loading}
                sx={{ 
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': { 
                    borderColor: '#1565c0', 
                    background: 'rgba(25, 118, 210, 0.04)' 
                  }
                }}
              >
                编辑
              </Button>
            )}
          </Box>

          {/* 编辑表单 */}
          {isEditing && (
            <Paper sx={{ p: 3, border: '2px solid #2196f3', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 600 }}>
                编辑公司名称
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <TextField
                  label="公司名称"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="请输入公司名称"
                  autoFocus
                  sx={{ 
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2',
                      },
                    }
                  }}
                  disabled={loading}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveCompanyName}
                    disabled={!editingName.trim() || loading}
                    sx={{ 
                      background: '#1976d2',
                      '&:hover': { background: '#1565c0' },
                      minWidth: 80
                    }}
                  >
                    保存
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    sx={{ 
                      borderColor: '#666',
                      color: '#666',
                      '&:hover': { 
                        borderColor: '#444', 
                        background: 'rgba(0, 0, 0, 0.04)' 
                      },
                      minWidth: 80
                    }}
                  >
                    取消
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          {/* 使用说明 */}
          <Box sx={{ 
            p: 2, 
            background: '#f0f7ff', 
            borderRadius: 2,
            border: '1px solid #bbdefb'
          }}>
            <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>
              💡 使用说明：
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, color: '#333' }}>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                公司名称将在打印小票时显示
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                修改后需要点击"保存"按钮才能生效
              </Typography>
              <Typography component="li" variant="body2">
                建议使用简短、易识别的公司名称
              </Typography>
            </Box>
          </Box>
        </Box>
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
      case "company":
        return <CompanySetting />;
      case "db":
        return <DatabaseConfig />;
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