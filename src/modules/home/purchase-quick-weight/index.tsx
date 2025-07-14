import React, { useEffect, useState } from "react";

// 兼容 Electron 的 ipcRenderer
const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

export default function SerialDataDisplay() {
  const [serialData, setSerialData] = useState("");

  useEffect(() => {
    ipcRenderer.send("open-serialport");

    const handler = (_event: any, data: any) => {
      const hexStr = data.replace(/[^0-9A-Fa-f]/g, "");
      const weight = parseInt(hexStr, 16);
      // 假设1位=0.1kg
      const realWeight = isNaN(weight) ? data : (weight / 10).toFixed(1);
      setSerialData(isNaN(weight) ? data : `${realWeight} kg`);
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
