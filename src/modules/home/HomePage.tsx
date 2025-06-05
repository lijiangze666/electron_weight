import React from "react";
import { Tabs, Tab, Box, Typography } from "@mui/material";

export default function HomePage() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ width: "100vw", height: "100vh" }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
        <Tab label="首页" />
        <Tab label="其他功能" />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tab === 0 && <Typography>这里是首页内容</Typography>}
        {tab === 1 && <Typography>这里是其他功能内容</Typography>}
      </Box>
    </Box>
  );
}
