// pages/Users.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Switch, FormControlLabel, Alert, Chip
} from '@mui/material';
import { Add, Edit, Delete, PersonAdd } from '@mui/icons-material';
import axios from 'axios';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '',
    access_dashboard: true, access_calls: true, access_queues: true,
    access_agents: true, access_reports: true, is_active: true
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://192.168.11.3:8000/api/users/list');
      setUsers(response.data.data);
    } catch (err) {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditUser(user);
      setFormData({
        username: user.username, email: user.email, password: '', full_name: user.full_name,
        access_dashboard: Boolean(user.access_dashboard), access_calls: Boolean(user.access_calls),
        access_queues: Boolean(user.access_queues), access_agents: Boolean(user.access_agents),
        access_reports: Boolean(user.access_reports), is_active: Boolean(user.is_active)
      });
    } else {
      setEditUser(null);
      setFormData({
        username: '', email: '', password: '', full_name: '',
        access_dashboard: true, access_calls: true, access_queues: true,
        access_agents: true, access_reports: true, is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        delete updateData.username;
        await axios.put(`http://192.168.11.3:8000/api/users/update/${editUser.id}`, updateData);
      } else {
        await axios.post('http://192.168.11.3:8000/api/users/create', formData);
      }
      setOpenDialog(false);
      loadUsers();
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await axios.delete(`http://192.168.11.3:8000/api/users/delete/${userId}`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Administración de Usuarios</Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenDialog()}>
          Nuevo Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Permisos</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><strong>{user.username}</strong></TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip label={user.is_active ? 'Activo' : 'Inactivo'}
                        color={user.is_active ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  {user.access_dashboard && <Chip label="Dashboard" size="small" sx={{ mr: 0.5 }} />}
                  {user.access_calls && <Chip label="Llamadas" size="small" sx={{ mr: 0.5 }} />}
                  {user.access_queues && <Chip label="Colas" size="small" sx={{ mr: 0.5 }} />}
                  {user.access_agents && <Chip label="Agentes" size="small" sx={{ mr: 0.5 }} />}
                  {user.access_reports && <Chip label="Reportes" size="small" />}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                    <Edit />
                  </IconButton>
                  {user.id !== 1 && (
                    <IconButton size="small" onClick={() => handleDelete(user.id)} color="error">
                      <Delete />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Usuario" value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            margin="normal" disabled={!!editUser} />
          <TextField fullWidth label="Nombre Completo" value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})} margin="normal" />
          <TextField fullWidth label="Email" value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})} margin="normal" />
          <TextField fullWidth label={editUser ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            type="password" value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})} margin="normal" />

          {editUser && (
            <FormControlLabel control={<Switch checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />}
              label="Usuario Activo" sx={{ mt: 2 }} />
          )}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Permisos de Acceso:</Typography>
          <FormControlLabel control={<Switch checked={formData.access_dashboard}
            onChange={(e) => setFormData({...formData, access_dashboard: e.target.checked})} />}
            label="Dashboard" />
          <FormControlLabel control={<Switch checked={formData.access_calls}
            onChange={(e) => setFormData({...formData, access_calls: e.target.checked})} />}
            label="Llamadas" />
          <FormControlLabel control={<Switch checked={formData.access_queues}
            onChange={(e) => setFormData({...formData, access_queues: e.target.checked})} />}
            label="Colas" />
          <FormControlLabel control={<Switch checked={formData.access_agents}
            onChange={(e) => setFormData({...formData, access_agents: e.target.checked})} />}
            label="Agentes" />
          <FormControlLabel control={<Switch checked={formData.access_reports}
            onChange={(e) => setFormData({...formData, access_reports: e.target.checked})} />}
            label="Reportes" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
