/**
 * 评估集管理页面
 * 主视图：评估集列表；从视图：用例管理 Drawer（批量导入 / 导出 / 用例 CRUD）
 */

import {
  AuditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { usePermission } from '../contexts/PermissionContext';
import type {
  EvalCase,
  EvalCaseImportResult,
  EvalCaseInput,
  EvalSet,
  EvalSetDetail,
  EvalSetListItem,
} from '../services/core';
import {
  addEvalCases,
  createEvalSet,
  deleteEvalCase,
  deleteEvalSet,
  exportEvalSet,
  getEvalSet,
  importEvalSet,
  listEvalSets,
  updateEvalCase,
  updateEvalSet,
} from '../services/core';

const { Text } = Typography;

const CATEGORIES = [ '事实查询', '概念查询', '理解推理', '综合概括' ];

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

function timestampForFile() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

interface SetFormValues {
  name: string;
  description?: string;
  doc_scope?: string;
}

interface CaseFormValues {
  case_id: string;
  question: string;
  expected_chapter?: string;
  expected_keywords: string[];
  category: string;
  sort_order?: number;
  status: 'normal' | 'disabled';
}

function EvalSets() {
  const { can } = usePermission();
  const canWrite = can('write', 'Eval');

  const [ loading, setLoading ] = useState(false);
  const [ sets, setSets ] = useState<EvalSetListItem[]>([]);

  // 用例 Drawer
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const [ detail, setDetail ] = useState<EvalSetDetail | null>(null);
  const [ casesLoading, setCasesLoading ] = useState(false);

  // 新建 / 编辑评估集
  const [ setModalOpen, setSetModalOpen ] = useState(false);
  const [ editingSet, setEditingSet ] = useState<EvalSet | null>(null);
  const [ setForm ] = Form.useForm<SetFormValues>();

  // 一步导入
  const [ importModalOpen, setImportModalOpen ] = useState(false);
  const [ importForm ] = Form.useForm();

  // 批量导入（Drawer 内）
  const [ importCasesOpen, setImportCasesOpen ] = useState(false);
  const [ importCasesText, setImportCasesText ] = useState('');
  const [ importResult, setImportResult ] = useState<EvalCaseImportResult | null>(
    null,
  );
  const [ importing, setImporting ] = useState(false);

  // 新建 / 编辑用例
  const [ caseModalOpen, setCaseModalOpen ] = useState(false);
  const [ editingCase, setEditingCase ] = useState<EvalCase | null>(null);
  const [ caseForm ] = Form.useForm<CaseFormValues>();

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

  const reloadDetail = async(setId: number) => {
    const response = await getEvalSet(setId);
    if (response.success && response.data) {
      setDetail(response.data);
    }
  };

  const openDrawer = async(setItem: EvalSetListItem) => {
    setDrawerOpen(true);
    setCasesLoading(true);
    try {
      const response = await getEvalSet(setItem.id);
      if (response.success && response.data) {
        setDetail(response.data);
      } else {
        message.error(response.msg || response.message || '加载评估集详情失败');
        setDetail(null);
      }
    } catch {
      message.error('加载评估集详情失败');
      setDetail(null);
    } finally {
      setCasesLoading(false);
    }
  };

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
        reloadDetail(editingSet.id);
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
      reloadDetail(setItem.id);
    } else {
      message.error(result.msg || result.message || '操作失败');
    }
  };

  const handleDeleteSet = async(setItem: EvalSetListItem) => {
    const result = await deleteEvalSet(setItem.id);
    if (result.success) {
      message.success('评估集已删除（软删除）');
      if (drawerOpen && detail?.set.id === setItem.id) {
        setDrawerOpen(false);
        setDetail(null);
      }
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
        openDrawer({
          ...response.data.set,
          case_count: imp.inserted,
          category_stats: {},
        });
      } else {
        message.error(response.msg || response.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    }
  };

  // ---------- 用例操作 ----------

  const openCaseModal = (record?: EvalCase) => {
    setEditingCase(record ?? null);
    setCaseModalOpen(true);
    if (record) {
      caseForm.setFieldsValue({
        case_id: record.case_id,
        question: record.question,
        expected_chapter: record.expected_chapter ?? '',
        expected_keywords: record.expected_keywords,
        category: record.category,
        sort_order: record.sort_order,
        status: record.status === 'disabled' ? 'disabled' : 'normal',
      });
    } else {
      caseForm.resetFields();
      caseForm.setFieldsValue({ status: 'normal' });
    }
  };

  const handleSaveCase = async(values: CaseFormValues) => {
    if (!detail) return;
    const payload = {
      case_id: values.case_id.trim(),
      question: values.question.trim(),
      expected_chapter:
        values.expected_chapter && values.expected_chapter.trim()
          ? values.expected_chapter.trim()
          : null,
      expected_keywords: values.expected_keywords || [],
      category: values.category,
      sort_order: values.sort_order ?? 0,
      status: values.status,
    };
    if (editingCase) {
      const result = await updateEvalCase(editingCase.id, payload);
      if (result.success) {
        message.success('用例更新成功');
        setCaseModalOpen(false);
        caseForm.resetFields();
        reloadDetail(detail.set.id);
      } else {
        message.error(result.msg || result.message || '更新失败');
      }
      return;
    }
    // 新建用例：走批量导入（单条，示例数据格式用 id 字段）
    const result = await addEvalCases(detail.set.id, [
      {
        id: payload.case_id,
        question: payload.question,
        expected_chapter: payload.expected_chapter,
        expected_keywords: payload.expected_keywords,
        category: payload.category,
        sort_order: payload.sort_order,
      },
    ]);
    if (result.success && result.data) {
      const imp = result.data;
      if (imp.inserted > 0) {
        message.success('用例创建成功');
        setCaseModalOpen(false);
        caseForm.resetFields();
        reloadDetail(detail.set.id);
      } else if (imp.skipped > 0) {
        message.warning('编号已存在（未删除），未创建');
        setCaseModalOpen(false);
        caseForm.resetFields();
        reloadDetail(detail.set.id);
      } else {
        message.error(imp.failures[0]?.reason || '创建失败');
      }
    } else {
      message.error(result.msg || result.message || '创建失败');
    }
  };

  const handleToggleCaseStatus = async(record: EvalCase) => {
    if (!detail) return;
    const toDisabled = record.status !== 'disabled';
    const result = await updateEvalCase(record.id, {
      status: toDisabled ? 'disabled' : 'normal',
    });
    if (result.success) {
      message.success(
        toDisabled ? `已禁用用例 ${record.case_id}` : `已启用用例 ${record.case_id}`,
      );
      reloadDetail(detail.set.id);
    } else {
      message.error(result.msg || result.message || '操作失败');
    }
  };

  const handleDeleteCase = async(caseId: number) => {
    if (!detail) return;
    const result = await deleteEvalCase(caseId);
    if (result.success) {
      message.success('用例已删除（软删除）');
      reloadDetail(detail.set.id);
    } else {
      message.error(result.msg || result.message || '删除失败');
    }
  };

  const handleImportCases = async() => {
    if (!detail) return;
    const cases = parseCases(importCasesText);
    if (!cases) return;
    setImporting(true);
    try {
      const response = await addEvalCases(detail.set.id, cases);
      if (response.success && response.data) {
        setImportResult(response.data);
        reloadDetail(detail.set.id);
        message.success(`导入完成：新增 ${response.data.inserted} 条`);
      } else {
        message.error(response.msg || response.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async() => {
    if (!detail) return;
    try {
      const response = await exportEvalSet(detail.set.id);
      if (!response.success || !response.data) {
        message.error(response.msg || response.message || '导出失败');
        return;
      }
      const blob = new Blob([ JSON.stringify(response.data, null, 2) ], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval-set-${detail.set.name}-${timestampForFile()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${response.data.length} 条正常用例`);
    } catch {
      message.error('导出失败');
    }
  };

  // ---------- 表格列 ----------

  const setColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EvalSetListItem) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => openDrawer(record)}>
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
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDrawer(record)}
          >
            用例
          </Button>
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

  const caseColumns = [
    {
      title: '编号',
      dataIndex: 'case_id',
      key: 'case_id',
      width: 90,
    },
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '期望章节',
      dataIndex: 'expected_chapter',
      key: 'expected_chapter',
      width: 110,
      render: (value: string | null) => value || <Tag>跨章节</Tag>,
    },
    {
      title: '期望关键词',
      dataIndex: 'expected_keywords',
      key: 'expected_keywords',
      render: (keywords: string[]) => (
        <>
          {keywords.map((k) => (
            <Tag key={k}>{k}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: statusTag,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: EvalCase) => (
        <Space size={0} wrap>
          {canWrite ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openCaseModal(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title={
                  record.status === 'disabled'
                    ? '确定启用该用例？'
                    : '禁用后评测将跳过该用例，确定？'
                }
                okText="确定"
                cancelText="取消"
                onConfirm={() => handleToggleCaseStatus(record)}
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
                title="确定删除该用例？（软删除，仅改为已删除）"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteCase(record.id)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Text type="secondary">-</Text>
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

      {/* 新建 / 编辑评估集 */}
      <Modal
        title={editingSet ? `编辑评估集：${editingSet.name}` : '新建评估集'}
        open={setModalOpen}
        onCancel={() => setSetModalOpen(false)}
        onOk={() => {
          setForm.validateFields().then(handleSaveSet);
        }}
      >
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
        </Form>
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

      {/* 用例管理 Drawer */}
      <Drawer
        title={detail ? `${detail.set.name} - 用例管理` : '用例管理'}
        width={860}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            {canWrite && (
              <Button
                icon={<PlusOutlined />}
                onClick={() => openCaseModal()}
              >
                新建用例
              </Button>
            )}
            {canWrite && (
              <Button
                icon={<UploadOutlined />}
                onClick={() => {
                  setImportCasesOpen(true);
                  setImportCasesText('');
                  setImportResult(null);
                }}
              >
                批量导入
              </Button>
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">
                文档范围：{detail.set.doc_scope || '-'}
              </Text>
              <span style={{ marginLeft: 16 }}>状态：{statusTag(detail.set.status)}</span>
              <span style={{ marginLeft: 16 }}>用例数：{detail.cases.length}</span>
              <span style={{ marginLeft: 16 }}>
                <Text type="secondary">导出仅含「正常」用例，禁用项评测时跳过</Text>
              </span>
            </div>
            <Table
              rowKey="id"
              loading={casesLoading}
              dataSource={detail.cases}
              columns={caseColumns}
              pagination={{ pageSize: 10 }}
            />
          </Space>
        )}
      </Drawer>

      {/* 批量导入用例 */}
      <Modal
        title="批量导入用例"
        open={importCasesOpen}
        onCancel={() => setImportCasesOpen(false)}
        onOk={handleImportCases}
        confirmLoading={importing}
        width={680}
      >
        <Alert
          type="info"
          showIcon
          message="粘贴用例 JSON 数组；重复编号：未删除则跳过，已删除则自动恢复为正常"
          style={{ marginBottom: 12 }}
        />
        <Input.TextArea
          rows={10}
          value={importCasesText}
          onChange={(e) => setImportCasesText(e.target.value)}
          placeholder='[{"id":"T001","question":"问题内容","expected_chapter":"第一章","expected_keywords":["关键词1"],"category":"事实查询"}]'
        />
        {importResult && (
          <Alert
            style={{ marginTop: 12 }}
            type={importResult.failures.length > 0 ? 'warning' : 'success'}
            showIcon
            message={`导入完成：新增 ${importResult.inserted} · 跳过 ${importResult.skipped} · 恢复 ${importResult.restored} · 失败 ${importResult.failures.length}`}
            description={
              importResult.failures.length > 0 ? (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {importResult.failures.map((f) => (
                    <div key={f.index}>
                      第 {f.index + 1} 条{f.id ? `（${f.id}）` : ''}：{f.reason}
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
        )}
      </Modal>

      {/* 新建 / 编辑用例 */}
      <Modal
        title={editingCase ? `编辑用例：${editingCase.case_id}` : '新建用例'}
        open={caseModalOpen}
        onCancel={() => setCaseModalOpen(false)}
        onOk={() => {
          caseForm.validateFields().then(handleSaveCase);
        }}
        width={560}
      >
        <Form form={caseForm} layout="vertical">
          <Form.Item
            name="case_id"
            label="编号"
            rules={[
              { required: true, message: '请输入编号（如 T001）' },
              {
                pattern: /^[A-Za-z0-9_-]{1,64}$/,
                message: '仅支持字母/数字/下划线/中划线，1-64 位',
              },
            ]}
          >
            <Input placeholder="T001" />
          </Form.Item>
          <Form.Item
            name="question"
            label="问题"
            rules={[ { required: true, message: '请输入问题' } ]}
          >
            <Input.TextArea rows={2} placeholder="请输入问题" />
          </Form.Item>
          <Form.Item name="expected_chapter" label="期望章节">
            <Input placeholder="如：第一章；留空表示跨章节" />
          </Form.Item>
          <Form.Item
            name="expected_keywords"
            label="期望关键词"
            rules={[ { required: true, message: '请至少输入一个关键词' } ]}
          >
            <Select
              mode="tags"
              placeholder="输入后回车添加，如：3333"
              tokenSeparators={[ ',', '，' ]}
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[ { required: true, message: '请选择分类' } ]}
          >
            <Select placeholder="请选择分类">
              {CATEGORIES.map((c) => (
                <Select.Option key={c} value={c}>
                  {c}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="默认 0" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[ { required: true, message: '请选择状态' } ]}
          >
            <Select
              options={[
                { value: 'normal', label: '正常' },
                { value: 'disabled', label: '禁用（评测跳过）' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default EvalSets;
