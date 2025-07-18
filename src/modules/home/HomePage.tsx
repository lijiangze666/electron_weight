import React from "react";
import { Tabs, Tab, Box, Typography, Paper } from "@mui/material";
import PurchaseQuickWeight from "./purchase-quick-weight";

export default function HomePage() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Paper elevation={2} sx={{ width: "100%" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          centered
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "#fff",
            minHeight: 28,
            height: 28,
            ".MuiTabs-flexContainer": {
              minHeight: 28,
              height: 28,
            },
            ".MuiTab-root": {
              minHeight: 24,
              height: 24,
              fontSize: 14,
              px: 2,
              py: 0,
              lineHeight: 1.2,
            },
          }}
        >
          <Tab label="首页" />
          <Tab label="采购快捷过磅" />
          <Tab label="其他功能" />
        </Tabs>
      </Paper>
      <Box
        sx={{
          flex: 1,
          p: 1,
          overflow: "auto",
          backgroundColor: "#f5f5f5",
        }}
      >
        {tab === 0 && (
          <Paper sx={{ p: 1, height: "100%" }}>
            <Typography variant="h5" gutterBottom>
              首页内容
            </Typography>
            {/* 这里添加首页的具体内容 */}
          </Paper>
        )}
        {tab === 1 && <PurchaseQuickWeight />}
        {tab === 2 && (
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h5" gutterBottom>
              其他功能内容
            </Typography>
            {/* 这里添加其他功能的具体内容 */}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
