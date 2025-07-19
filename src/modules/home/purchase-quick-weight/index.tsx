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
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

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
  // 新增：选中行id
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // 新增一条空数据
  const handleAdd = () => {
    setRecords([
      ...records,
      {
        id: genId(),
        time: getTime(),
        item: "物品A", // 可自定义
        maozhong: null,
        pizhong: null,
        jingzhong: null,
        unit: "千克", // 单位改为千克
        price: null, // 新增单价
        amount: 0,
      },
    ]);
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
    if (isStable && serialData && records.length > 0 && selectedId) {
      setPriceDialogOpen(true);
      setInputPrice("");
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
    // 更新选中行的毛重和单价
    setRecords((prev) =>
      prev.map((row) => {
        if (row.id === selectedId) {
          return { ...row, maozhong: Number(serialData), price: priceValue };
        }
        return row;
      })
    );
    setPriceDialogOpen(false);
  };

  // 点击皮重，自动计算金额并归档
  const handlePizhong = () => {
    if (isStable && serialData && records.length > 0 && selectedId) {
      let archivedRow: RecordItem | null = null;
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
            const amount = row.price ? jingzhong * row.price : 0;
            archivedRow = { ...row, pizhong, jingzhong, amount };
            return { ...row, pizhong, jingzhong, amount };
          }
          return row;
        })
      );
      setTimeout(() => {
        if (archivedRow) {
          setArchivedRecords((prevArch) => [...prevArch, archivedRow!]);
          setRecords((prev) => prev.filter((row) => row.id !== selectedId));
          setSelectedId(null);
        }
      }, 0);
    }
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
          case 'maozhong':
            const maozhong = parseFloat(value);
            updatedRecord.maozhong = isNaN(maozhong) ? null : maozhong;
            if (updatedRecord.pizhong !== null && updatedRecord.maozhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price : 0;
            }
            break;
          case 'pizhong':
            const pizhong = parseFloat(value);
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price : 0;
            }
            break;
          case 'price':
            const price = parseFloat(value);
            updatedRecord.price = isNaN(price) ? null : price;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price;
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
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price : 0;
            }
            break;
          case 'pizhong':
            const pizhong = parseFloat(value);
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = updatedRecord.maozhong - updatedRecord.pizhong;
              updatedRecord.amount = updatedRecord.price ? updatedRecord.jingzhong * updatedRecord.price : 0;
            }
            break;
          case 'price':
            const price = parseFloat(value);
            updatedRecord.price = isNaN(price) ? null : price;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price;
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
    if (isEditing) {
      return (
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyPress}
          onBlur={onSave}
          autoFocus
          size="small"
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '15px',
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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
        }}
      >
        {/* 上方：过磅记录表格 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3>过磅记录</h3>
          <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <Button variant="contained" color="primary" onClick={handleAdd}>
              新增
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={!selectedId}
            >
              删除
            </Button>
          </div>
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: 2,
              flex: 1,
              minHeight: 0,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单据号</TableCell>
                  <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>时间</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>物品</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>毛重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>皮重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>净重</TableCell>
                  <TableCell sx={{ width: '8%', whiteSpace: "nowrap", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单位</TableCell>
                  <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单价</TableCell>
                  <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} hover selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} style={{ cursor: "pointer" }} >
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "15px" }}> {r.id} </TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "15px" }}> {r.time} </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
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
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
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
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
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
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}> {r.jingzhong !== null ? r.jingzhong : ""} </TableCell>
                    <TableCell sx={{ width: '8%', whiteSpace: "nowrap", textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="unit"
                        value={r.unit}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'unit'}
                        onEdit={() => handleCellEdit(r.id, 'unit', r.unit)}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'unit', val)}
                        onKeyPress={handleEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "15px" }}>
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
                    <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "15px" }}>{r.amount ? r.amount.toFixed(1) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ position: "sticky", bottom: 0, background: "#fff", zIndex: 2,}}>
                  <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, fontSize: "16px" }}> 合计：</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "16px" }}>{totalJingzhong.toFixed(1)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell sx={{ fontWeight: 700, fontSize: "16px" }}> {totalAmount.toFixed(1)}</TableCell>
                </TableRow>
              </TableFooter>
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
          <h3>归档数据</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <TextField
              label="开始时间"
              type="datetime-local"
              size="small"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="结束时间"
              type="datetime-local"
              size="small"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </div>
          <TableContainer
            component={Paper} sx={{
              boxShadow: 1,
              flex: 1,
              minHeight: 0,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "#f5f5f5" }}>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单据号</TableCell>
                  <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>时间</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>物品</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>毛重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>皮重</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>净重</TableCell>
                  <TableCell sx={{ width: '8%', whiteSpace: "nowrap", textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单位</TableCell>
                  <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>单价</TableCell>
                  <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredArchived.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "15px" }}>{r.id}</TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "15px" }}>{r.time}</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="item"
                        value={r.item}
                        isEditing={editingArchivedCell?.id === r.id && editingArchivedCell?.field === 'item'}
                        onEdit={() => handleArchivedCellEdit(r.id, 'item', r.item)}
                        onSave={handleArchivedCellSave}
                        onCancel={handleArchivedCellCancel}
                        onChange={(val) => handleArchivedCellChangeImmediate(r.id, 'item', val)}
                        onKeyPress={handleArchivedEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="maozhong"
                        value={r.maozhong}
                        isEditing={editingArchivedCell?.id === r.id && editingArchivedCell?.field === 'maozhong'}
                        onEdit={() => handleArchivedCellEdit(r.id, 'maozhong', r.maozhong)}
                        onSave={handleArchivedCellSave}
                        onCancel={handleArchivedCellCancel}
                        onChange={(val) => handleArchivedCellChangeImmediate(r.id, 'maozhong', val)}
                        onKeyPress={handleArchivedEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="pizhong"
                        value={r.pizhong}
                        isEditing={editingArchivedCell?.id === r.id && editingArchivedCell?.field === 'pizhong'}
                        onEdit={() => handleArchivedCellEdit(r.id, 'pizhong', r.pizhong)}
                        onSave={handleArchivedCellSave}
                        onCancel={handleArchivedCellCancel}
                        onChange={(val) => handleArchivedCellChangeImmediate(r.id, 'pizhong', val)}
                        onKeyPress={handleArchivedEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "15px" }}>{r.jingzhong !== null ? r.jingzhong : ""}</TableCell>
                    <TableCell sx={{ width: '8%', whiteSpace: "nowrap", textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="unit"
                        value={r.unit}
                        isEditing={editingArchivedCell?.id === r.id && editingArchivedCell?.field === 'unit'}
                        onEdit={() => handleArchivedCellEdit(r.id, 'unit', r.unit)}
                        onSave={handleArchivedCellSave}
                        onCancel={handleArchivedCellCancel}
                        onChange={(val) => handleArchivedCellChangeImmediate(r.id, 'unit', val)}
                        onKeyPress={handleArchivedEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "15px" }}>
                      <EditableCell
                        record={r}
                        field="price"
                        value={r.price}
                        isEditing={editingArchivedCell?.id === r.id && editingArchivedCell?.field === 'price'}
                        onEdit={() => handleArchivedCellEdit(r.id, 'price', r.price)}
                        onSave={handleArchivedCellSave}
                        onCancel={handleArchivedCellCancel}
                        onChange={(val) => handleArchivedCellChangeImmediate(r.id, 'price', val)}
                        onKeyPress={handleArchivedEditKeyPress}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "15px" }}>{r.amount ? r.amount.toFixed(1) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ position: "sticky", bottom: 0, background: "#fff", zIndex: 2,}}>
                  <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, fontSize: "16px" }}> 合计：</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "16px" }}>{totalArchivedJingzhong.toFixed(1)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell sx={{ fontWeight: 700, fontSize: "16px" }}>{totalArchivedAmount.toFixed(1)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </div>
      </div>
      {/* 右侧：数字显示和操作区 */}
      <div
        style={{
          width: 300,
          padding: 15,
          borderLeft: "1px solid #eee",
          boxSizing: "border-box",
          height: "100vh",
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
            minWidth: 220,
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
            sx={{ fontSize: 20, px: 4, py: 1.5 }}
          >
            毛重
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePizhong}
            sx={{ fontSize: 20, px: 4, py: 1.5 }}
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
            label="单价 (元/千克)"
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
