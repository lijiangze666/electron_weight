import React, { useEffect, useState } from "react";

// 兼容 Electron 的 ipcRenderer
const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

  export default function SerialDataDisplay() {
    const [serialData, setSerialData] = useState("");
    const [lastWeight, setLastWeight] = useState<number | null>(null);
  
    useEffect(() => {
      ipcRenderer.send("open-serialport");
  
      let buffer = "";
  
      const handler = (_event: any, data: string) => {
        const match = data.match(/[+-]?\d+/);
        if (match) {
          const weight = Math.floor(parseInt(match[0], 10) / 1000);
          setSerialData(`${weight} kg`);
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