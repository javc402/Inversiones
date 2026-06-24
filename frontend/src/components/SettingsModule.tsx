import { FormEvent, useEffect, useState } from 'react';
import { AppIcon } from './AppIcon';
import { useSystemConfig, ConfigItem, SystemConfig } from '@hooks/useSystemConfig';
import '../styles/settings-module.css';

type SettingsSection = 'perfil' | 'tipos-cuenta' | 'plataformas' | 'monedas';
type ConfigKey = 'accountTypes' | 'platforms' | 'currencies';

function isSettingsSection(value: string | null): value is SettingsSection {
  return value === 'perfil' || value === 'tipos-cuenta' || value === 'plataformas' || value === 'monedas';
}

interface UserProfileData {
  fullName: string;
  phone: string;
  city: string;
  country: string;
}

interface SettingsModuleProps {
  userEmail: string;
  isAdmin: boolean;
}

function makeProfileKey(email: string): string {
  return `inversiones_profile_${email}`;
}

function loadProfile(email: string): UserProfileData {
  try {
    const stored = localStorage.getItem(makeProfileKey(email));
    if (stored) return JSON.parse(stored) as UserProfileData;
  } catch {
    // ignore
  }
  return { fullName: '', phone: '', city: '', country: '' };
}

interface ConfigListProps {
  title: string;
  description: string;
  items: ConfigItem[];
  configKey: ConfigKey;
  config: SystemConfig;
  onUpdate: (next: SystemConfig) => Promise<void>;
}

