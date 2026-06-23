import { useEffect, useState } from 'react';
import {
  listAllUsers,
  updateUserStatus,
  assignAdminRole,
  removeAdminRole,
  UserProfile,
} from '@services/roles';
import '../styles/admin-panel.css';

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllUsers();
      setUsers(data);
    } catch (err) {
      setError('Error cargando usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    userId: string,
    newStatus: 'pending' | 'active' | 'inactive'
  ) {
    try {
      await updateUserStatus(userId, newStatus);
      setUsers(
        users.map((u) => (u.user_id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      setError('Error actualizando estado del usuario');
      console.error(err);
    }
  }

  async function handleAssignAdmin(userId: string) {
    try {
      await assignAdminRole(userId);
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? { ...u, roles: { name: 'admin' } }
            : u
        )
      );
    } catch (err) {
      setError('Error asignando rol admin');
      console.error(err);
    }
  }

  async function handleRemoveAdmin(userId: string) {
    try {
      await removeAdminRole(userId);
      setUsers(
        users.map((u) =>
          u.user_id === userId
            ? { ...u, roles: { name: 'user' } }
            : u
        )
      );
    } catch (err) {
      setError('Error removiendo rol admin');
      console.error(err);
    }
  }

  return (
    <div className="admin-panel">
      <h2>Panel de Administración</h2>
      
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-actions">
        <button
          onClick={loadUsers}
          disabled={loading}
          className="btn-refresh"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className={`status-${user.status}`}>
                <td>{user.email || 'Sin email'}</td>
                <td>{user.roles?.name === 'admin' ? '👤 Admin' : '👥 Usuario'}</td>
                <td>
                  <select
                    value={user.status}
                    onChange={(e) =>
                      handleStatusChange(
                        user.user_id,
                        e.target.value as 'pending' | 'active' | 'inactive'
                      )
                    }
                    className={`status-select status-${user.status}`}
                  >
                    <option value="pending">⏳ Pendiente</option>
                    <option value="active">✅ Activo</option>
                    <option value="inactive">❌ Inactivo</option>
                  </select>
                </td>
                <td className="actions-cell">
                  {user.roles?.name === 'admin' ? (
                    <button
                      onClick={() => handleRemoveAdmin(user.user_id)}
                      className="btn-remove-admin"
                      title="Remover permisos de administrador"
                    >
                      Remover Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssignAdmin(user.user_id)}
                      className="btn-assign-admin"
                      title="Asignar permisos de administrador"
                    >
                      Hacer Admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <p className="empty-state">No hay usuarios registrados</p>
      )}
    </div>
  );
}
