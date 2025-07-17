import React, { useEffect, useState, useRef } from "react";

// 兼容 Electron 的 ipcRenderer
const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

export default function SerialDataDisplay() {
  const [serialData, setSerialData] = useState("");
  const lastWeightRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);

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

        // 只有连续3次相同才更新显示
        if (stableCountRef.current === 3) {
          setSerialData(`${weight} kg`);
        }
      }
    };

    ipcRenderer.on("serialport-data", handler);

    return () => {
      ipcRenderer.removeListener("serialport-data", handler);
    };
  }, []);

  return (
    <div>
      <h2>串口数据：</h2>
      <div style={{ fontFamily: "monospace", fontSize: 20 }}>{serialData}</div>
    </div>
  );
}