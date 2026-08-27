/**
 * 任务中心页面（/tasks）
 * - 长耗时操作（生成评估集 / 运行评估集）异步任务的统一入口
 * - 列表 3 秒轮询（仅当存在排队中/执行中任务时高频）
 * - 详情抽屉：入参 / 进度明细 / 结果（跳转评估集或运行）/ 错误 / 取消
 */

import {
  EyeOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  message,
  Popconfirm,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../contexts/PermissionContext';
import type { TaskItem } from '../services/core';
import {
  cancelTask,
  getUserList,
  listTasks,
  submitEvalRunTask,
  submitEvalSetGenerateTask,
} from '../services/core';

const PAGE_SIZE = 20;

const TASK_TYPE_META: Record<string, { text: string; color: string }> = {
  eval_run: { text: '运行评估集', color: 'geekblue' },
  eval_set_generate: { text: '生成评估集', color: 'purple' },
};

const TASK_STATUS_META: Record<string, { text: string; color: string }> = {
  queued: { text: '排队中', color: 'default' },
  running: { text: '执行中', color: 'processing' },
  success: { text: '成功', color: 'success' },
  failed: { text: '失败', color: 'error' },
  cancelled: { text: '已取消', color: 'warning' },
};

function formatTime(value?: string): string {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

/** 耗时：created_at → finished_at（运行中按当前时间估算） */
function formatDuration(task: TaskItem): string {
  const start = task.created_at ? new Date(task.created_at).getTime() : null;
  if (!start) return '-';
  const end = task.finished_at
    ? new Date(task.finished_at).getTime()
    : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

function TaskCenter() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('write', 'Eval');

  const [ list, setList ] = useState<TaskItem[]>([]);
  const [ total, setTotal ] = useState(0);
  const [ page, setPage ] = useState(1);
  const [ loading, setLoading ] = useState(false);
  const [ taskType, setTaskType ] = useState<string | undefined>();
  const [ status, setStatus ] = useState<string | undefined>();

  // 详情抽屉
  const [ detailOpen, setDetailOpen ] = useState(false);
  const [ detail, setDetail ] = useState<TaskItem | null>(null);

  // 发起人 id → username
  const [ userMap, setUserMap ] = useState<Record<number, string>>({});

  const hasActiveRef = useRef(false);

  const fetchList = useCallback(
    async(p: number) => {
      setLoading(true);
      try {
        const res = await listTasks({
          task_type: taskType,
          status,
          page: p,
          page_size: PAGE_SIZE,
        });
        if (res.success && res.data) {
          setList(res.data.list ?? []);
          setTotal(res.data.total ?? 0);
          setPage(res.data.page ?? p);
          hasActiveRef.current = (res.data.list ?? []).some(
            (t) => t.status === 'queued' || t.status === 'running',
          );
        }
      } catch (error) {
        console.error('获取任务列表失败:', error);
        message.error('获取任务列表失败');
      } finally {
        setLoading(false);
      }
    },
    [ taskType, status ],
  );

  // 发起人用户名映射（admin 可见全部任务，展示更友好）
  useEffect(() => {
    getUserList()
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<number, string> = {};
          for (const u of res.data) map[u.id] = u.username;
          setUserMap(map);
        }
      })
      .catch(() => {
        // 用户列表拉取失败不阻断任务中心
      });
  }, []);

  // 首次加载 + 过滤条件变化时刷新
  useEffect(() => {
    void fetchList(1);
  }, [ fetchList ]);

  // 轮询：存在排队/执行中任务时 3 秒刷新
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasActiveRef.current) {
        void fetchList(page);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [ fetchList, page ]);

  const openDetail = (task: TaskItem) => {
    setDetail(task);
    setDetailOpen(true);
  };

  const handleCancel = async(task: TaskItem) => {
    const res = await cancelTask(task.id);
    if (res.success) {
      message.success(`任务 #${task.id} 已取消`);
      void fetchList(page);
      if (detail && detail.id === task.id) {
        setDetail({ ...task, status: 'cancelled' });
      }
    } else {
      message.error(res.msg || res.message || '取消失败');
      void fetchList(page);
    }
  };

  /** P8 重试：按同入参重新提交任务 */
  const handleRetry = async(task: TaskItem) => {
    const payload = (task.payload ?? {}) as Record<string, unknown>;
    let res;
    if (task.task_type === 'eval_run') {
      res = await submitEvalRunTask(Number(payload.set_id));
    } else {
      res = await submitEvalSetGenerateTask({
        doc_id: String(payload.doc_id ?? ''),
        set_name:
          typeof payload.set_name === 'string' && payload.set_name
            ? payload.set_name
            : undefined,
        count:
          payload.count !== undefined && payload.count !== null
            ? Number(payload.count)
            : undefined,
      });
    }
    if (res.success && res.data) {
      message.success(`已重新提交任务 #${res.data.task_id}`);
      void fetchList(page);
    } else {
      message.error(res.msg || res.message || '重试失败');
    }
  };

  /** 运行中任务的进度文案 */
  const progressDetailText = (task: TaskItem): string => {
    const d = (task.progress_detail ?? {}) as Record<string, unknown>;
    if (task.status !== 'running') return '';
    if (task.task_type === 'eval_run') {
      const done = Number(d.done ?? 0);
      const totalN = Number(d.total ?? 0);
      const current = d.current as { case_id?: string; score?: number } | undefined;
      if (totalN > 0) {
        const caseLabel = (current?.case_id ?? '').replace(/^T/, '');
        return `已评估 ${done}/${totalN} 条${caseLabel ? `，正在 T${caseLabel} 得分 ${Math.round((current?.score ?? 0) * 100)}%` : ''}`;
      }
    }
    if (task.task_type === 'eval_set_generate') {
      const phase = d.phase ?? '';
      const phaseProgress = d.phase_progress ?? '';
      if (phase === 'generating' && phaseProgress) {
        return `LLM 生成中：第 ${phaseProgress}`;
      }
      if (phase === 'importing') return '正在导入用例…';
      if (phase === 'parsing') return '正在解析文档…';
    }
    return '';
  };

  const columns: ColumnsType<TaskItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '类型',
      dataIndex: 'task_type',
      width: 120,
      render: (v: string) => {
        const meta = TASK_TYPE_META[v] ?? { text: v, color: 'default' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const meta = TASK_STATUS_META[v] ?? { text: v, color: 'default' };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 220,
      render: (_, task) => (
        <div>
          <Progress
            percent={task.progress}
            size="small"
            status={
              task.status === 'failed'
                ? 'exception'
                : task.status === 'success'
                  ? 'success'
                  : 'active'
            }
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {progressDetailText(task)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '发起人',
      dataIndex: 'created_by',
      width: 110,
      render: (v: number | null) =>
        v === null || v === undefined ? '-' : userMap[v] ?? `用户#${v}`,
    },
    {
      title: '开始时间',
      dataIndex: 'created_at',
      width: 160,
      render: formatTime,
    },
    {
      title: '耗时',
      key: 'duration',
      width: 80,
      render: (_, task) => formatDuration(task),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, task) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetail(task)}
          >
            详情
          </Button>
          {canWrite && (task.status === 'failed' || task.status === 'cancelled') && (
            <Popconfirm
              title={`按原入参重新提交任务 #${task.id}？`}
              okText="重试"
              cancelText="返回"
              onConfirm={() => handleRetry(task)}
            >
              <Button type="link" size="small" icon={<ReloadOutlined />}>
                重试
              </Button>
            </Popconfirm>
          )}
          {canWrite && (task.status === 'queued' || task.status === 'running') && (
            <Popconfirm
              title={`确定取消任务 #${task.id}？`}
              description="取消后不会写入评估结果；已完成的用例进度保留"
              okText="取消任务"
              cancelText="返回"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleCancel(task)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  /** 成功结果展示（含跳转链接） */
  const resultNode = useMemo(() => {
    if (!detail) return null;
    if (detail.status !== 'success' || !detail.result) return null;
    const r = detail.result as Record<string, unknown>;
    if (detail.task_type === 'eval_set_generate') {
      const set_id = Number(r.set_id);
      const imported = (r.import_result ?? {}) as { inserted?: number };
      return (
        <div>
          <p>
            评估集「{String(r.name ?? '')}」已创建，导入用例{' '}
            {Number(imported.inserted ?? 0)} 条
          </p>
          {Number.isFinite(set_id) && set_id > 0 && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setDetailOpen(false);
                navigate(`/eval-sets/${set_id}`);
              }}
            >
              查看用例
            </Button>
          )}
        </div>
      );
    }
    if (detail.task_type === 'eval_run') {
      const run_id = Number(r.run_id);
      return (
        <div>
          <p>
            评估完成：运行 #{run_id}，平均分{' '}
            {((Number(r.avg_score) || 0) * 100).toFixed(1)}%，通过{' '}
            {Number(r.passed ?? 0)}/{Number(r.total ?? 0)}
          </p>
          {Number.isFinite(run_id) && run_id > 0 && (
            <Button
              size="small"
              onClick={() => {
                setDetailOpen(false);
                navigate('/eval-runs');
              }}
            >
              查看评估历史
            </Button>
          )}
        </div>
      );
    }
    return null;
  }, [ detail, navigate ]);

  return (
    <div>
      <Card
        title={
          <>
            <ScheduleOutlined /> 任务中心
          </>
        }
        extra={
          <Space>
            <Select
              style={{ width: 140 }}
              placeholder="全部类型"
              allowClear
              value={taskType}
              onChange={(v) => {
                setTaskType(v);
                setPage(1);
              }}
              options={[
                { value: 'eval_run', label: '运行评估集' },
                { value: 'eval_set_generate', label: '生成评估集' },
              ]}
            />
            <Select
              style={{ width: 120 }}
              placeholder="全部状态"
              allowClear
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'queued', label: '排队中' },
                { value: 'running', label: '执行中' },
                { value: 'success', label: '成功' },
                { value: 'failed', label: '失败' },
                { value: 'cancelled', label: '已取消' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchList(page)}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table<TaskItem>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            size: 'small',
            onChange: (p) => fetchList(p),
          }}
          locale={{
            emptyText: <Empty description="暂无任务：可在评估集管理「从文档生成」或评估历史「运行评估集」提交任务" />,
          }}
        />
      </Card>

      {/* 详情抽屉：入参 / 进度明细 / 结果 / 错误 / 取消 */}
      <Drawer
        title={detail ? `任务 #${detail.id} 详情` : '任务详情'}
        width={640}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detail ? (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="类型">
                {TASK_TYPE_META[detail.task_type]?.text ?? detail.task_type}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={TASK_STATUS_META[detail.status]?.color ?? 'default'}>
                  {TASK_STATUS_META[detail.status]?.text ?? detail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发起人">
                {detail.created_by === null || detail.created_by === undefined
                  ? '-'
                  : userMap[detail.created_by] ?? `用户#${detail.created_by}`}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {formatTime(detail.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="耗时" span={2}>
                {formatDuration(detail)}
              </Descriptions.Item>
              <Descriptions.Item label="进度" span={2}>
                <Progress
                  percent={detail.progress}
                  size="small"
                  status={
                    detail.status === 'failed'
                      ? 'exception'
                      : detail.status === 'success'
                        ? 'success'
                        : 'active'
                  }
                />
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title="入参（payload）"
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(detail.payload ?? {}, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title="进度明细（progress_detail）"
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(detail.progress_detail ?? {}, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>

            {detail.status === 'running' && progressDetailText(detail) && (
              <Typography.Paragraph type="secondary">
                {progressDetailText(detail)}
              </Typography.Paragraph>
            )}

            {resultNode && (
              <Descriptions
                title="结果（result）"
                size="small"
                column={1}
                style={{ marginBottom: 16 }}
              >
                <Descriptions.Item>{resultNode}</Descriptions.Item>
              </Descriptions>
            )}

            {detail.error && (
              <Descriptions
                title="失败原因"
                size="small"
                column={1}
                style={{ marginBottom: 16 }}
              >
                <Descriptions.Item>
                  <Typography.Text type="danger">{detail.error}</Typography.Text>
                </Descriptions.Item>
              </Descriptions>
            )}

            {canWrite && (detail.status === 'queued' || detail.status === 'running') && (
              <Popconfirm
                title={`确定取消任务 #${detail.id}？`}
                okText="取消任务"
                cancelText="返回"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleCancel(detail)}
              >
                <Button danger icon={<StopOutlined />}>
                  取消任务
                </Button>
              </Popconfirm>
            )}

            {canWrite && (detail.status === 'failed' || detail.status === 'cancelled') && (
              <Popconfirm
                title={`按原入参重新提交任务 #${detail.id}？`}
                okText="重试"
                cancelText="返回"
                onConfirm={() => {
                  handleRetry(detail);
                  setDetailOpen(false);
                }}
              >
                <Button icon={<ReloadOutlined />}>重试</Button>
              </Popconfirm>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin />
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default TaskCenter;
