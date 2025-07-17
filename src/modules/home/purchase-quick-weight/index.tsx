import React, { useEffect, useState, useRef } from "react";
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

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
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0") + " " +
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":" +
      String(d.getSeconds()).padStart(2, "0");
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
        unit: "斤",
        amount: 0,
      },
    ]);
  };

  // 删除选中（最后一条）
  const handleDelete = () => {
    setRecords(records.slice(0, -1));
  };

  // 点击毛重，填充到最新一条数据的毛重字段
  const handleMaozhong = () => {
    if (isStable && serialData && records.length > 0) {
      const weight = Number(serialData);
      setRecords(prev => {
        const newRecords = [...prev];
        const last = newRecords[newRecords.length - 1];
        if (last) {
          last.maozhong = weight;
        }
        return newRecords;
      });
    }
  };

  // 点击皮重，填充到最新一条数据的皮重字段并计算净重和金额
  const handlePizhong = () => {
    if (isStable && serialData && records.length > 0) {
      const weight = Number(serialData);
      setRecords(prev => {
        const newRecords = [...prev];
        const last = newRecords[newRecords.length - 1];
        if (last && last.maozhong !== null) {
          if (weight >= last.maozhong) {
            setError("皮重不能大于等于毛重！");
            setOpen(true);
            return prev; // 不更新
          }
          last.pizhong = weight;
          last.jingzhong = last.maozhong - last.pizhong;
          last.amount = last.jingzhong * 1; // 金额可自定义
        }
        return newRecords;
      });
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 错误提示 */}
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setOpen(false)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      {/* 左侧：记录表格 */}
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <h2>过磅记录</h2>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Button variant="contained" color="primary" onClick={handleAdd}>新增</Button>
          <Button variant="outlined" color="error" onClick={handleDelete} disabled={records.length === 0}>删除</Button>
        </div>
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#f5f5f5' }}>
                <TableCell>单据号</TableCell>
                <TableCell>时间</TableCell>
                <TableCell>物品</TableCell>
                <TableCell>毛重</TableCell>
                <TableCell>皮重</TableCell>
                <TableCell>净重</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>金额</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell>{r.maozhong !== null ? r.maozhong  : ""}</TableCell>
                  <TableCell>{r.pizhong !== null ? r.pizhong  : ""}</TableCell>
                  <TableCell>{r.jingzhong !== null ? r.jingzhong  : ""}</TableCell>
                  <TableCell>{r.unit}</TableCell>
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
            color: "#ff2d2d",
            fontFamily: "'Share Tech Mono', 'Orbitron', 'Consolas', 'monospace'",
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
            justifyContent: "center"
          }}
        >
          {serialData || <span style={{ opacity: 0.3 }}>--</span>}
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
    </div>
  );
}