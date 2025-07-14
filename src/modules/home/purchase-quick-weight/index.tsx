import React, { useEffect, useState } from "react";

// 兼容 Electron 的 ipcRenderer
const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

export default function SerialDataDisplay() {
  const [serialData, setSerialData] = useState("");

  useEffect(() => {
    ipcRenderer.send("open-serialport");
  }, []);

  return (
    <div>
      <h2>串口数据：</h2>
      <div style={{ fontFamily: "monospace", fontSize: 20 }}>{serialData}</div>
    </div>
  );
}
