import { useEffect, useState } from 'react';
import { AppIcon } from './AppIcon';
import {
  listAllUsers,
  updateUserStatus,
  assignAdminRole,
  removeAdminRole,
  UserProfile,
} from '@services/roles';
import { supabase } from '@lib/supabase';
import '../styles/admin-panel.css';

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');

  useEffect(() => {
    void loadUsers();
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setCurrentUserEmail(user?.email?.toLowerCase() ?? null);
    } catch {
      setCurrentUserId(null);
      setCurrentUserEmail(null);
    }
  }

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

  function getRoleName(user: UserProfile): 'admin' | 'user' {
    return user.roles?.name === 'admin' ? 'admin' : 'user';
  }

  function getInitials(email?: string): string {
    const value = (email ?? 'Usuario').trim();
    if (!value) return 'US';
    const local = value.split('@')[0] ?? value;
    return local.slice(0, 2).toUpperCase();
  }

  function formatDateLabel(value?: string): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleDateString('es-CO');
  }

  const filteredUsers = users.filter((user) => {
    const email = (user.email ?? '').toLowerCase();
    const matchesQuery = !query || email.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

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
      setError('Error quitando rol admin');
      console.error(err);
    }
  }

  return (
    <div className="admin-panel">
      <h2>Panel de Administración</h2>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-actions">
        <div className="admin-filters">
          <input
            className="admin-search"
            type="search"
            placeholder="Buscar por usuario"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar por usuario"
          />
          <select
            className="admin-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'active' | 'inactive')}
            aria-label="Filtrar por estado"
          >
            <option value="all">Estado: Todos</option>
            <option value="active">Activo</option>
            <option value="pending">Pendiente</option>
            <option value="inactive">Inactivo</option>
          </select>
          <button onClick={() => void loadUsers()} disabled={loading} className="btn-refresh">
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="admin-users-grid">
        {filteredUsers.map((user) => {
          const roleName = getRoleName(user);
          const normalizedEmail = (user.email ?? '').toLowerCase();
          const isSelf = user.user_id === currentUserId || (!!normalizedEmail && normalizedEmail === currentUserEmail);
          const canActivate = !isSelf && user.status !== 'active';
          const canMakeAdmin = !isSelf && roleName !== 'admin';
          const canRemoveAdmin = !isSelf && roleName === 'admin';
          const statusChipLabel = user.status === 'active' ? 'ACTIVO' : user.status === 'inactive' ? 'INACTIVO' : 'PENDIENTE';

          return (
            <article key={user.user_id} className={`admin-user-card status-${user.status}`}>
              <header className="admin-user-head">
                <div className="user-avatar-wrap">
                  <div className="user-avatar">{getInitials(user.email)}</div>
                </div>
                <div className="user-head-copy">
                  <h3>{user.email || 'Sin correo'}</h3>
                  <p className="user-id">CC: {user.user_id.slice(0, 12)}</p>
                </div>
              </header>

              <div className="chip-row">
                <span className={`status-chip status-chip-${user.status}`}>{statusChipLabel}</span>
              </div>

              <div className="chip-row">
                <span className={`role-pill role-${roleName}`}>{roleName === 'admin' ? 'ADMIN' : 'USUARIO'}</span>
              </div>

              <div className="contact-lines">
                <p><AppIcon name="mail" /> {user.email || 'Sin correo'}</p>
                <p><AppIcon name="phone" /> Sin telefono</p>
                <p><AppIcon name="location" /> Sin ciudad</p>
              </div>

              {isSelf && <p className="self-note">Tu usuario no se puede editar.</p>}

              <div className="admin-card-controls">
                <label>
                  <span className="admin-meta">ESTADO</span>
                  <select
                    value={user.status}
                    disabled={isSelf}
                    aria-label={`Estado de ${user.email || 'usuario'}`}
                    onChange={(e) =>
                      void handleStatusChange(
                        user.user_id,
                        e.target.value as 'pending' | 'active' | 'inactive'
                      )
                    }
                    className={`status-select status-${user.status}`}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>

                <div className="admin-icon-actions">
                  <button
                    type="button"
                    className="admin-icon-btn activate"
                    title="Activar usuario"
                    aria-label="Activar usuario"
                    disabled={!canActivate}
                    onClick={() => void handleStatusChange(user.user_id, 'active')}
                  >
                      <AppIcon name="check" />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn admin"
                    title="Hacer admin"
                    aria-label="Hacer admin"
                    disabled={!canMakeAdmin}
                    onClick={() => void handleAssignAdmin(user.user_id)}
                  >
                      <AppIcon name="shield" />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn remove"
                    title="Quitar admin"
                    aria-label="Quitar admin"
                    disabled={!canRemoveAdmin}
                    onClick={() => void handleRemoveAdmin(user.user_id)}
                  >
                      <AppIcon name="delete" />
                  </button>
                </div>

                <div className="card-foot">DESDE {formatDateLabel(user.created_at)}</div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <p className="empty-state">No hay usuarios registrados</p>
      )}
    </div>
  );
}
