import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../modules/login/LoginPage";
import HomePage from "../modules/home/HomePage";

export default function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home/*" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
