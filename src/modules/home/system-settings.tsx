import React from "react";
import { Box, Paper, Typography, List, ListItemButton, ListItemText, Divider, Avatar } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';

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
  return <Typography>这里是卡设置内容</Typography>;
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