function ConfigList({ title, description, items, configKey, config, onUpdate }: ConfigListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ConfigItem | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addError, setAddError] = useState('');

  function startEdit(item: ConfigItem) {
    setEditingId(item.id);
    setEditForm({ ...item });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!editForm) return;
    const updated = items.map((i) => (i.id === editingId ? editForm : i));
    try {
      await onUpdate({ ...config, [configKey]: updated });
      setAddError('');
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el cambio.';
      setAddError(message);
    }
  }

  async function deleteItem(id: string) {
    const updated = items.filter((i) => i.id !== id);
    try {
      await onUpdate({ ...config, [configKey]: updated });
      setAddError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el ítem.';
      setAddError(message);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');
    const labelTrimmed = newLabel.trim();
    const valueTrimmed = newValue.trim();

    if (!labelTrimmed || !valueTrimmed) {
      setAddError('Nombre y valor son requeridos.');
      return;
    }
    if (items.some((i) => i.value === valueTrimmed)) {
      setAddError('Ya existe un ítem con ese valor.');
      return;
    }

    const newItem: ConfigItem = {
      id: `${configKey}-${Date.now()}`,
      label: labelTrimmed,
      value: valueTrimmed,
      description: newDesc.trim() || undefined,
    };

    try {
      await onUpdate({ ...config, [configKey]: [...items, newItem] });
      setNewLabel('');
      setNewValue('');
      setNewDesc('');
      setAddError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agregar el ítem.';
      setAddError(message);
    }
  }

  return (
    <div className="settings-content-section">
      <h2 className="settings-content-title">{title}</h2>
      <p className="settings-content-desc">{description}</p>

      <div className="settings-config-list">
        {items.map((item) => (
          <div key={item.id} className="settings-config-item">
            {editingId === item.id && editForm ? (
              <div className="settings-config-item-edit">
                <input
                  className="settings-input"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Nombre"
                  aria-label="Editar nombre"
                />
                <input
                  className="settings-input"
                  value={editForm.value}
                  onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                  placeholder="Valor"
                  aria-label="Editar valor"
                />
                <input
                  className="settings-input"
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descripción (opcional)"
                  aria-label="Editar descripción"
                />
                <div className="settings-config-item-actions">
                  <button type="button" className="settings-btn-save" onClick={() => void saveEdit()}>
                    Guardar
                  </button>
                  <button type="button" className="settings-btn-cancel" onClick={cancelEdit}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-config-item-row">
                <div className="settings-config-item-info">
                  <span className="settings-config-item-label">{item.label}</span>
                  {item.description && (
                    <span className="settings-config-item-desc">{item.description}</span>
                  )}
                </div>
                <div className="settings-config-item-actions">
                  <button
                    type="button"
                    className="settings-btn-edit"
                    onClick={() => startEdit(item)}
                    aria-label={`Editar ${item.label}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="settings-btn-delete"
                    onClick={() => void deleteItem(item.id)}
                    aria-label={`Eliminar ${item.label}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="settings-config-add" onSubmit={handleAdd}>
        <p className="settings-config-add-title">Agregar {title.toLowerCase()}</p>
        {addError && <p className="settings-add-error">{addError}</p>}
        <div className="settings-config-add-fields">
          <input
            className="settings-input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nombre *"
            aria-label={`Nuevo nombre para ${title}`}
          />
          <input
            className="settings-input"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Valor clave * (ej: usd, mt5)"
            aria-label={`Nuevo valor para ${title}`}
          />
          <input
            className="settings-input"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            aria-label={`Nueva descripción para ${title}`}
          />
          <button type="submit" className="settings-btn-add">
            + Agregar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsModule({ userEmail, isAdmin }: Readonly<SettingsModuleProps>) {
  const settingsSectionStorageKey = `inversiones_settings_active_section_${userEmail}`;
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window === 'undefined') return 'perfil';
    try {
      const stored = localStorage.getItem(settingsSectionStorageKey);
      if (isSettingsSection(stored)) return stored;
    } catch {
      // ignore
    }
    return 'perfil';
  });
  const { config, updateConfig } = useSystemConfig();

  const [profile, setProfile] = useState<UserProfileData>(() => loadProfile(userEmail));
  const [profileSaved, setProfileSaved] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(settingsSectionStorageKey);
      if (isSettingsSection(stored)) {
        setActiveSection(stored);
        return;
      }
    } catch {
      // ignore
    }
    setActiveSection('perfil');
  }, [settingsSectionStorageKey]);

  useEffect(() => {
    if (!isAdmin && activeSection !== 'perfil') {
      setActiveSection('perfil');
    }
  }, [isAdmin, activeSection]);

  useEffect(() => {
    try {
      localStorage.setItem(settingsSectionStorageKey, activeSection);
    } catch {
      // ignore
    }
  }, [activeSection, settingsSectionStorageKey]);

  function handleProfileChange(field: keyof UserProfileData, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileSaved(false);
  }

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(makeProfileKey(userEmail), JSON.stringify(profile));
      setProfileSaved(true);
    } catch {
      // ignore
    }
  }

  const sectionNav = [
    { id: 'perfil' as SettingsSection, label: 'Perfil', group: 'Mi cuenta', adminOnly: false, icon: 'users' as const },
    { id: 'tipos-cuenta' as SettingsSection, label: 'Tipos de cuenta', group: 'Sistema', adminOnly: true, icon: 'accounts' as const },
    { id: 'plataformas' as SettingsSection, label: 'Plataformas', group: 'Sistema', adminOnly: true, icon: 'dashboard' as const },
    { id: 'monedas' as SettingsSection, label: 'Monedas base', group: 'Sistema', adminOnly: true, icon: 'settings' as const },
  ];

  const visibleNav = sectionNav.filter((s) => !s.adminOnly || isAdmin);
  const groups = [...new Set(visibleNav.map((s) => s.group))];

  async function handleConfigUpdate(next: SystemConfig): Promise<void> {
    setAdminActionError('');
    try {
      await updateConfig(next);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar. Contacta a un administrador del sistema.';
      setAdminActionError(message);
      throw error;
    }
  }

  function renderContent() {
    if (activeSection === 'perfil') {
      return (
        <div className="settings-content-section">
          <h2 className="settings-content-title">Información personal</h2>
          <p className="settings-content-desc">
            Actualiza tus datos de contacto y perfil de operador para mantenerlos al día.
          </p>

          <form className="settings-profile-form" onSubmit={handleSaveProfile}>
            <div className="settings-profile-grid">
              <label className="settings-label">
                <span>Nombre completo</span>
                <input
                  className="settings-input"
                  value={profile.fullName}
                  onChange={(e) => handleProfileChange('fullName', e.target.value)}
                  placeholder="Tu nombre completo"
                  aria-label="Nombre completo"
                />
              </label>

              <label className="settings-label">
                <span>Teléfono</span>
                <input
                  className="settings-input"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+57 300 000 0000"
                  aria-label="Teléfono"
                />
              </label>

              <label className="settings-label">
                <span>Ciudad</span>
                <input
                  className="settings-input"
                  value={profile.city}
                  onChange={(e) => handleProfileChange('city', e.target.value)}
                  placeholder="Tu ciudad"
                  aria-label="Ciudad"
                />
              </label>

              <label className="settings-label">
                <span>País</span>
                <input
                  className="settings-input"
                  value={profile.country}
                  onChange={(e) => handleProfileChange('country', e.target.value)}
                  placeholder="Tu país"
                  aria-label="País"
                />
              </label>

              <label className="settings-label settings-label-full">
                <span>Correo electrónico</span>
                <input
                  className="settings-input settings-input-readonly"
                  value={userEmail}
                  readOnly
                  aria-label="Correo electrónico"
                />
                <span className="settings-input-hint">
                  El correo está vinculado a tu cuenta de acceso y no puede modificarse aquí.
                </span>
              </label>
            </div>

            <div className="settings-profile-actions">
              {profileSaved && <span className="settings-saved-badge">Cambios guardados</span>}
              <button type="submit" className="primary-btn settings-save-btn">
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (activeSection === 'tipos-cuenta') {
      return (
        <ConfigList
          title="Tipos de cuenta"
          description="Define los tipos de cuenta disponibles al registrar o editar una cuenta de trading."
          items={config.accountTypes}
          configKey="accountTypes"
          config={config}
          onUpdate={handleConfigUpdate}
        />
      );
    }

    if (activeSection === 'plataformas') {
      return (
        <ConfigList
          title="Plataformas"
          description="Gestiona las plataformas de trading disponibles en el formulario de cuentas."
          items={config.platforms}
          configKey="platforms"
          config={config}
          onUpdate={handleConfigUpdate}
        />
      );
    }

    if (activeSection === 'monedas') {
      return (
        <ConfigList
          title="Monedas base"
          description="Define las monedas base disponibles para las cuentas de trading."
          items={config.currencies}
          configKey="currencies"
          config={config}
          onUpdate={handleConfigUpdate}
        />
      );
    }

    return null;
  }

  return (
    <div className="settings-module">
      <nav className="settings-sidebar" aria-label="Secciones de configuración">
        {groups.map((group) => (
          <div key={group} className="settings-nav-group">
            <p className="settings-nav-group-title">{group}</p>
            {visibleNav
              .filter((s) => s.group === group)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.id)}
                  aria-current={activeSection === s.id ? 'page' : undefined}
                >
                  <AppIcon name={s.icon} className="settings-nav-icon" />
                  {s.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <main className="settings-content" aria-label="Contenido de configuración">
        {adminActionError && <p className="settings-add-error">{adminActionError}</p>}
        {renderContent()}
      </main>
    </div>
  );
}
