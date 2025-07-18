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

  // 点击皮重，自动计算金额
  const handlePizhong = () => {
    if (isStable && serialData && records.length > 0 && selectedId) {
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
            return { ...row, pizhong, jingzhong, amount };
          }
          return row;
        })
      );
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
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
      {/* 左侧：记录表格 */}
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <h2>过磅记录</h2>
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
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: "#f5f5f5" }}>
                <TableCell>单据号</TableCell>
                <TableCell>时间</TableCell>
                <TableCell>物品</TableCell>
                <TableCell>毛重(kg)</TableCell>
                <TableCell>皮重(kg)</TableCell>
                <TableCell>净重(kg)</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>单价(元/kg)</TableCell>
                <TableCell>金额</TableCell>
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
                >
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell>{r.maozhong !== null ? r.maozhong : ""}</TableCell>
                  <TableCell>{r.pizhong !== null ? r.pizhong : ""}</TableCell>
                  <TableCell>
                    {r.jingzhong !== null ? r.jingzhong : ""}
                  </TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>{r.price !== null ? r.price : ""}</TableCell>
                  <TableCell>{r.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      {/* 右侧：数字显示和操作区 */}
      <div style={{ width: 400, padding: 24, borderLeft: "1px solid #eee" }}>
        <div
          style={{
            background: "#000",
            color: isStable ? "#00e676" : "#ff2d2d", // 稳定时高亮绿色，否则红色
            fontWeight: isStable ? 900 : 400, // 稳定时加粗
            fontFamily:
              "'Share Tech Mono', 'Orbitron', 'Consolas', 'monospace'",
            fontSize: 72,
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
