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
  LockOutlined,
  KeyOutlined
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

  // Configuración de envíos de reportes
  const [cfgForm] = Form.useForm();
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    fetchUsers();
    loadReportConfig();
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

  const loadReportConfig = async () => {
    try {
      const res = await usersAPI.getReportConfig();
      cfgForm.setFieldsValue(res.data.data || {});
    } catch (error) {
      // silencioso: si no es admin o falla, no bloquea la vista
    }
  };

  const handleSaveConfig = async (values) => {
    setSavingCfg(true);
    try {
      await usersAPI.saveReportConfig(values);
      message.success('Configuración de envíos guardada');
    } catch (error) {
      message.error(error.response?.data?.detail || 'No se pudo guardar la configuración');
    } finally {
      setSavingCfg(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      is_admin: false,
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

  const handleReset = async (user) => {
    try {
      const res = await usersAPI.resetPassword(user.id);
      if (res.data?.email_sent) {
        message.success(`Se envió una contraseña temporal a ${user.email}`);
      } else {
        Modal.info({
          title: 'Contraseña restablecida',
          content: (
            <div>
              <p>No se pudo enviar el correo. Entrega esta contraseña temporal al usuario:</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16 }}>
                {res.data?.temp_password}
              </p>
            </div>
          ),
        });
      }
    } catch (error) {
      message.error(error.response?.data?.detail || error.message || 'Error al restablecer la contraseña');
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
        const res = await usersAPI.create(values);
        if (res.data?.email_sent) {
          message.success('Usuario creado. Se envió la contraseña temporal por correo.');
        } else if (res.data?.temp_password) {
          Modal.info({
            title: 'Usuario creado',
            content: (
              <div>
                <p>No se pudo enviar el correo. Entrega esta contraseña temporal al usuario:</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16 }}>
                  {res.data.temp_password}
                </p>
              </div>
            ),
          });
        } else {
          message.success('Usuario creado correctamente');
        }
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
      title: 'Rol',
      dataIndex: 'is_admin',
      align: 'center',
      render: (isAdmin) => (
        <Tag color={isAdmin ? 'gold' : 'default'}>
          {isAdmin ? 'Administrador' : 'Usuario'}
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
            title="¿Restablecer la contraseña?"
            description="Se enviará una nueva contraseña temporal a su correo."
            onConfirm={() => handleReset(record)}
            okText="Sí, restablecer"
            cancelText="Cancelar"
          >
            <Button type="link" icon={<KeyOutlined />}>
              Restablecer
            </Button>
          </Popconfirm>
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
    <>
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

          {editingUser ? (
            <Form.Item name="password" label="Nueva contraseña (opcional)">
              <Input.Password placeholder="Dejar en blanco para no cambiarla" />
            </Form.Item>
          ) : (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              Se generará una contraseña temporal y se enviará al correo del usuario.
              Deberá cambiarla en su primer inicio de sesión.
            </Text>
          )}

          <Divider />

          <Space size={48} align="start">
            <Form.Item name="is_active" label="Estado" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
            <Form.Item name="is_admin" label="Administrador" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>

    <Card
      style={{ marginTop: 24 }}
      title={<span><MailOutlined /> Configuración de envíos de reportes</span>}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Correos que reciben los reportes automáticos (separa varios con coma). Los cambios se aplican de inmediato.
      </Text>
      <Form form={cfgForm} layout="vertical" onFinish={handleSaveConfig} style={{ maxWidth: 640 }}>
        <Form.Item
          name="gerencia"
          label="Gerencia General"
          tooltip="Reciben el resumen ejecutivo semanal y el reporte mensual"
        >
          <Input placeholder="gerencia@macsalud.com, direccion@macsalud.com" />
        </Form.Item>
        <Form.Item
          name="administracion"
          label="Administración"
          tooltip="Reciben el digest diario y el reporte semanal de agentes/colas"
        >
          <Input placeholder="administracion@macsalud.com" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={savingCfg}>
          Guardar configuración
        </Button>
      </Form>
    </Card>
    </>
  );
};

export default Users;
