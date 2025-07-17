import React, { useEffect, useState, useRef } from "react";
import Button from '@mui/material/Button';

const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

interface RecordItem {
  id: string;
  time: string;
  supplier: string;
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
  const [maozhong, setMaozhong] = useState<number | null>(null);
  const [pizhong, setPizhong] = useState<number | null>(null);
  const [supplier, setSupplier] = useState("");
  const [item, setItem] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);

  useEffect(() => {
    ipcRenderer.send("open-serialport");

    const handler = (_event: any, data: string) => {
      const match = data.match(/[+-]?\d+/);
      if (match) {
        const weight = Math.floor(parseInt(match[0], 10) / 1000);
        if (lastWeightRef.current === weight) {
          stableCountRef.current += 1;
        } else {
          stableCountRef.current = 1;
          lastWeightRef.current = weight;
        }
        // 连续3次相同才算稳定
        if (stableCountRef.current >= 3) {
          setSerialData(`${weight}`);
          setIsStable(true);
        } else {
          setIsStable(false);
        }
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

  // 点击毛重
  const handleMaozhong = () => {
    if (isStable && serialData) {
      setMaozhong(Number(serialData));
    }
  };

  // 点击皮重并保存记录
  const handlePizhong = () => {
    if (isStable && serialData) {
      const pz = Number(serialData);
      setPizhong(pz);
      if (maozhong !== null) {
        const jz = maozhong - pz;
        const amount = jz * 1; // 金额可自定义
        setRecords([
          ...records,
          {
            id: genId(),
            time: getTime(),
            supplier,
            item,
            maozhong,
            pizhong: pz,
            jingzhong: jz,
            unit: "斤",
            amount,
          },
        ]);
        setMaozhong(null);
        setPizhong(null);
      }
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 左侧：记录表格 */}
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <h2>过磅记录</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th>单据号</th>
              <th>时间</th>
              <th>供应商</th>
              <th>物品</th>
              <th>毛重</th>
              <th>皮重</th>
              <th>净重</th>
              <th>单位</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.time}</td>
                <td>{r.supplier}</td>
                <td>{r.item}</td>
                <td>{r.maozhong}</td>
                <td>{r.pizhong}</td>
                <td>{r.jingzhong}</td>
                <td>{r.unit}</td>
                <td>{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 右侧：数字显示和操作区 */}
      <div style={{ width: 400, padding: 24, borderLeft: "1px solid #eee" }}>
        <div
          style={{
            background: "#000",
            color: "#ff2d2d",
            fontFamily: "'Share Tech Mono', 'Orbitron', 'Consolas', 'monospace'",
            fontSize: 72, // 字体更大
            padding: "8px 32px", // 上下内边距减小
            borderRadius: 12,
            textAlign: "center",
            marginBottom: 24,
            letterSpacing: 2,
            border: "2px solid #222",
            minWidth: 180,
            userSelect: "none"
          }}
        >
          {serialData}
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleMaozhong}
            disabled={!isStable}
            sx={{ fontSize: 20, px: 4, py: 1.5 }}
          >
            毛重
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePizhong}
            disabled={!isStable || maozhong === null}
            sx={{ fontSize: 20, px: 4, py: 1.5 }}
          >
            皮重
          </Button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <input placeholder="供应商名称" value={supplier} onChange={e => setSupplier(e.target.value)} style={{ width: "100%", fontSize: 18, padding: 8 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input placeholder="物品信息" value={item} onChange={e => setItem(e.target.value)} style={{ width: "100%", fontSize: 18, padding: 8 }} />
        </div>
        <div style={{ color: '#888', fontSize: 16 }}>
          {maozhong !== null && <div>已记录毛重：{maozhong}</div>}
          {pizhong !== null && <div>已记录皮重：{pizhong}</div>}
        </div>
      </div>
    </div>
  );
}