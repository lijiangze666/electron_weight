import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
} from "@mui/material";

// 定义表格数据的类型
interface WeightRecord {
  id: number;
  supplier: string; // 供应商
  material: string; // 物料
  vehicleNo: string; // 车牌号
  grossWeight: number; // 毛重
  tareWeight: number; // 皮重
  netWeight: number; // 净重
  weightTime: string; // 过磅时间
  status: string; // 状态
}

// 模拟数据
const mockData: WeightRecord[] = [
  {
    id: 1,
    supplier: "供应商A",
    material: "钢材",
    vehicleNo: "粤B12345",
    grossWeight: 5000,
    tareWeight: 2000,
    netWeight: 3000,
    weightTime: "2024-03-20 10:30:00",
    status: "已完成",
  },
  {
    id: 2,
    supplier: "供应商B",
    material: "水泥",
    vehicleNo: "粤B67890",
    grossWeight: 8000,
    tareWeight: 3000,
    netWeight: 5000,
    weightTime: "2024-03-20 11:15:00",
    status: "进行中",
  },
  // 可以添加更多模拟数据
];

const PurchaseQuickWeight: React.FC = () => {
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 串口数据相关状态
  const [serialData, setSerialData] = useState<string>("");
  const [serialError, setSerialError] = useState<string>("");

  useEffect(() => {
    // 通过 Electron 的 ipcRenderer 请求主进程打开串口
    const { ipcRenderer } = window.require("electron");
    ipcRenderer.send("open-serialport");

    // 监听串口数据
    const onData = (event: any, data: string) => {
      setSerialData((prev) => prev + data); // 累加显示
    };
    ipcRenderer.on("serialport-data", onData);

    // 监听串口错误
    const onError = (event: any, error: string) => {
      setSerialError(error);
    };
    ipcRenderer.on("serialport-error", onError);

    // 卸载时移除监听
    return () => {
      ipcRenderer.removeListener("serialport-data", onData);
      ipcRenderer.removeListener("serialport-error", onError);
    };
  }, []);

  // 处理页码改变
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // 处理每页行数改变
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper
      sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        采购快捷过磅
      </Typography>

      {/* 串口数据展示区 */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          border: "1px solid #eee",
          borderRadius: 1,
          background: "#fafafa",
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          串口（COM3）实时数据：
        </Typography>
        <Typography
          variant="body2"
          color={serialError ? "error" : "text.secondary"}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {serialError ? `串口错误：${serialError}` : serialData || "暂无数据"}
        </Typography>
      </Box>

      {/* 表格容器 */}
      <TableContainer sx={{ flex: 1, mt: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>供应商</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>车牌号</TableCell>
              <TableCell align="right">毛重(kg)</TableCell>
              <TableCell align="right">皮重(kg)</TableCell>
              <TableCell align="right">净重(kg)</TableCell>
              <TableCell>过磅时间</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell>{row.material}</TableCell>
                  <TableCell>{row.vehicleNo}</TableCell>
                  <TableCell align="right">{row.grossWeight}</TableCell>
                  <TableCell align="right">{row.tareWeight}</TableCell>
                  <TableCell align="right">{row.netWeight}</TableCell>
                  <TableCell>{row.weightTime}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页控件 */}
      <TablePagination
        component="div"
        count={mockData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="每页行数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} 共 ${count}`
        }
      />
    </Paper>
  );
};

export default PurchaseQuickWeight;
