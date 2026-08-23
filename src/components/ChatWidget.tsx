/**
 * 客服对话组件
 */

import {
  CloseOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  MessageOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { Button, Input, Space } from "antd";
import { useEffect, useRef, useState } from "react";
import { chatStream } from "../services/docs-seeker";
import type { ChatMessage } from "../types";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString("zh-CN"),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // 创建一个空的 agent message 用于流式显示
    const agentMessageId = Date.now() + 1;
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      sender: "agent",
      content: "",
      timestamp: new Date().toLocaleTimeString("zh-CN"),
    };

    setMessages((prev) => [...prev, agentMessage]);

    // 调用 docs-seeker 问答接口（一次性返回完整回答，非流式）
    await chatStream(
      question,
      (token: string) => {
        // 实时更新消息内容
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? { ...msg, content: msg.content + token }
              : msg,
          ),
        );
      },
      () => {
        // 完成
        setIsLoading(false);
      },
      (error: Error) => {
        // 错误处理
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId
              ? { ...msg, content: `抱歉，系统出现错误：${error.message}` }
              : msg,
          ),
        );
      },
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<MessageOutlined />}
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 380,
        height: isMinimized ? 48 : 500,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#1890ff",
          color: "#fff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Space>
          <MessageOutlined />
          <span style={{ fontWeight: "bold" }}>在线客服</span>
        </Space>
        <Space>
          <Button
            type="text"
            icon={isMinimized ? <FullscreenOutlined /> : <MinusOutlined />}
            style={{ color: "#fff", padding: 4 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            style={{ color: "#fff", padding: 4 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setIsMinimized(false);
            }}
          />
        </Space>
      </div>

      {!isMinimized && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              flex: 1,
              padding: 16,
              overflowY: "auto",
              background: "#f5f5f5",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#999",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <MessageOutlined
                    style={{ fontSize: 48, marginBottom: 8, opacity: 0.5 }}
                  />
                  <p>您好，有什么可以帮您？</p>
                </div>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        msg.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: msg.sender === "user" ? "#1890ff" : "#fff",
                        color: msg.sender === "user" ? "#fff" : "#333",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <p style={{ margin: 0, wordBreak: "break-word" }}>
                        {msg.content}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 10,
                          opacity: 0.6,
                          textAlign: "right",
                        }}
                      >
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </Space>
            )}
          </div>

          <div
            style={{
              padding: 12,
              borderTop: "1px solid #f0f0f0",
              background: "#fff",
            }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleKeyPress}
              placeholder="输入消息..."
              style={{ marginBottom: 8 }}
              allowClear
              disabled={isLoading}
            />
            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              <Button onClick={handleSend} type="primary" disabled={isLoading}>
                {isLoading ? <LoadingOutlined /> : "发送"}
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
