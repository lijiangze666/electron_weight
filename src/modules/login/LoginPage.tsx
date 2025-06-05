// src/modules/login/LoginPage.tsx
import React, { useState } from "react";
import { Button, Input, Form, Radio } from "antd";
import Typography from "antd/es/typography";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [selectedRoute, setSelectedRoute] = useState(1);
  const navigate = useNavigate();

  const handleFinish = (values: any) => {
    // 登录逻辑
    console.log(`登录：${values.username}`);
    // 登录成功后跳转到Home页面
    navigate('/home');
  };

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh",
      width: "1000px",
      margin: "0 auto",
      overflow: "hidden",
      boxShadow: "0 0 10px rgba(0,0,0,0.1)"
    }}>
      {/* 左侧介绍区 */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
        }}
      >
        <div>
          <Typography.Title level={3} style={{ color: "#fff" }}>
            欢迎使用
          </Typography.Title>
          <Typography.Title level={1} style={{ color: "#fff" }}>
            智慧磅
          </Typography.Title>
          <Typography.Paragraph>
            核心功能为连接地磅、支持视频拍照、智能管理进销存业务，
            <br />
            帮助企业实现智能化管理新模式
          </Typography.Paragraph>
        </div>
        <div>
          <img
            src=""
            alt="logo"
            style={{
              width: 64,
              borderRadius: 8,
              background: "#fff",
              padding: 8,
            }}
          />
          <div style={{ marginTop: 8 }}>
            <div>您身边的过磅管理专家</div>
          </div>
        </div>
      </div>
      {/* 右侧登录区 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div
          style={{
            minWidth: 350,
            width: 400,
            padding: 32,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 2px 8px #f0f1f2",
          }}
        >
          <Typography.Title level={3} style={{ textAlign: "center" }}>
            用户登录
          </Typography.Title>
          <Form layout="vertical" onFinish={handleFinish}>
            <Form.Item
              name="username"
              rules={[{ required: true, message: "请输入手机号" }]}
            >
              <Input placeholder="手机号" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                登录
              </Button>
            </Form.Item>
            <Form.Item>
              <Radio.Group
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <Radio value={1}>线路1</Radio>
                <Radio value={2}>线路2</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
            <a href="#">申请注册</a>
            <span>|</span>
            <a href="#">忘记密码</a>
          </div>
          <div
            style={{
              marginTop: 32,
              color: "#aaa",
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
