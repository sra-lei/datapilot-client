/**
 * 数据库查看器页面
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Descriptions,
  Tag,
  Modal,
  Input,
  Typography,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  getTables,
  getTableData,
  getDatabaseStats,
  executeQuery,
} from '../services/core';
import type { TableInfo, QueryResult, DatabaseStats } from '../services/core';

const { TextArea } = Input;
const { Text } = Typography;

function DatabaseViewer() {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 加载表列表
  const loadTables = async () => {
    setLoading(true);
    try {
      const result = await getTables();
      if (result.status === 200) {
        setTables(result.data || []);
      } else {
        message.error(result.msg);
      }
    } catch (error) {
      message.error('加载表列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const result = await getDatabaseStats();
      if (result.status === 200) {
        setStats(result.data || null);
      }
    } catch (error) {
      console.error('加载统计信息失败', error);
    }
  };

  // 加载表数据
  const loadTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const result = await getTableData(tableName);
      if (result.status === 200) {
        setTableData(result.data || null);
        setSelectedTable(tableName);
      } else {
        message.error(result.msg);
      }
    } catch (error) {
      message.error('加载表数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行 SQL 查询
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      message.warning('请输入 SQL 查询语句');
      return;
    }

    setLoading(true);
    try {
      const result = await executeQuery(sqlQuery);
      if (result.status === 200) {
        setQueryResult(result.data || null);
        message.success('查询成功');
      } else {
        message.error(result.msg);
      }
    } catch (error) {
      message.error('查询执行失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  useEffect(() => {
    loadTables();
    loadStats();
  }, []);

  const tableColumns = tableData?.columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150,
  })) || [];

  const queryColumns = queryResult?.columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150,
  })) || [];

  return (
    <div style={{ padding: 0 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 数据库配置和统计信息 */}
        {stats && (
          <Card title={<><InfoCircleOutlined /> 数据库配置与统计</>}>
            <Descriptions column={4}>
              <Descriptions.Item label="数据库类型">
                <Tag color="purple">SQLite</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据库路径">
                <Text code copyable>{stats.dbFilePath}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="表数量">
                <Tag color="blue">{stats.tableCount}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总行数">
                <Tag color="green">{stats.totalRows}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                <Tag color="orange">{formatFileSize(stats.dbFileSize)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="运行环境">
                <Tag>开发环境</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Text strong>各表行数：</Text>
            <div style={{ marginTop: 8 }}>
              {Object.entries(stats.tableStats).map(([table, count]) => (
                <Tag
                  key={table}
                  style={{ marginLeft: 8, cursor: 'pointer' }}
                  color="geekblue"
                  onClick={() => loadTableData(table)}
                >
                  {table}: {count}
                </Tag>
              ))}
            </div>
          </Card>
        )}

        {/* 表列表 */}
        <Card
          title={<><TableOutlined /> 数据表</>}
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadTables();
                  loadStats();
                }}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => setModalVisible(true)}
              >
                执行 SQL
              </Button>
            </Space>
          }
        >
          <Spin spinning={loading}>
            <Space wrap size="middle">
              {tables.map((table) => (
                <Card
                  key={table.name}
                  size="small"
                  hoverable
                  style={{
                    width: 200,
                    background: selectedTable === table.name ? '#e6f7ff' : undefined,
                    borderColor: selectedTable === table.name ? '#1890ff' : undefined,
                  }}
                  onClick={() => loadTableData(table.name)}
                >
                  <DatabaseOutlined style={{ fontSize: 24, marginRight: 8 }} />
                  <Text strong>{table.name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    类型: {table.type}
                  </Text>
                </Card>
              ))}
            </Space>
          </Spin>
        </Card>

        {/* 表数据 */}
        {selectedTable && tableData && (
          <Card
            title={<><TableOutlined /> {selectedTable} - 数据预览 ({tableData.rowCount} 行)</>}
            extra={
              <Button icon={<ReloadOutlined />} onClick={() => loadTableData(selectedTable)}>
                刷新
              </Button>
            }
          >
            {tableData.rows.length > 0 ? (
              <Table
                columns={tableColumns}
                dataSource={tableData.rows.map((row, index) => ({ ...row, key: index }))}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <Alert message="表中没有数据" type="info" showIcon />
            )}
          </Card>
        )}
      </Space>

      {/* SQL 查询 Modal */}
      <Modal
        title={<><PlayCircleOutlined /> SQL 查询</>}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSqlQuery('');
          setQueryResult(null);
        }}
        footer={null}
        width={1000}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <TextArea
            placeholder="输入 SELECT 查询语句..."
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={4}
            style={{ fontFamily: 'monospace' }}
          />
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecuteQuery}>
            执行查询
          </Button>

          {queryResult && (
            <Card title={`查询结果 (${queryResult.rowCount} 行)`} size="small">
              <Table
                columns={queryColumns}
                dataSource={queryResult.rows.map((row, index) => ({ ...row, key: index }))}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  );
}

export default DatabaseViewer;
