import { useEffect, useState } from "react";
import { 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Snackbar, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Typography, 
  Select, 
  MenuItem, 
  Box,
  Grid
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";

interface SalesRecord {
  id: string;
  dbId?: number;
  time: string;
  customer: string; // 销售方/客户名称
  item: string;
  netWeight: number | null; // 净重
  tareWeight: number | null; // 皮重
  grossWeight: number | null; // 毛重
  unit: string;
  price: number | null; // 单价
  amount: number;
  card_no?: string;
  is_archived?: number;
  is_check?: number;
}

export default function SalesSystem() {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // 新增成功提示状态
  const [successMsg, setSuccessMsg] = useState("");
  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // 新增数据表单状态
  const [newRecord, setNewRecord] = useState({
    customer: "",
    item: "小麦",
    netWeight: "",
    tareWeight: "",
    grossWeight: "",
    price: "",
    unit: "公斤"
  });

  // 物品类型状态
  const [itemTypes, setItemTypes] = useState<string[]>([]);

  useEffect(() => {
    // 页面加载时查询所有数据
    handleQueryAllRecords();
    
    // 加载物品类型
    loadItemTypes();
    
    // 监听物品类型变更事件
    const itemTypesChangeHandler = (event: any) => {
      const { itemTypes: newItemTypes } = event.detail;
      setItemTypes(newItemTypes);
      console.log('物品类型已更新:', newItemTypes);
    };
    window.addEventListener('itemTypesChanged', itemTypesChangeHandler);
    
    return () => {
      window.removeEventListener('itemTypesChanged', itemTypesChangeHandler);
    };
  }, []);

  // 生成随机单据号
  const genId = () => Math.random().toString(36).slice(2, 10).padEnd(8,'0').toUpperCase();
  
  // 格式化时间为 yyyy-MM-dd HH:mm:ss
  const formatTime = (time: any) => {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    
    return date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0') + ' ' + 
      String(date.getHours()).padStart(2, '0') + ':' + 
      String(date.getMinutes()).padStart(2, '0') + ':' + 
      String(date.getSeconds()).padStart(2, '0');
  };
  
  // 获取当前时间字符串
  const getTime = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0") +
      ":" +
      String(d.getSeconds()).padStart(2, "0")
    );
  };

  // 新增销售记录
  const handleAdd = async () => {
    // 验证必填字段
    if (!newRecord.customer) {
      setError("销售方必填！");
      setOpen(true);
      return;
    }
    
    if (!newRecord.grossWeight || !newRecord.tareWeight || !newRecord.price) {
      setError("毛重、皮重、单价必填！");
      setOpen(true);
      return;
    }

    const grossWeight = parseFloat(newRecord.grossWeight);
    const tareWeight = parseFloat(newRecord.tareWeight);
    const price = parseFloat(newRecord.price);
    
    if (tareWeight >= grossWeight) {
      setError("皮重不能大于等于毛重！");
      setOpen(true);
      return;
    }

    const netWeight = grossWeight - tareWeight;
    const amount = netWeight * price * 2; // 金额 = 净重 * 单价 * 2

    const newId = genId();
    const recordToSave = {
      bill_no: newId,
      time: getTime(),
      customer: newRecord.customer,
      item: newRecord.item,
      net_weight: Math.round(netWeight),
      tare_weight: Math.round(tareWeight),
      gross_weight: Math.round(grossWeight),
      unit: newRecord.unit,
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount),
      card_no: null,
      is_deleted: 0,
      is_archived: 0,
      is_check: 0
    };

    try {
      const response = await axios.post("http://localhost:3001/api/sales-weight", recordToSave);
      
      if (response.data.code === 0) {
        // 添加到本地列表
        const newRecordItem: SalesRecord = {
          id: newId,
          dbId: response.data.data.id,
          time: recordToSave.time,
          customer: recordToSave.customer,
          item: recordToSave.item,
          netWeight: recordToSave.net_weight,
          tareWeight: recordToSave.tare_weight,
          grossWeight: recordToSave.gross_weight,
          unit: recordToSave.unit,
          price: recordToSave.price,
          amount: recordToSave.amount,
          card_no: recordToSave.card_no || undefined,
          is_archived: recordToSave.is_archived,
          is_check: recordToSave.is_check
        };
        
        setRecords(prev => [newRecordItem, ...prev]);
        
        // 清空表单
        setNewRecord({
          customer: "",
          item: "小麦",
          netWeight: "",
          tareWeight: "",
          grossWeight: "",
          price: "",
          unit: "公斤"
        });
        
        setSuccessMsg("新增成功！");
        setOpen(true);
      } else {
        setError(response.data.msg || "新增失败！");
        setOpen(true);
      }
    } catch (err) {
      console.error('新增销售记录失败:', err);
      const errorMsg = (err as any).message || String(err);
      setError("新增失败：" + errorMsg);
      setOpen(true);
    }
  };

  // 删除选中行
  const handleDelete = () => {
    if (!selectedId) return;
    
    const recordToDelete = records.find(r => r.id === selectedId);
    if (!recordToDelete) return;
    
    const isSaved = recordToDelete.dbId !== undefined;
    
    if (isSaved) {
      setDeleteConfirmId(selectedId);
      setDeleteConfirmOpen(true);
    } else {
      setRecords(records.filter((r) => r.id !== selectedId));
      setSelectedId(null);
      setSuccessMsg("删除成功！");
      setOpen(true);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      const response = await axios.delete(`http://localhost:3001/api/sales-weight/${deleteConfirmId}`);
      
      if (response.data.code === 0) {
        setRecords(records.filter((r) => r.id !== deleteConfirmId));
        setSelectedId(null);
        setSuccessMsg("删除成功！");
        setOpen(true);
      } else {
        setError(response.data.msg || "删除失败！");
        setOpen(true);
      }
    } catch (err) {
      console.error('删除销售记录失败:', err);
      const errorMsg = (err as any).message || String(err);
      setError("删除失败：" + errorMsg);
      setOpen(true);
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteConfirmId(null);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmId(null);
  };

  // 查询所有记录
  const handleQueryAllRecords = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/sales-weight');
      if (response.data.code === 0) {
        const allRecords = response.data.data.map((record: any) => ({
          id: record.bill_no,
          dbId: record.id,
          time: formatTime(record.time),
          customer: record.customer,
          item: record.item,
          netWeight: record.net_weight ? Math.round(record.net_weight) : null,
          tareWeight: record.tare_weight ? Math.round(record.tare_weight) : null,
          grossWeight: record.gross_weight ? Math.round(record.gross_weight) : null,
          unit: record.unit,
          price: record.price,
          amount: record.amount ? Math.round(record.amount) : 0,
          card_no: record.card_no || null,
          is_archived: record.is_archived,
          is_check: record.is_check || 0
        }));
        setRecords(allRecords);
      } else {
        setError(response.data.msg || '查询失败');
        setOpen(true);
      }
    } catch (err) {
      const errorMsg = (err as any).message || String(err);
      setError('查询失败：' + errorMsg);
      setOpen(true);
    }
  };

  // 汇总计算
  const totalNetWeight = Math.round(records.reduce(
    (sum, r) => sum + (r.netWeight || 0),
    0
  ));
  const totalAmount = Math.round(records.reduce((sum, r) => sum + (r.amount || 0), 0));

  // 加载物品类型
  const loadItemTypes = () => {
    const savedItemTypes = localStorage.getItem('itemTypes');
    if (savedItemTypes) {
      try {
        const parsedItemTypes = JSON.parse(savedItemTypes);
        if (Array.isArray(parsedItemTypes) && parsedItemTypes.length > 0) {
          setItemTypes(parsedItemTypes);
          // 如果当前选择的物品不在列表中，更新为第一个
          if (!parsedItemTypes.includes(newRecord.item)) {
            setNewRecord(prev => ({ ...prev, item: parsedItemTypes[0] }));
          }
        } else {
          setItemTypes(['小麦', '玉米']);
        }
      } catch (error) {
        console.error('解析物品类型失败:', error);
        setItemTypes(['小麦', '玉米']);
      }
    } else {
      setItemTypes(['小麦', '玉米']);
    }
  };

  // 按钮大小
  const bigBtnStyle = { fontSize: 20, px: 1, py: 1, minWidth: 90 };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f7fa',
        overflow: 'hidden',
        p: 2
      }}
    >
      {/* 错误提示 */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => {
            setOpen(false);
            setSuccessMsg("");
            setError("");
          }}
          severity={successMsg ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {(successMsg || error) as string}
        </Alert>
      </Snackbar>
      
      {/* 销售记录标题 */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 16px 0' }}>
        <div style={{ width: 6, height: 28, background: 'linear-gradient(180deg, #1976d2 60%, #64b5f6 100%)', borderRadius: 3, marginRight: 10 }} />
        <h3 style={{ margin: 0, fontSize: 26, color: '#1976d2', fontWeight: 900, letterSpacing: 1 }}>销售记录</h3>
      </div>

      {/* 新增数据表单 */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 2, 
          borderRadius: 3,
          background: 'linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 700 }}>
          新增销售记录
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="销售方"
              value={newRecord.customer}
              onChange={(e) => setNewRecord({...newRecord, customer: e.target.value})}
              fullWidth
              size="small"
              required
              sx={{
                '& .MuiInputBase-input': { fontSize: '16px' },
                '& .MuiInputLabel-root': { fontSize: '16px' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              value={newRecord.item}
              onChange={(e) => setNewRecord({...newRecord, item: e.target.value})}
              fullWidth
              size="small"
              sx={{
                '& .MuiSelect-select': { fontSize: '16px' },
                '& .MuiInputLabel-root': { fontSize: '16px' }
              }}
            >
              {itemTypes.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="毛重(公斤)"
              type="number"
              value={newRecord.grossWeight}
              onChange={(e) => setNewRecord({...newRecord, grossWeight: e.target.value})}
              fullWidth
              size="small"
              required
              sx={{
                '& .MuiInputBase-input': { fontSize: '16px' },
                '& .MuiInputLabel-root': { fontSize: '16px' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="皮重(公斤)"
              type="number"
              value={newRecord.tareWeight}
              onChange={(e) => setNewRecord({...newRecord, tareWeight: e.target.value})}
              fullWidth
              size="small"
              required
              sx={{
                '& .MuiInputBase-input': { fontSize: '16px' },
                '& .MuiInputLabel-root': { fontSize: '16px' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="单价(元/斤)"
              type="number"
              value={newRecord.price}
              onChange={(e) => setNewRecord({...newRecord, price: e.target.value})}
              fullWidth
              size="small"
              required
              inputProps={{ step: 0.01 }}
              sx={{
                '& .MuiInputBase-input': { fontSize: '16px' },
                '& .MuiInputLabel-root': { fontSize: '16px' }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAdd}
              fullWidth
              sx={{ 
                fontSize: 18, 
                py: 1.5, 
                borderRadius: 3, 
                boxShadow: 2, 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)'
              }}
            >
              新增记录
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          disabled={!selectedId}
          sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 1, fontWeight: 700 }}
        >
          删除
        </Button>
        <Button
          variant="contained"
          color="info"
          onClick={handleQueryAllRecords}
          sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
        >
          刷新数据
        </Button>
      </div>
      
      {/* 数据表格 */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 4,
          borderRadius: 3,
          flex: 1,
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'auto',
        }}
      >
        <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
          <TableHead>
            <TableRow sx={{ background: "linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)", boxShadow: 1 }}>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopLeftRadius: 12 }}>单据号</TableCell>
              <TableCell sx={{ width: '15%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>时间</TableCell>
              <TableCell sx={{ width: '15%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>销售方</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>物品</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>净重</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>皮重</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>毛重</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/斤</TableCell>
              <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopRightRadius: 12 }}>金额</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow
                key={r.id}
                hover
                selected={selectedId === r.id}
                onClick={() => setSelectedId(r.id)}
                style={{ cursor: "pointer" }}
                sx={{
                  backgroundColor: selectedId === r.id ? '#e3f2fd' : 'inherit',
                  '&:hover': {
                    backgroundColor: selectedId === r.id ? '#bbdefb' : '#f5f5f5',
                  },
                  '& .MuiTableCell-root': {
                    color: selectedId === r.id ? '#1976d2' : 'inherit',
                    fontWeight: selectedId === r.id ? 700 : 400,
                  }
                }}
              >
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}> {r.id} </TableCell>
                <TableCell sx={{ width: '15%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px" }}> {r.time} </TableCell>
                <TableCell sx={{ width: '15%', textAlign: "center", fontSize: "20px" }}>{r.customer}</TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>{r.item}</TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>
                  {r.netWeight !== null ? Math.round(r.netWeight) : ""}
                </TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                  {r.tareWeight !== null ? Math.round(r.tareWeight) : ""}
                </TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                  {r.grossWeight !== null ? Math.round(r.grossWeight) : ""}
                </TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                  {r.price}
                </TableCell>
                <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#d32f2f' }}>
                  {r.amount ? Math.round(r.amount) : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 合计栏 */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)',
        border: 'none',
        borderRadius: 12,
        boxShadow: '0 2px 12px 0 #b3c6e0',
        padding: '22px 0',
        fontSize: 22,
        fontWeight: 800,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 80,
        marginTop: 16,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#1976d2', fontSize: 26, fontWeight: 900 }}>合计净重：</span>
          <span style={{ color: '#1976d2', fontSize: 28, fontWeight: 900 }}>{totalNetWeight.toFixed(1)}</span>
          <span style={{ color: '#1976d2', fontSize: 18, fontWeight: 700 }}>公斤</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#d32f2f', fontSize: 26, fontWeight: 900 }}>合计金额：</span>
          <span style={{ color: '#d32f2f', fontSize: 28, fontWeight: 900 }}>{Math.round(totalAmount)}</span>
          <span style={{ color: '#d32f2f', fontSize: 18, fontWeight: 700 }}>元</span>
        </span>
      </div>
      
      {/* 删除确认对话框 */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">确认删除</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            您确定要删除此条记录吗？此操作不可逆。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            取消
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}