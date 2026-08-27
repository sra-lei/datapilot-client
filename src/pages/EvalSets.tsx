/**
 * 评估集管理页面
 * 评估集列表；点击评估集（名称 / 用例按钮）跳转到独立用例管理页面 /eval-sets/:id
 */

import {
  AuditOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileAddOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../contexts/PermissionContext';
import type { EvalCaseInput, EvalSet, EvalSetListItem } from '../services/core';
import {
  createEvalSet,
  deleteEvalSet,
  importEvalSet,
  listEvalDocuments,
  listEvalSets,
  updateEvalSet,
} from '../services/core';
import { pollTask, submitEvalSetGenerateTask } from '../services/core/task';

const STATUS_META: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  disabled: { text: '禁用', color: 'orange' },
  deleted: { text: '已删除', color: 'error' },
};

function statusTag(status: string) {
  const meta = STATUS_META[status] ?? { text: status, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

interface SetFormValues {
  name: string;
  description?: string;
  doc_scope?: string;
}

function EvalSets() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('write', 'Eval');

  const [ loading, setLoading ] = useState(false);
  const [ sets, setSets ] = useState<EvalSetListItem[]>([]);

  // 新建 / 编辑评估集
  const [ setModalOpen, setSetModalOpen ] = useState(false);
  const [ editingSet, setEditingSet ] = useState<EvalSet | null>(null);
  const [ setForm ] = Form.useForm<SetFormValues>();

  // 一步导入
  const [ importModalOpen, setImportModalOpen ] = useState(false);
  const [ importForm ] = Form.useForm();

  // 从文档生成（任务化：提交 → 关闭对话框 → 提示前往任务中心，后台轮询完成后刷新）
  const [ docs, setDocs ] = useState<
    Array<{ task_id: string; filename: string | null; paragraphs_count: number | null; available: boolean }>
  >([]);
  const [ docsLoading, setDocsLoading ] = useState(false);
  const [ selectedDocId, setSelectedDocId ] = useState<string | undefined>();
  const [ genName, setGenName ] = useState('');
  const [ genCount, setGenCount ] = useState<number | null>(15);
  const [ generating, setGenerating ] = useState(false);
  const [ genError, setGenError ] = useState<string | null>(null);

  const loadSets = useCallback(async() => {
    setLoading(true);
    try {
      const response = await listEvalSets();
      if (response.success) {
        setSets(response.data || []);
      } else {
        message.error(response.msg || response.message || '加载评估集失败');
      }
    } catch {
      message.error('加载评估集失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSets();
  }, [ loadSets ]);

  /** 解析粘贴的 JSON 数组 */
  const parseCases = (text: string): EvalCaseInput[] | null => {
    const trimmed = text.trim();
    if (!trimmed) {
      message.warning('请粘贴用例 JSON 数组');
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        message.error('内容必须是 JSON 数组');
        return null;
      }
      return parsed as EvalCaseInput[];
    } catch {
      message.error('JSON 解析失败，请检查格式');
      return null;
    }
  };

  // ---------- 评估集操作 ----------

  const goCases = (record: EvalSetListItem) => {
    navigate(`/eval-sets/${record.id}`);
  };

  const openSetModal = (record?: EvalSetListItem) => {
    setEditingSet(record ?? null);
    setSetModalOpen(true);
    if (record) {
      setForm.setFieldsValue({
        name: record.name,
        description: record.description ?? '',
        doc_scope: record.doc_scope ?? '',
      });
    } else {
      setForm.resetFields();
      // 重置"从文档生成"状态并加载文档库
      setSelectedDocId(undefined);
      setGenName('');
      setGenCount(15);
      setGenError(null);
      setDocsLoading(true);
      listEvalDocuments({ page: 1, page_size: 100 })
        .then((res) => {
          if (res.success && res.data) setDocs(res.data.list ?? []);
          else message.error(res.msg || res.message || '加载文档库失败');
        })
        .catch(() => message.error('加载文档库失败'))
        .finally(() => setDocsLoading(false));
    }
  };

  /** 从已入库文档生成评估集：提交任务 → 关闭对话框 → 提示前往任务中心 → 后台轮询完成后刷新 */
  const handleGenerate = async() => {
    if (!selectedDocId) {
      message.warning('请先选择文档');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await submitEvalSetGenerateTask({
        doc_id: selectedDocId,
        set_name: genName.trim() || undefined,
        count: genCount ?? undefined,
      });
      if (!res.success || !res.data) {
        setGenError(res.msg || res.message || '任务提交失败');
        return;
      }
      const taskId = res.data.task_id;

      // 提交成功：关闭当前对话框，轻提示前往任务中心（视觉最轻：顶部 toast 自动消失）
      setSetModalOpen(false);
      message.success(`任务 #${taskId} 已提交，可在「任务中心」查看进度`, 3);

      // 后台轮询：完成后静默刷新评估集列表，仅轻提示结果（不阻塞当前页面）
      void pollTask(taskId, { intervalMs: 3000 }).then((task) => {
        if (task.status === 'success' && task.result) {
          const r = task.result;
          loadSets();
          message.success(`评估集「${String(r.name ?? '')}」已生成`, 3);
        } else if (task.status === 'failed') {
          message.error(task.error || '评估集生成失败', 4);
        } else if (task.status === 'cancelled') {
          message.warning('生成任务已取消', 3);
        }
      });
    } catch {
      setGenError('任务提交失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSet = async(values: SetFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description,
      doc_scope: values.doc_scope,
    };
    if (editingSet) {
      const result = await updateEvalSet(editingSet.id, payload);
      if (result.success) {
        message.success('评估集更新成功');
        setSetModalOpen(false);
        loadSets();
      } else {
        message.error(result.msg || result.message || '更新失败');
      }
    } else {
      const result = await createEvalSet(payload);
      if (result.success) {
        message.success('创建评估集成功');
        setSetModalOpen(false);
        setForm.resetFields();
        loadSets();
      } else {
        message.error(result.msg || result.message || '创建失败');
      }
    }
  };

  const handleToggleSetStatus = async(setItem: EvalSetListItem) => {
    const toDisabled = setItem.status !== 'disabled';
    const result = await updateEvalSet(setItem.id, {
      status: toDisabled ? 'disabled' : 'normal',
    });
    if (result.success) {
      message.success(
        toDisabled ? `已禁用「${setItem.name}」` : `已启用「${setItem.name}」`,
      );
      loadSets();
    } else {
      message.error(result.msg || result.message || '操作失败');
    }
  };

  const handleDeleteSet = async(setItem: EvalSetListItem) => {
    const result = await deleteEvalSet(setItem.id);
    if (result.success) {
      message.success('评估集已删除（软删除）');
      loadSets();
    } else {
      message.error(result.msg || result.message || '删除失败');
    }
  };

  const handleImportSet = async(values: {
    name: string;
    description?: string;
    doc_scope?: string;
    casesText: string;
  }) => {
    const cases = parseCases(values.casesText);
    if (!cases) return;
    try {
      const response = await importEvalSet({
        name: values.name.trim(),
        description: values.description,
        doc_scope: values.doc_scope,
        cases,
      });
      if (response.success && response.data) {
        const imp = response.data.import_result;
        message.success(
          `导入成功：新增 ${imp.inserted} · 跳过 ${imp.skipped} · 恢复 ${imp.restored} · 失败 ${imp.failures.length}`,
        );
        setImportModalOpen(false);
        importForm.resetFields();
        loadSets();
        // 跳转到新评估集的用例管理页
        navigate(`/eval-sets/${response.data.set.id}`);
      } else {
        message.error(response.msg || response.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    }
  };

  // ---------- 表格列 ----------

  const setColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EvalSetListItem) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => goCases(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: '文档范围',
      dataIndex: 'doc_scope',
      key: 'doc_scope',
      render: (value: string | null) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: statusTag,
    },
    {
      title: '用例数',
      dataIndex: 'case_count',
      key: 'case_count',
      width: 90,
    },
    {
      title: '分类分布',
      dataIndex: 'category_stats',
      key: 'category_stats',
      render: (stats: Record<string, number>) =>
        Object.entries(stats).length > 0
          ? Object.entries(stats).map(([ k, v ]) => `${k} ${v}`).join(' · ')
          : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: formatTime,
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: unknown, record: EvalSetListItem) => (
        <Space size={0} wrap>
          {canWrite && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openSetModal(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title={
                  record.status === 'disabled'
                    ? '确定启用该评估集？'
                    : '禁用后评测将跳过该集全部用例，确定？'
                }
                okText="确定"
                cancelText="取消"
                onConfirm={() => handleToggleSetStatus(record)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={
                    record.status === 'disabled' ? (
                      <PlayCircleOutlined />
                    ) : (
                      <StopOutlined />
                    )
                  }
                >
                  {record.status === 'disabled' ? '启用' : '禁用'}
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确定删除该评估集？（软删除，仅改为已删除，数据保留）"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteSet(record)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <>
            <AuditOutlined /> 评估集管理
          </>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSets}>
              刷新
            </Button>
            {canWrite && (
              <Button
                icon={<FileAddOutlined />}
                onClick={() => {
                  setImportModalOpen(true);
                  importForm.resetFields();
                }}
              >
                一步导入
              </Button>
            )}
            {canWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openSetModal()}
              >
                新建评估集
              </Button>
            )}
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={sets}
          columns={setColumns}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新建 / 编辑评估集（新建时支持 手工创建 / 从文档生成 两种方式） */}
      <Modal
        title={editingSet ? `编辑评估集：${editingSet.name}` : '新建评估集'}
        open={setModalOpen}
        onCancel={() => setSetModalOpen(false)}
        footer={null}
        width={editingSet ? undefined : 720}
        destroyOnClose
      >
        {editingSet ? (
          <Form form={setForm} layout="vertical">
            <Form.Item
              name="name"
              label="名称"
              rules={[ { required: true, message: '请输入评估集名称' } ]}
            >
              <Input placeholder="如：员工手册-恒大" maxLength={255} />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={2} placeholder="可选" />
            </Form.Item>
            <Form.Item name="doc_scope" label="关联文档范围">
              <Input placeholder="如：员工手册" maxLength={255} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setSetModalOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setForm.validateFields().then(handleSaveSet);
                  }}
                >
                  保存
                </Button>
              </Space>
            </div>
          </Form>
        ) : (
          <Tabs
            items={[
              {
                key: 'manual',
                label: '手工创建',
                children: (
                  <Form form={setForm} layout="vertical">
                    <Form.Item
                      name="name"
                      label="名称"
                      rules={[ { required: true, message: '请输入评估集名称' } ]}
                    >
                      <Input placeholder="如：员工手册-恒大" maxLength={255} />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                      <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="doc_scope" label="关联文档范围">
                      <Input placeholder="如：员工手册" maxLength={255} />
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                      <Space>
                        <Button onClick={() => setSetModalOpen(false)}>取消</Button>
                        <Button
                          type="primary"
                          onClick={() => {
                            setForm.validateFields().then(handleSaveSet);
                          }}
                        >
                          创建
                        </Button>
                      </Space>
                    </div>
                  </Form>
                ),
              },
              {
                key: 'fromDoc',
                label: '从文档生成',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Alert
                      type="info"
                      showIcon
                      message="选择已入库文档，由 LLM 读取文档原始内容生成 QA 用例并自动创建评估集（需先由「文档入库」上传）"
                    />
                    <div>
                      <div style={{ marginBottom: 4 }}>选择文档</div>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="请选择已入库文档"
                        loading={docsLoading}
                        value={selectedDocId}
                        onChange={setSelectedDocId}
                        options={docs.map((d) => ({
                          value: d.task_id,
                          label: d.available
                            ? `${d.filename ?? d.task_id}（${d.paragraphs_count ?? '?'} 段）`
                            : `${d.filename ?? d.task_id}（内容不可用）`,
                          disabled: !d.available,
                        }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 4 }}>评估集名称（可选）</div>
                        <Input
                          placeholder="缺省自动命名：自动-文档名-时间"
                          value={genName}
                          onChange={(e) => setGenName(e.target.value)}
                          maxLength={255}
                        />
                      </div>
                      <div style={{ width: 140 }}>
                        <div style={{ marginBottom: 4 }}>生成条数</div>
                        <InputNumber
                          min={5}
                          max={100}
                          value={genCount}
                          onChange={(v) => setGenCount(v)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <Button
                      type="primary"
                      icon={<ExperimentOutlined />}
                      loading={generating}
                      disabled={!selectedDocId}
                      onClick={() => void handleGenerate()}
                    >
                      {generating ? '正在提交…' : '生成评估集'}
                    </Button>
                    <Alert
                      type="info"
                      showIcon
                      message="提交后自动关闭本窗口，可前往任务中心查看生成进度；完成后会在此提示。"
                      style={{ marginTop: 4 }}
                    />
                    {genError && <Alert type="error" showIcon message={genError} />}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* 一步导入 */}
      <Modal
        title="一步导入评估集"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={() => {
          importForm.validateFields().then(handleImportSet);
        }}
        width={640}
      >
        <Alert
          type="info"
          showIcon
          message="填写评估集信息并粘贴用例 JSON 数组（与示例数据格式一致）"
          style={{ marginBottom: 12 }}
        />
        <Form form={importForm} layout="vertical">
          <Form.Item
            name="name"
            label="评估集名称"
            rules={[ { required: true, message: '请输入评估集名称' } ]}
          >
            <Input placeholder="如：员工手册-恒大" maxLength={255} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="doc_scope" label="关联文档范围">
            <Input placeholder="如：员工手册" maxLength={255} />
          </Form.Item>
          <Form.Item
            name="casesText"
            label="用例 JSON 数组"
            rules={[ { required: true, message: '请粘贴用例数组' } ]}
          >
            <Input.TextArea
              rows={10}
              placeholder='[{"id":"T001","question":"问题内容","expected_chapter":"第一章","expected_keywords":["关键词1"],"category":"事实查询"}]'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default EvalSets;
