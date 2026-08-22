/**
 * doc-kit 文档上传面板（可复用）
 * 负责：服务探活 → PDF 校验 → uploadAndIngest 提交 → task_id 轮询 → Steps 推进
 *
 * 组件特性：
 *  - beforeUpload：只接受 .pdf、单文件 ≤ 100MB
 *  - 去重：按 lastModified+size+name 生成 key，同文件不允许连续点两次
 *  - 并发控制：同一时刻只允许一个任务（submitting 锁 + submittedRef Map）
 *  - 卸载清理：路由切走时停止轮询 + 重置 submitting 锁，避免回来时按钮仍禁用
 *
 * 对外暴露（通过 ref）：
 *  - reloadHealth()  手动重新探活（给外层 Collapse/Header 的"重新探活"按钮调用）
 *  - healthLoading   当前是否正在探活（外层按钮用它做 loading 态）
 *  - health          最近一次探活结果（外层展示"原文 N 段/摘要 N 段"Tag）
 */
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  Card,
  Descriptions,
  Divider,
  message,
  Spin,
  Steps,
  Tag,
  Upload,
} from "antd";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  DocKitHealthData,
  IngestStatusData,
  IngestStepKey,
} from "../services/doc-kit";
import {
  getDocKitHealth,
  getIngestStatus,
  INGEST_STEP_LABELS,
  uploadAndIngest,
} from "../services/doc-kit";

export interface DocKitUploadPanelRef {
  /** 让外层手动重新探活，返回探活是否成功（便于外层按钮 toast） */
  reloadHealth: () => Promise<boolean>;
  /** 是否正在探活（外层按钮展示 loading 用） */
  readonly healthLoading: boolean;
  /** 最近一次探活结果（外层展示 Milvus 统计 Tag 用） */
  readonly health: DocKitHealthData | null;
  /** 最近一次探活是否判定服务不可用（外层展示 Tag 颜色用） */
  readonly healthDown: boolean;
}

/** 任务完成（成功/失败/超时）时的回调，外层用于刷新列表 */
export type DocKitUploadPanelProps = {
  onTaskComplete?: (status: "success" | "error" | "timeout") => void;
};

// ---- 异步 ingest 任务阶段参数 ----
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TIMES = 60; // 2 分钟兜底
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPT_EXTS = [".pdf"];

/**
 * 根据任务状态 + 轮询 tick 推断 Steps 阶段
 * summarizing 阶段后端无独立 signal：摘要计数 > 0 的前 2 tick 短暂展示（约 4s）
 */
function resolveCurrentStep(
  s: IngestStatusData | null,
  pollCount: number = 0,
): IngestStepKey {
  if (!s) return "queued";
  if (s.status === "error") return "error";
  if (s.status === "success") return "done";
  if (s.status === "queued") return "queued";
  const chunks = typeof s.chunks_count === "number" ? s.chunks_count : 0;
  const summaries = typeof s.summary_count === "number" ? s.summary_count : 0;
  if (chunks === 0 && summaries === 0) return "parsing";
  if (summaries === 0) return "chunking_embedding";
  if (pollCount <= 2) return "summarizing";
  return "storing";
}

