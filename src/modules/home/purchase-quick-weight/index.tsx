import React, { useEffect, useState, useRef } from "react";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import TableFooter from "@mui/material/TableFooter";
import dayjs from "dayjs";
import Checkbox from "@mui/material/Checkbox";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

interface RecordItem {
  id: string;
  time: string;
  item: string;
  maozhong: number | null;
  pizhong: number | null;
  jingzhong: number | null;
  unit: string;
  price: number | null; // 单价
  amount: number;
}

// 编辑状态接口
interface EditState {
  id: string;
  field: string;
  value: string;
}

export default function PurchaseQuickWeight() {
  const [serialData, setSerialData] = useState("");
  const lastWeightRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const [isStable, setIsStable] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  // 上方表格单选id
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 下方表格单选id
  const [selectedArchivedId, setSelectedArchivedId] = useState<string | null>(null);
  // 单价输入弹窗相关状态
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [inputPrice, setInputPrice] = useState("");
  // 归档数据和筛选状态
  const [archivedRecords, setArchivedRecords] = useState<RecordItem[]>([]);
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  // 编辑状态
  const [editingCell, setEditingCell] = useState<EditState | null>(null);
  // 归档数据编辑状态
  const [editingArchivedCell, setEditingArchivedCell] = useState<EditState | null>(null);
  // 归档表格多选选中行id
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<string[]>([]);

  useEffect(() => {
    ipcRenderer.send("open-serialport");

    const handler = (_event: any, data: string) => {
      const match = data.match(/[+-]?\d+/);
      if (match) {
        // 原始数据是克，除以1000并取整
        const weight = Math.floor(parseInt(match[0], 10) / 1000);
        setSerialData(`${weight}`);
        setIsStable(true);
      } else {
        setIsStable(false);
      }
    };
    ipcRenderer.on("serialport-data", handler);
    return () => {
      ipcRenderer.removeListener("serialport-data", handler);
    };
  }, []);

  // 生成随机单据号
  const genId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
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

  // 新增一条空数据时，item默认为小麦
  const handleAdd = () => {
    setRecords([
      ...records,
      {
        id: genId(),
        time: getTime(),
        item: "小麦", // 默认为小麦
        maozhong: null,
        pizhong: null,
        jingzhong: null,
        unit: "斤",
        price: null,
        amount: 0,
      },
    ]);
  };

  // 保存选中行到归档
  const handleSaveSelected = () => {
    if (!selectedId) return;
    const toArchive = records.find(r => r.id === selectedId);
    if (toArchive) {
      setArchivedRecords(prev => [...prev, toArchive]);
      setRecords(prev => prev.filter(r => r.id !== selectedId));
      setSelectedId(null);
    }
  };

  // 删除选中行
  const handleDelete = () => {
    if (selectedId) {
      setRecords(records.filter((r) => r.id !== selectedId));
      setSelectedId(null);
    }
  };

  // 点击毛重，弹窗输入单价
  const handleMaozhong = () => {
    if (
      isStable &&
      serialData &&
      records.length > 0 &&
      selectedId
    ) {
      setPriceDialogOpen(true);
      setInputPrice("");
    }
  };

  // 修正金额计算逻辑：金额 = 单价 * 净重 * 2
  // handlePizhong
  const handlePizhong = () => {
    if (
      isStable &&
      serialData &&
      records.length > 0 &&
      selectedId
    ) {
      setRecords((prev) =>
        prev.map((row) => {
          if (row.id === selectedId && row.maozhong !== null) {
            const pizhong = Number(serialData);
            if (pizhong >= row.maozhong) {
              setError("皮重不能大于等于毛重！");
              setOpen(true);
              return row;
            }
            const jingzhong = row.maozhong - pizhong;
            const amount = row.price ? (jingzhong * row.price) * 2 : 0;
            return { ...row, pizhong, jingzhong, amount };
          }
          return row;
        })
      );
    }
  };

  // 确认输入单价
  const handlePriceConfirm = () => {
    const priceValue = parseFloat(inputPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError("请输入有效的单价");
      setOpen(true);
      return;
    }
    setRecords((prev) =>
      prev.map((row) => {
        if (row.id === selectedId) {
          // 只更新毛重和单价，金额联动
          const maozhong = Number(serialData);
          let jingzhong = null;
          let amount = 0;
          if (row.pizhong !== null) {
            jingzhong = maozhong - row.pizhong;
            amount = (jingzhong * priceValue) * 2;
          }
          return { ...row, maozhong, price: priceValue, jingzhong, amount };
        }
        return row;
      })
    );
    setPriceDialogOpen(false);
  };

  // 汇总计算
  const totalJingzhong = records.reduce(
    (sum, r) => sum + (r.jingzhong || 0),
    0
  );
  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  // 归档表格筛选逻辑
  const filteredArchived = archivedRecords.filter((r) => {
    if (filterStart && dayjs(r.time).isBefore(dayjs(filterStart))) return false;
    if (filterEnd && dayjs(r.time).isAfter(dayjs(filterEnd))) return false;
    return true;
  });

  // 归档表格统计
  const totalArchivedJingzhong = filteredArchived.reduce(
    (sum, r) => sum + (r.jingzhong || 0),
    0
  );
  const totalArchivedAmount = filteredArchived.reduce(
    (sum, r) => sum + (r.amount || 0),
    0
  );

  // 开始编辑单元格
  const handleCellEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({
      id,
      field,
      value: currentValue !== null ? currentValue.toString() : ""
    });
  };

  // 保存编辑（现在只做退出编辑）
  const handleCellSave = () => {
    setEditingCell(null);
  };

  // 取消编辑
  const handleCellCancel = () => {
    setEditingCell(null);
  };

  // 处理编辑输入变化
  const handleEditChange = (value: string) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value });
    }
  };

  // 处理编辑键盘事件
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  // 开始编辑归档数据单元格
  const handleArchivedCellEdit = (id: string, field: string, currentValue: any) => {
    setEditingArchivedCell({
      id,
      field,
      value: currentValue !== null ? currentValue.toString() : ""
    });
  };

  // 保存归档数据编辑（现在只做退出编辑）
  const handleArchivedCellSave = () => {
    setEditingArchivedCell(null);
  };

  // 取消编辑归档数据
  const handleArchivedCellCancel = () => {
    setEditingArchivedCell(null);
  };

  // 处理归档数据编辑输入变化
  const handleArchivedEditChange = (value: string) => {
    if (editingArchivedCell) {
      setEditingArchivedCell({ ...editingArchivedCell, value });
    }
  };

  // 处理归档数据编辑键盘事件
  const handleArchivedEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleArchivedCellSave();
    } else if (e.key === 'Escape') {
      handleArchivedCellCancel();
    }
  };

  // 实时更新 records
  const handleCellChangeImmediate = (id: string, field: string, value: string) => {
    setRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updatedRecord = { ...record };
        switch (field) {
          case 'item':
            updatedRecord.item = value;
            break;
          case 'maozhong': {
            const maozhong = parseFloat(value);
            if (updatedRecord.pizhong !== null && !isNaN(maozhong) && maozhong <= updatedRecord.pizhong) {
              setError("毛重必须大于皮重！");
              setOpen(true);
              return record;
            }
            updatedRecord.maozhong = isNaN(maozhong) ? null : maozhong;
            if (updatedRecord.pizhong !== null && updatedRecord.maozhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price * 2 : 0;
            }
            break;
          }
          case 'pizhong': {
            const pizhong = parseFloat(value);
            if (updatedRecord.maozhong !== null && !isNaN(pizhong) && pizhong >= updatedRecord.maozhong) {
              setError("皮重不能大于等于毛重！");
              setOpen(true);
              return record;
            }
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price * 2 : 0;
            }
            break;
          }
          case 'price':
            const price = parseFloat(value);
            updatedRecord.price = isNaN(price) ? null : price;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price * 2;
            }
            break;
          case 'unit':
            updatedRecord.unit = value;
            break;
        }
        return updatedRecord;
      }
      return record;
    }));
  };

  // 实时更新 archivedRecords
  const handleArchivedCellChangeImmediate = (id: string, field: string, value: string) => {
    setArchivedRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updatedRecord = { ...record };
        switch (field) {
          case 'item':
            updatedRecord.item = value;
            break;
          case 'maozhong':
            const maozhong = parseFloat(value);
            updatedRecord.maozhong = isNaN(maozhong) ? null : maozhong;
            if (updatedRecord.pizhong !== null && updatedRecord.maozhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price * 2 : 0;
            }
            break;
          case 'pizhong':
            const pizhong = parseFloat(value);
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price * 2 : 0;
            }
            break;
          case 'price':
            const price = parseFloat(value);
            updatedRecord.price = isNaN(price) ? null : price;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price * 2;
            }
            break;
          case 'unit':
            updatedRecord.unit = value;
            break;
        }
        return updatedRecord;
      }
      return record;
    }));
  };

  // 可编辑单元格组件（移到组件外部，并用React.memo包裹）
  const EditableCell = React.memo(({
    record,
    field,
    value,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onChange,
    onKeyPress
  }: {
    record: any;
    field: string;
    value: any;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onChange: (value: string) => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
  }) => {
    const [localValue, setLocalValue] = React.useState(value);

    // 当编辑状态改变时，更新本地值
    React.useEffect(() => {
      setLocalValue(value);
    }, [value, isEditing]);

    const handleSave = () => {
      if (localValue !== value) {
        onChange(localValue);
      }
      onSave();
    };

    const handleCancel = () => {
      setLocalValue(value); // 恢复原值
      onCancel();
    };

    if (isEditing) {
      if (field === 'item') {
        return (
          <Select
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleSave}
            autoFocus
            size="small"
            sx={{ fontSize: '20px', minWidth: 80 }}
            MenuProps={{ PaperProps: { sx: { fontSize: '20px' } } }}
          >
            <MenuItem value="小麦" sx={{ fontSize: '20px' }}>小麦</MenuItem>
            <MenuItem value="玉米" sx={{ fontSize: '20px' }}>玉米</MenuItem>
          </Select>
        );
      }
      return (
        <TextField
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          onBlur={handleSave}
          autoFocus
          size="small"
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '20px',
              textAlign: 'center',
              padding: '4px 8px'
            }
          }}
        />
      );
    }
    return (
      <div
        onClick={onEdit}
        style={{
          cursor: 'pointer',
          padding: '8px',
          minHeight: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="点击编辑"
      >
        {value !== null && value !== undefined ? value : ""}
      </div>
    );
  });

  // 反审核：将选中归档数据移回上方表格
  const handleUnAudit = () => {
    if (!selectedArchivedId) return;
    const toRestore = archivedRecords.find(r => r.id === selectedArchivedId);
    if (toRestore) {
      setRecords(prev => [...prev, toRestore]);
      setArchivedRecords(prev => prev.filter(r => r.id !== selectedArchivedId));
      setSelectedArchivedId(null);
    }
  };
  // 按钮大小
  const bigBtnStyle = { fontSize: 20, px: 1, py: 1, minWidth: 90 };

  return (
    <div style={{ display: "flex", width: '100%', height: '100%', minHeight: 0 }}>
      {/* 错误提示 */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
      {/* 左侧：上下两个表格 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 10,
          overflow: "hidden",
          minHeight: 0, // 确保flex子元素可以收缩
        }}
      >
        {/* 上方：过磅记录表格 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>过磅记录</h3>
          <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
            <Button variant="contained" color="primary" onClick={handleAdd} sx={bigBtnStyle}>
              新增
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={!selectedId}
              sx={bigBtnStyle}
            >
              删除
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSaveSelected}
              disabled={!selectedId}
              sx={bigBtnStyle}
            >
              保存
            </Button>
          </div>
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: 2,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>单据号</TableCell>
                  <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>时间</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>物品</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>毛重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>皮重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>净重</TableCell>
                  <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>单价/斤</TableCell>
                  <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} hover selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} style={{ cursor: "pointer" }} >
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}> {r.id} </TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px" }}> {r.time} </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                      <EditableCell
                        record={r}
                        field="item"
                        value={r.item}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'item'}
                        onEdit={() => handleCellEdit(r.id, 'item', r.item)}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'item', val)}
                        onKeyPress={handleEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                      <EditableCell
                        record={r}
                        field="maozhong"
                        value={r.maozhong}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'maozhong'}
                        onEdit={() => handleCellEdit(r.id, 'maozhong', r.maozhong)}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'maozhong', val)}
                        onKeyPress={handleEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                      <EditableCell
                        record={r}
                        field="pizhong"
                        value={r.pizhong}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'pizhong'}
                        onEdit={() => handleCellEdit(r.id, 'pizhong', r.pizhong)}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'pizhong', val)}
                        onKeyPress={handleEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700 }}>{r.jingzhong !== null ? r.jingzhong : ""}</TableCell>
                    <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "20px" }}>
                      <EditableCell
                        record={r}
                        field="price"
                        value={r.price}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'price'}
                        onEdit={() => handleCellEdit(r.id, 'price', r.price)}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'price', val)}
                        onKeyPress={handleEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "20px", fontWeight: 700 }}>{r.amount ? Math.round(r.amount) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        {/* 下方：归档/统计/查询表格 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>归档数据</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            {/* 开始时间输入框 */}
            <TextField
              label="开始时间"
              type="datetime-local"
              size="small"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              InputLabelProps={{ shrink: true, sx: { fontSize: 20 } }}
              inputProps={{ style: { fontSize: 20, height: 32 } }}
              sx={{ minWidth: 220, '.MuiInputBase-root': { height: 48 } }}
            />
            {/* 结束时间输入框 */}
            <TextField
              label="结束时间"
              type="datetime-local"
              size="small"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              InputLabelProps={{ shrink: true, sx: { fontSize: 20 } }}
              inputProps={{ style: { fontSize: 20, height: 32 } }}
              sx={{ minWidth: 220, '.MuiInputBase-root': { height: 48 } }}
            />
            <Button
              variant="contained"
              color="warning"
              onClick={handleUnAudit}
              disabled={!selectedArchivedId}
              sx={bigBtnStyle}
            >
              反审核
            </Button>
          </div>
          <TableContainer
            component={Paper} sx={{
              boxShadow: 1,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>单据号</TableCell>
                  <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>时间</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>物品</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>毛重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>皮重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>净重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>单价/斤</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>单价/公斤</TableCell>
                  <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredArchived.map((r) => (
                  <TableRow key={r.id} hover selected={selectedArchivedId === r.id} onClick={() => setSelectedArchivedId(r.id)} style={{ cursor: "pointer" }} >
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.id}</TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.time}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.item}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.maozhong !== null ? r.maozhong : ""}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.pizhong !== null ? r.pizhong : ""}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#1976d2' }}>{r.jingzhong !== null ? r.jingzhong : ""}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price !== null ? r.price : ""}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price !== null ? r.price * 2 : ""}</TableCell>
                    <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#1976d2' }}>{r.amount ? Math.round(r.amount) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* 新增：表格下方合计展示区 */}
          <div style={{
            width: '100%',
            background: '#fafafa',
            border: '1px solid #eee',
            borderTop: 'none',
            padding: '16px 0',
            fontSize: 18,
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 40,
            marginBottom: 8
          }}>
            <span>合计净重：<span style={{ color: '#1976d2' }}>{totalArchivedJingzhong.toFixed(1)}</span></span>
            <span>合计金额：<span style={{ color: '#d32f2f' }}>{Math.round(totalArchivedAmount)}</span></span>
          </div>
        </div>
      </div>
      {/* 右侧：数字显示和操作区 */}
      <div
        style={{
          width: 455, // 由300改为400
          padding: 15,
          borderLeft: "1px solid #eee",
          boxSizing: "border-box",
          height: "100%", // 修正
          overflow: "hidden", // 防止右侧出现滚动条
        }}
      >
        <div
          style={{
            background: "#000",
            color: isStable ? "#00e676" : "#ff2d2d", // 稳定时高亮绿色，否则红色
            fontWeight: isStable ? 900 : 400, // 稳定时加粗
            fontFamily:
              "'Share Tech Mono', 'Orbitron', 'Consolas', 'monospace'",
            fontSize: 65,
            padding: "8px 32px",
            borderRadius: 12,
            textAlign: "center",
            marginBottom: 24,
            letterSpacing: 2,
            border: "2px solid #222",
            minWidth: 320, // 由220改为320
            minHeight: 90,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: serialData ? 1 : 0.3, // 没有数据时半透明
            transition: "color 0.3s, font-weight 0.3s", // 平滑过渡
          }}
        >
          {serialData || <span>--</span>}
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleMaozhong}
            sx={{ fontSize: 22, px: 6, py: 2, minWidth: 120 }}
            disabled={!selectedId}
          >
            毛重
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePizhong}
            sx={{ fontSize: 22, px: 6, py: 2, minWidth: 120 }}
            disabled={!selectedId}
          >
            皮重
          </Button>
        </div>
      </div>
      {/* 单价输入弹窗 */}
      <Dialog open={priceDialogOpen} onClose={() => setPriceDialogOpen(false)}>
        <DialogTitle>请输入单价</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="单价 (元/斤)"
            type="number"
            fullWidth
            value={inputPrice}
            onChange={(e) => setInputPrice(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceDialogOpen(false)}>取消</Button>
          <Button onClick={handlePriceConfirm} variant="contained">
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
