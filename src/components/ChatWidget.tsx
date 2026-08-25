/**
 * 客服对话组件
 */

import {
  CloseOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  MessageOutlined,
  MinusOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Input, Space, theme } from "antd";
import { useEffect, useRef, useState } from "react";
import { chatStream, getTopQuestions } from "../services/docs-seeker";
import type { UsageTopQuestion } from "../services/docs-seeker";
import type { ChatMessage } from "../types";

// 默认角色信息：给对话加上默认头像和名称，让对话更真实
const AGENT_NAME = "智能助手";
const USER_NAME = "我";
const WELCOME_CONTENT =
  "您好！我是智能助手，很高兴为您服务。请问有什么可以帮您？";

function ChatWidget() {
  const { token } = theme.useToken();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 0,
      sender: "agent",
      content: WELCOME_CONTENT,
      timestamp: new Date().toLocaleTimeString("zh-CN"),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topQuestions, setTopQuestions] = useState<UsageTopQuestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // 打开时拉取热门问题（默认问题：取 Top10 中的前 3 个）
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const r = await getTopQuestions(10);
      if (!cancelled && r.success && r.data) {
        setTopQuestions(r.data.questions.slice(0, 3));
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

  // 用户是否已经发过消息：未发过时展示默认问题（Top3）快捷按钮
  const hasUserSent = messages.some((msg) => msg.sender === "user");

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
          <Avatar
            size={26}
            icon={<RobotOutlined />}
            style={{ background: "rgba(255, 255, 255, 0.25)" }}
          />
          <span style={{ fontWeight: "bold" }}>{AGENT_NAME}</span>
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
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      gap: 8,
                    }}
                  >
                    {!isUser && (
                      <Avatar
                        size={34}
                        icon={<RobotOutlined />}
                        style={{
                          flexShrink: 0,
                          background: token.colorPrimary,
                          marginTop: 2,
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        maxWidth: "78%",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          margin: "0 4px 4px",
                        }}
                      >
                        {isUser ? USER_NAME : AGENT_NAME}
                      </span>
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: isUser
                            ? "8px 2px 8px 8px"
                            : "2px 8px 8px 8px",
                          background: isUser
                            ? token.colorPrimary
                            : token.colorBgContainer,
                          color: isUser
                            ? token.colorTextLightSolid
                            : token.colorText,
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.content || (
                          <span style={{ color: token.colorTextTertiary }}>
                            正在输入…
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.6,
                          margin: "4px 4px 0",
                        }}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                    {isUser && (
                      <Avatar
                        size={34}
                        icon={<UserOutlined />}
                        style={{
                          flexShrink: 0,
                          background: token.colorPrimary,
                          marginTop: 2,
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* 默认问题：用户还未提问时展示 Top3 快捷按钮 */}
              {!hasUserSent && topQuestions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Avatar
                    size={34}
                    icon={<RobotOutlined />}
                    style={{
                      flexShrink: 0,
                      background: token.colorPrimary,
                      marginTop: 2,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      maxWidth: "78%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: token.colorTextSecondary,
                        margin: "0 4px 4px",
                      }}
                    >
                      {AGENT_NAME}
                    </span>
                    <div
                      style={{
                        fontSize: 12,
                        color: token.colorTextSecondary,
                        margin: "0 4px 8px",
                      }}
                    >
                      大家都在问：
                    </div>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      {topQuestions.map((tq) => (
                        <Button
                          key={tq.question}
                          size="small"
                          onClick={() => void handleSend(tq.question)}
                          style={{
                            textAlign: "left",
                            whiteSpace: "normal",
                            height: "auto",
                            padding: "6px 12px",
                            borderRadius: 16,
                          }}
                        >
                          {tq.question}
                        </Button>
                      ))}
                    </Space>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </Space>
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
