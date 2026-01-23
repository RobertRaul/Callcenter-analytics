// pages/Users.jsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Tag,
  Popconfirm,
  message,
  Card,
  Typography,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined
} from '@ant-design/icons';
import { usersAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

const { Title, Text } = Typography;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.list();
      setUsers(response.data.data || []);
    } catch (error) {
      message.error(error.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      access_dashboard: true,
      access_calls: true,
      access_queues: true,
      access_agents: true,
      access_reports: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: '',
      is_active: Boolean(user.is_active),
    });
    setModalVisible(true);
  };

  const handleDelete = async (userId) => {
    if (userId === 1) {
      message.error('No se puede eliminar el usuario administrador');
      return;
    }

    try {
      await usersAPI.delete(userId);
      message.success('Usuario eliminado correctamente');
      fetchUsers();
    } catch (error) {
      message.error(error.message || 'Error al eliminar usuario');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        const payload = { ...values };
        delete payload.username;

        if (!payload.password) {
          delete payload.password;
        }

        await usersAPI.update(editingUser.id, payload);
        message.success('Usuario actualizado correctamente');
      } else {
        await usersAPI.create(values);
        message.success('Usuario creado correctamente');
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error(error.message || 'Error al guardar usuario');
    }
  };

  const columns = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      render: (text) => (
        <Space>
          <UserOutlined style={{ color: MACSA_COLORS.blue }} />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'Nombre Completo',
      dataIndex: 'full_name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (text) => (
        <Space>
          <MailOutlined style={{ color: MACSA_COLORS.gray }} />
          {text}
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      align: 'center',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar este usuario?"
            onConfirm={() => handleDelete(record.id)}
            disabled={record.id === 1}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === 1}
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3}>Administracion de Usuarios</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Nuevo Usuario
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="Usuario" rules={[{ required: true }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>

          <Form.Item name="full_name" label="Nombre Completo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="password" label="Password">
            <Input.Password />
          </Form.Item>

          <Divider />

          <Form.Item name="is_active" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Users;
