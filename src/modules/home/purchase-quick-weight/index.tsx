import React, { useEffect, useState } from "react";

// 兼容 Electron 的 ipcRenderer
const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

  export default function SerialDataDisplay() {
    const [serialData, setSerialData] = useState("");
    const [ setLastWeight] = useState<number | null>(null);
  
    useEffect(() => {
      ipcRenderer.send("open-serialport");
  
      let buffer = "";
  
      const handler = (_event: any, data: string) => {
        buffer += data;
  
        // 一次可能有多个完整帧，循环解析
        let match;
        const frameRegex = /\+([0-9A-Fa-f]{9})/g;
  
        while ((match = frameRegex.exec(buffer)) !== null) {
          const hexStr = match[1]; // 提取 9 位十六进制数字
  
          const weight = parseInt(hexStr, 16); // 十六进制转十进制
          const realWeight = parseFloat((weight / 1000).toFixed(1)); // 克 -> 千克
  
          // 仅在重量变化时更新
          setLastWeight(prev => {
            if (prev !== realWeight) {
              setSerialData(`${realWeight} kg`);
              return realWeight;
            }
            return prev;
          });
        }
  
        // 清除已处理帧前的数据，保留最后几十个字符（防止残留数据）
        if (buffer.length > 100) {
          buffer = buffer.slice(-50);
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