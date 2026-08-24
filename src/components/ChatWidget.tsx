/**
 * 客服对话组件
 */

import {
  CloseOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  MessageOutlined,
  MinusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Input, Space, theme } from "antd";
import { useEffect, useRef, useState } from "react";
import { chatStream, getTopQuestions } from "../services/docs-seeker";
import type { UsageTopQuestion } from "../services/docs-seeker";
import type { ChatMessage } from "../types";

function ChatWidget() {
  const { token } = theme.useToken();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topQuestions, setTopQuestions] = useState<UsageTopQuestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // 打开时拉取热门问题（欢迎语快捷按钮）
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const r = await getTopQuestions(6);
      if (!cancelled && r.success && r.data) {
        setTopQuestions(r.data.questions);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSend = async (questionText?: string) => {
    const question = (questionText ?? inputValue).trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString("zh-CN"),
    };

    setMessages((prev) => [...prev, userMessage]);
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
        width: 456,
        height: isMinimized ? 58 : 600,
        background: token.colorBgContainer,
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
          background: token.colorPrimary,
          color: token.colorTextLightSolid,
          padding: "9px 16px",
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
            size="small"
            icon={isMinimized ? <FullscreenOutlined /> : <MinusOutlined />}
            style={{ color: token.colorTextLightSolid, padding: 4 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            style={{ color: token.colorTextLightSolid, padding: 4 }}
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
            className="chat-widget-scroll"
            style={{
              flex: 1,
              padding: 16,
              overflowY: "scroll",
              background: token.colorBgLayout,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: token.colorTextTertiary,
                }}
              >
                <div style={{ textAlign: "center", width: "100%" }}>
                  <MessageOutlined
                    style={{ fontSize: 48, marginBottom: 8, opacity: 0.5 }}
                  />
                  <p>您好，有什么可以帮您？</p>
                  {topQuestions.length > 0 && (
                    <div style={{ marginTop: 12, padding: "0 12px" }}>
                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        大家都在问：
                      </div>
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        {topQuestions.map((tq) => (
                          <Button
                            key={tq.question}
                            size="small"
                            block
                            onClick={() => void handleSend(tq.question)}
                            style={{
                              textAlign: "left",
                              whiteSpace: "normal",
                              height: "auto",
                              padding: "6px 12px",
                            }}
                          >
                            {tq.question}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  )}
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
                        background:
                          msg.sender === "user"
                            ? token.colorPrimary
                            : token.colorBgContainer,
                        color:
                          msg.sender === "user"
                            ? token.colorTextLightSolid
                            : token.colorText,
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
              borderTop: `1px solid ${token.colorSplit}`,
              background: token.colorBgContainer,
            }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleKeyPress}
              placeholder="输入消息..."
              disabled={isLoading}
              suffix={
                <span
                  onClick={() => void handleSend()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    cursor: isLoading ? "default" : "pointer",
                    color: isLoading
                      ? token.colorTextDisabled
                      : token.colorPrimary,
                  }}
                >
                  {isLoading ? (
                    <LoadingOutlined style={{ fontSize: 14 }} />
                  ) : (
                    <SendOutlined style={{ fontSize: 14 }} />
                  )}
                </span>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
