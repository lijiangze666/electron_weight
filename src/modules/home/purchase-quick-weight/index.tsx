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
      // 去除空格等非十六进制字符
      const hexStr = data.replace(/[^0-9A-Fa-f]/g, "");
      const weight = parseInt(hexStr, 16);

      let display = "";
      if (isNaN(weight)) {
        display = data;
      } else {
        // 假设单位是克，换算成千克显示，保留1位小数
        display = `${(weight / 1000).toFixed(1)} kg`;
      }

      // 只有数据变化时才更新
      setSerialData(prev => (prev === display ? prev : display));
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
