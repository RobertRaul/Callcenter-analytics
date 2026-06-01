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
  Divider,
  Select,
  Checkbox,
  TimePicker,
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  KeyOutlined,
  SendOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usersAPI } from '../services/api';
import { MACSA_COLORS } from '../config/theme';

const { Title, Text } = Typography;

const REPORT_TYPE_LABELS = {
  'daily': 'Digest diario operativo',
  'weekly-exec': 'Resumen ejecutivo semanal',
  'monthly': 'Reporte mensual de desempeño',
  'weekly-agents': 'Semanal de agentes y colas',
};

const FREQ_LABELS = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };

const WEEKDAYS = [
  { label: 'Lun', value: 0 },
  { label: 'Mar', value: 1 },
  { label: 'Mié', value: 2 },
  { label: 'Jue', value: 3 },
  { label: 'Vie', value: 4 },
  { label: 'Sáb', value: 5 },
  { label: 'Dom', value: 6 },
];

const describeWhen = (s) => {
  if (s.freq === 'daily') return `Todos los días · ${s.time}`;
  if (s.freq === 'weekly') {
    const ds = (s.days || [])
      .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
      .filter(Boolean)
      .join(', ');
    return `Semanal (${ds || '—'}) · ${s.time}`;
  }
  if (s.freq === 'monthly') return `Mensual · día ${s.day_of_month || '—'} · ${s.time}`;
  return s.time;
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // Programaciones de envío de reportes
  const [schedules, setSchedules] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedModalVisible, setSchedModalVisible] = useState(false);
  const [editingSched, setEditingSched] = useState(null);
  const [schedForm] = Form.useForm();
  const [runningId, setRunningId] = useState(null);
  const freqWatch = Form.useWatch('freq', schedForm);

  useEffect(() => {
    fetchUsers();
    fetchSchedules();
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

  const fetchSchedules = async () => {
    setSchedLoading(true);
    try {
      const res = await usersAPI.listSchedules();
      setSchedules(res.data.data || []);
    } catch (error) {
      message.error(error.message || 'Error al cargar las programaciones');
    } finally {
      setSchedLoading(false);
    }
  };

  const handleNewSched = () => {
    setEditingSched(null);
    schedForm.resetFields();
    schedForm.setFieldsValue({
      report_type: 'daily',
      freq: 'daily',
      days: [],
      time: dayjs('08:00', 'HH:mm'),
      enabled: true,
    });
    setSchedModalVisible(true);
  };

  const handleEditSched = (s) => {
    setEditingSched(s);
    schedForm.setFieldsValue({
      name: s.name,
      report_type: s.report_type,
      freq: s.freq,
      days: s.days || [],
      day_of_month: s.day_of_month || undefined,
      time: s.time ? dayjs(s.time, 'HH:mm') : null,
      recipients: s.recipients || '',
      enabled: !!s.enabled,
    });
    setSchedModalVisible(true);
  };

  const handleSubmitSched = async (values) => {
    const payload = {
      name: values.name || '',
      report_type: values.report_type,
      freq: values.freq,
      days: values.freq === 'weekly' ? (values.days || []) : [],
      day_of_month: values.freq === 'monthly' ? (values.day_of_month || null) : null,
      time: values.time ? values.time.format('HH:mm') : '',
      recipients: values.recipients || '',
      enabled: values.enabled !== false,
    };
    try {
      if (editingSched) {
        await usersAPI.updateSchedule(editingSched.id, payload);
        message.success('Programación actualizada');
      } else {
        await usersAPI.createSchedule(payload);
        message.success('Programación creada');
      }
      setSchedModalVisible(false);
      fetchSchedules();
    } catch (error) {
      message.error(error.message || 'No se pudo guardar la programación');
    }
  };

  const handleDeleteSched = async (id) => {
    try {
      await usersAPI.deleteSchedule(id);
      message.success('Programación eliminada');
      fetchSchedules();
    } catch (error) {
      message.error(error.message || 'Error al eliminar la programación');
    }
  };

  const handleRunNow = async (s) => {
    setRunningId(s.id);
    try {
      const res = await usersAPI.runScheduleNow(s.id);
      if (res.data?.email_sent) {
        message.success('Reporte enviado correctamente');
      } else {
        message.warning(res.data?.message || 'No se pudo enviar (revisa destinatarios/SMTP)');
      }
    } catch (error) {
      message.error(error.message || 'Error al enviar el reporte');
    } finally {
      setRunningId(null);
    }
  };

  const scheduleColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (text, r) => <strong>{text || REPORT_TYPE_LABELS[r.report_type] || r.report_type}</strong>,
    },
    {
      title: 'Tipo de reporte',
      dataIndex: 'report_type',
      render: (t) => REPORT_TYPE_LABELS[t] || t,
    },
    {
      title: 'Cuándo',
      render: (_, r) => (
        <Space>
          <ClockCircleOutlined style={{ color: MACSA_COLORS.gray }} />
          {describeWhen(r)}
        </Space>
      ),
    },
    {
      title: 'Destinatarios',
      dataIndex: 'recipients',
      render: (t) => <Text style={{ fontSize: 13 }}>{t || '—'}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'enabled',
      align: 'center',
      render: (en) => <Tag color={en ? 'success' : 'default'}>{en ? 'Activo' : 'Pausado'}</Tag>,
    },
    {
      title: 'Acciones',
      align: 'center',
      render: (_, r) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditSched(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Enviar este reporte ahora?"
            description="Se generará y enviará de inmediato a los destinatarios."
            onConfirm={() => handleRunNow(r)}
            okText="Sí, enviar"
            cancelText="Cancelar"
          >
            <Button type="link" icon={<SendOutlined />} loading={runningId === r.id}>
              Enviar ahora
            </Button>
          </Popconfirm>
          <Popconfirm
            title="¿Eliminar esta programación?"
            onConfirm={() => handleDeleteSched(r.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
      title={<span><MailOutlined /> Programaciones de reportes</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewSched}>
          Nueva programación
        </Button>
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Define qué reporte enviar, qué días y a qué hora, y a qué correos. Los cambios se aplican de inmediato
        (el envío se ejecuta automáticamente a la hora indicada). Usa "Enviar ahora" para una prueba inmediata.
      </Text>

      <Table
        columns={scheduleColumns}
        dataSource={schedules}
        rowKey="id"
        loading={schedLoading}
        pagination={false}
      />

      <Modal
        title={editingSched ? 'Editar programación' : 'Nueva programación'}
        open={schedModalVisible}
        onCancel={() => setSchedModalVisible(false)}
        onOk={() => schedForm.submit()}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={schedForm} layout="vertical" onFinish={handleSubmitSched}>
          <Form.Item name="name" label="Nombre (opcional)">
            <Input placeholder="Ej. Ejecutivo semanal gerencia" />
          </Form.Item>

          <Form.Item
            name="report_type"
            label="Tipo de reporte"
            rules={[{ required: true, message: 'Selecciona el tipo de reporte' }]}
          >
            <Select
              options={Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          <Form.Item
            name="freq"
            label="Frecuencia"
            rules={[{ required: true, message: 'Selecciona la frecuencia' }]}
          >
            <Select
              options={Object.entries(FREQ_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          {freqWatch === 'weekly' && (
            <Form.Item
              name="days"
              label="Días de envío"
              rules={[{ required: true, message: 'Selecciona al menos un día' }]}
            >
              <Checkbox.Group options={WEEKDAYS} />
            </Form.Item>
          )}

          {freqWatch === 'monthly' && (
            <Form.Item
              name="day_of_month"
              label="Día del mes (1 a 28)"
              rules={[{ required: true, message: 'Indica el día del mes' }]}
            >
              <InputNumber min={1} max={28} style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item
            name="time"
            label="Hora de envío"
            rules={[{ required: true, message: 'Indica la hora' }]}
          >
            <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="recipients"
            label="Destinatarios"
            tooltip="Correos separados por coma"
            rules={[{ required: true, message: 'Indica al menos un destinatario' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="gerencia@macsalud.com, direccion@macsalud.com"
            />
          </Form.Item>

          <Form.Item name="enabled" label="Activa" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
    </>
  );
};

export default Users;
