import React from "react";
import { Tabs, Tab, Box, Paper } from "@mui/material";
import PurchaseQuickWeight from "./purchase-quick-weight";
import SalesSystem from "./sales-system";
import SystemSettings from "./system-settings";
import HomeMain from "./home-main";

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
            minHeight: 56,
            height: 56,
            boxShadow: 2,
            borderRadius: 3,
            mx: 4,
            mt: 2,
            ".MuiTabs-flexContainer": {
              minHeight: 56,
              height: 56,
            },
            ".MuiTab-root": {
              minHeight: 48,
              height: 48,
              fontSize: 18,
              px: 4,
              py: 0,
              lineHeight: 1.5,
              fontWeight: 700,
              borderRadius: 2,
              mx: 1,
              transition: 'background 0.2s, color 0.2s',
              '&.Mui-selected': {
                color: '#1976d2',
                background: 'linear-gradient(90deg, #e3eafc 0%, #fff 100%)',
                boxShadow: '0 2px 8px 0 #b3c6e0',
              },
              '&:hover': {
                background: '#f5f7fa',
                color: '#1976d2',
              },
            },
          }}
        >
          <Tab label="首页" />
          <Tab label="采购快捷过磅" />
          <Tab label="销售系统" />
          <Tab label="系统设置" />
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
        {tab === 0 && <HomeMain onNavigate={setTab} />}
        {tab === 1 && <PurchaseQuickWeight />}
        {tab === 2 && <SalesSystem />}
        {tab === 3 && <SystemSettings />}
      </Box>
    </Box>
  );
}
