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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          background: "#000",
          color: "#ff2d2d",
          fontFamily: "'DS-Digital', 'Consolas', 'monospace'",
          fontSize: 48,
          padding: "16px 32px",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          letterSpacing: 2,
          border: "2px solid #222",
          zIndex: 1000,
          minWidth: 180,
          textAlign: "center",
          userSelect: "none"
        }}
      >
        {serialData}
      </div>
    </div>
  );
}