const DocKitUploadPanel = forwardRef<DocKitUploadPanelRef, DocKitUploadPanelProps>(
  function DocKitUploadPanel({ onTaskComplete }, ref) {
    const [healthLoading, setHealthLoading] = useState(true);
    const [health, setHealth] = useState<DocKitHealthData | null>(null);
    const [healthDown, setHealthDown] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState(false);
    const [statusData, setStatusData] = useState<IngestStatusData | null>(null);
    const [stepError, setStepError] = useState<string | null>(null);
    // 去重记录：fileKey -> task_id / 'in_progress'
    const submittedRef = useRef<Map<string, string>>(new Map());
    // 当前任务的 fileKey（轮询回调里需要用它清理 submittedRef，避免用 taskId 误删）
    const currentFileKeyRef = useRef<string | null>(null);
    const pollTimerRef = useRef<number | null>(null);
    const pollCountRef = useRef(0);

    // 探活统一入口：内部 state 管理，返回是否判定为"服务可用"
    const runHealthCheck = async (): Promise<boolean> => {
      setHealthLoading(true);
      try {
        const r = await getDocKitHealth();
        const ok = !!r.success && (r.data as any)?.status === "ok";
        setHealthDown(!ok);
        setHealth((r.data as DocKitHealthData) ?? null);
        return ok;
      } catch (err) {
        setHealthDown(true);
        setHealth(null);
        console.error("doc-kit 探活失败", err);
        return false;
      } finally {
        setHealthLoading(false);
      }
    };

    // 对外暴露：外层 Collapse Title 旁的"重新探活"按钮调用
    useImperativeHandle(
      ref,
      () => ({
        reloadHealth: runHealthCheck,
        get healthLoading() {
          return healthLoading;
        },
        get health() {
          return health;
        },
        get healthDown() {
          return healthDown;
        },
      }),
      // 关闭 exhaustive-deps：getter 每次访问会拿到最新 state，无需把 state 加到依赖
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const stopPoll = () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // 统一清理：用 fileKey 删 submittedRef，避免用 taskId 误删（Map key 是 fileKey 不是 taskId）
    const cleanupSubmitted = () => {
      const fk = currentFileKeyRef.current;
      if (fk) {
        submittedRef.current.delete(fk);
        currentFileKeyRef.current = null;
      }
    };

    const startPoll = (taskId: string) => {
      stopPoll();
      pollCountRef.current = 0;
      const tick = async () => {
        pollCountRef.current += 1;
        try {
          const r = await getIngestStatus(taskId);
          if (r.success && r.data) {
            const d = r.data as IngestStatusData;
            setStatusData(d);
            if (d.status === "success") {
              stopPoll();
              message.success(
                `入库完成：原文 ${d.chunks_count ?? 0} 段，摘要 ${d.summary_count ?? 0} 段`,
              );
              cleanupSubmitted();
              setSubmitting(false);
              onTaskComplete?.("success");
              return;
            }
            if (d.status === "error") {
              stopPoll();
              const err = d.error ?? "未知错误";
              setStepError(err);
              message.error(`入库失败：${err}`);
              cleanupSubmitted();
              setSubmitting(false);
              onTaskComplete?.("error");
              return;
            }
            if (pollCountRef.current >= POLL_MAX_TIMES) {
              stopPoll();
              setStepError("任务超时（超过 2 分钟仍在运行）");
              message.warning("任务仍在后台处理，稍后可在列表页查看结果");
              cleanupSubmitted();
              setSubmitting(false);
              onTaskComplete?.("timeout");
              return;
            }
          } else if (r.status === 404 || r.code === 404) {
            stopPoll();
            setStepError(r.msg ?? "任务不存在");
            message.error(r.msg ?? "任务不存在");
            cleanupSubmitted();
            setSubmitting(false);
            return;
          } else {
            setStepError(r.msg ?? "状态查询失败");
          }
        } catch (err) {
          console.warn("doc-kit 轮询状态异常", err);
        }
      };
      void tick();
      pollTimerRef.current = window.setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    };

    // 挂载时探活一次 + 卸载时清理 submitting 锁 & 轮询
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const ok = await runHealthCheck();
        if (cancelled) return;
        void ok; // 探活结果已经写入内部 state，外层通过 ref.health 读取
      })();
      return () => {
        cancelled = true;
        stopPoll();
        setSubmitting(false);
        submittedRef.current.clear();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fileKey = (file: File): string =>
      `${file.name}::${file.size}::${file.lastModified}`;

    const beforeUpload: UploadProps["beforeUpload"] = (file) => {
      if (healthDown) {
        message.error("doc-kit 服务不可用，请稍后再试");
        return Upload.LIST_IGNORE;
      }
      const name = file.name ?? "";
      const extOk = ACCEPT_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
      if (!extOk) {
        message.error("仅支持 PDF 文件");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_FILE_SIZE) {
        message.error("文件超过 100MB 上限");
        return Upload.LIST_IGNORE;
      }
      const key = fileKey(file as File);
      if (submittedRef.current.has(key)) {
        message.warning("该文件已在上传队列中，请稍候");
        return Upload.LIST_IGNORE;
      }
      return true;
    };

    const customRequest: UploadProps["customRequest"] = async (options) => {
      const file = options.file as File;
      const key = fileKey(file);
      if (submitting) {
        message.warning("当前已有任务处理中，请勿重复提交");
        options.onError?.(new Error("submitting"));
        return;
      }
      submittedRef.current.set(key, "in_progress");
      setSubmitting(true);
      setStatusData(null);
      setStepError(null);
      try {
        const r = await uploadAndIngest(file);
        if (!r.success || !r.data) {
          const err = r.msg ?? r.message ?? "提交失败";
          throw new Error(err);
        }
        const data = r.data as any;
        const taskId = String(data.task_id ?? "");
        if (!taskId) throw new Error("服务未返回 task_id");
        submittedRef.current.set(key, taskId);
        currentFileKeyRef.current = key; // 保存当前 fileKey 供轮询回调清理用
        message.info(`任务已提交（${taskId}），正在处理...`);
        setStatusData({
          task_id: taskId,
          filename: file.name,
          status: "queued",
        });
        startPoll(taskId);
        options.onSuccess?.(data);
      } catch (err) {
        submittedRef.current.delete(key);
        currentFileKeyRef.current = null;
        const msg = err instanceof Error ? err.message : "上传失败";
        setStepError(msg);
        setSubmitting(false);
        message.error(msg);
        options.onError?.(err instanceof Error ? err : new Error(msg));
      }
    };

    const currentStepKey = resolveCurrentStep(statusData, pollCountRef.current);
    const currentIndex = (() => {
      if (currentStepKey === "error") return 4;
      if (currentStepKey === "queued" || currentStepKey === "parsing") return 0;
      if (currentStepKey === "chunking_embedding") return 1;
      if (currentStepKey === "summarizing") return 2;
      if (currentStepKey === "storing") return 3;
      return 4;
    })();
    const stepStatus: Parameters<typeof Steps>[0]["status"] =
      currentStepKey === "error"
        ? "error"
        : currentStepKey === "done"
          ? "finish"
          : "process";

    const draggerProps: UploadProps = {
      name: "file",
      multiple: false,
      accept: ".pdf",
      maxCount: 1,
      disabled: healthDown || submitting,
      beforeUpload,
      customRequest,
      showUploadList: false,
    };

    return (
      <Card>
        <Spin spinning={healthLoading} tip="检测 doc-kit 服务状态...">
          <Upload.Dragger {...draggerProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              点击或拖拽 PDF 文件到此区域上传并入库
            </p>
            <p className="ant-upload-hint">
              仅支持 .pdf，单文件上限
              100MB。上传后自动解析、分块、向量化、摘要生成并入库 Milvus。
            </p>
            {healthDown ? (
              <p style={{ color: "#ff4d4f", marginTop: 8 }}>
                doc-kit 服务暂不可用，请稍后重试或联系运维
              </p>
            ) : null}
          </Upload.Dragger>
        </Spin>

        <Divider style={{ margin: "16px 0" }} />

        <Steps
          current={currentIndex}
          status={stepStatus}
          size="small"
          items={[
            { title: INGEST_STEP_LABELS.parsing },
            { title: INGEST_STEP_LABELS.chunking_embedding },
            { title: INGEST_STEP_LABELS.summarizing },
            { title: INGEST_STEP_LABELS.storing },
            { title: INGEST_STEP_LABELS.done },
          ]}
        />

        {statusData || stepError ? (
          <Descriptions
            size="small"
            column={1}
            style={{ marginTop: 12 }}
            labelStyle={{ width: 120, color: "#888" }}
          >
            {statusData?.task_id ? (
              <Descriptions.Item label="任务 ID">
                <Tag color="blue">{statusData.task_id}</Tag>
              </Descriptions.Item>
            ) : null}
            {statusData?.filename ? (
              <Descriptions.Item label="文件名">
                {statusData.filename}
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label="状态">
              <Tag
                color={
                  statusData?.status === "success"
                    ? "green"
                    : statusData?.status === "error" || stepError
                      ? "red"
                      : statusData?.status === "queued"
                        ? "gold"
                        : "blue"
                }
              >
                {INGEST_STEP_LABELS[currentStepKey]}
              </Tag>
            </Descriptions.Item>
            {statusData?.collection ? (
              <Descriptions.Item label="原文集合">
                {statusData.collection}
              </Descriptions.Item>
            ) : null}
            {statusData?.summary_collection ? (
              <Descriptions.Item label="摘要集合">
                {statusData.summary_collection}
              </Descriptions.Item>
            ) : null}
            {typeof statusData?.chunks_count === "number" ? (
              <Descriptions.Item label="原文分块">
                {statusData.chunks_count} 段
              </Descriptions.Item>
            ) : null}
            {typeof statusData?.summary_count === "number" ? (
              <Descriptions.Item label="摘要块数">
                {statusData.summary_count} 段
              </Descriptions.Item>
            ) : null}
            {stepError ? (
              <Descriptions.Item
                label="错误原因"
                contentStyle={{ color: "#ff4d4f" }}
              >
                {stepError}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
      </Card>
    );
  },
);

export default DocKitUploadPanel;
