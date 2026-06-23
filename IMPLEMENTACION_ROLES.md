## Guía de Implementación: Sistema de Roles

### Estado del Sistema

✅ **Completado:**
- Tablas de roles y perfiles en Supabase creadas
- Servicios de gestión de roles (roles.ts)
- Componente AdminPanel para dashboard
- Tests para servicios y componentes
- Migraciones SQL preparadas
- Trigger automático para crear perfiles

⬜ **Pendiente de Implementación:**

1. **Integración en LoginPage**
   - Mostrar mensaje si usuario está en estado "pending" o "inactive"
   - Redirigir usuario inactivo a pantalla de "Acceso denegado"

2. **Integración en App.tsx**
   - Verificar estado del usuario después de autenticarse
   - Si estado es "inactive": mostrar error y no permitir acceso
   - Si estado es "pending": mostrar mensaje "Pendiente aprobación del admin"

3. **Notificaciones a Admin**
   - Enviar email cuando hay nuevo usuario pendiente
   - Dashboard muestra número de usuarios pendientes

4. **Actualizar LoginPage para manejar respuesta de signup**

### Instrucciones de Ejecución

#### 1. En Supabase SQL Editor

Ejecuta estas 3 migraciones en orden:

**Script 1: Crear tablas y políticas**
```
Archivo: backend/migrations/001_create_roles_system.sql
```

**Script 2: Crear trigger para perfiles automáticos**
```
Archivo: backend/migrations/003_create_user_profile_trigger.sql
```

**Script 3: Crear usuario admin (después de agregar el usuario en Auth)**
```
Archivo: backend/migrations/002_create_admin_user.sql
Reemplazar YOUR_ADMIN_UUID con el UUID real del usuario
```

#### 2. En GitHub (CI/CD)

Cuando commitees los cambios:
```bash
git add frontend/src/services/roles.ts
git add frontend/src/components/AdminPanel.tsx
git add frontend/src/services/roles.test.ts
git add frontend/src/components/AdminPanel.test.tsx
git add frontend/src/styles/admin-panel.css
git add backend/migrations/
git add backend/ROLES_SETUP.md
git commit -m "feat: agregar sistema de roles y panel de administración"
git push origin dev
```

#### 3. Integración en DashboardPage.tsx

Agregar import y condicional:
```typescript
import AdminPanel from '@components/AdminPanel';
import { getCurrentUserRole } from '@services/roles';

// En el componente:
const [userRole, setUserRole] = useState<Role | null>(null);

useEffect(() => {
  async function loadRole() {
    const role = await getCurrentUserRole();
    setUserRole(role);
  }
  loadRole();
}, []);

// En el render:
{userRole?.name === 'admin' && <AdminPanel />}
```

#### 4. Verificar Acceso Basado en Estado

En App.tsx o LoginPage, después de iniciar sesión:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('user_profiles')
  .select('status')
  .eq('user_id', user.id)
  .single();

if (profile?.status === 'inactive') {
  // Mostrar error: Usuario inactivo
}

if (profile?.status === 'pending') {
  // Mostrar: Pendiente aprobación del admin
}

if (profile?.status === 'active') {
  // Permitir acceso
}
```

### Flujo Completo

```
1. Usuario se registra
   ↓
2. Se crea perfil con estado "pending"
   ↓
3. Admin ve en AdminPanel
   ↓
4. Admin aprueba (cambia a "active")
   ↓
5. Usuario puede iniciar sesión
```

### Seguridad

✅ Las políticas RLS garantizan:
- Solo admins ven todos los usuarios
- Usuarios normales solo ven su propio perfil
- Solo admins pueden cambiar estados y roles
- Los cambios se registran con timestamp updated_at

### Próximos Pasos Recomendados

1. **Notificaciones por Email**
   - Crear función Supabase que envíe email a admin cuando hay nuevo usuario
   - Enviar email a usuario cuando es aprobado

2. **Auditoría**
   - Crear tabla de logs para cambios de estado/rol
   - Registrar quién hizo qué cambio y cuándo

3. **Dashboard Mejorado**
   - Mostrar contador de usuarios por estado
   - Gráficos de crecimiento de usuarios
   - Búsqueda y filtros

4. **Verificación de Email**
   - Requerir verificación de email antes de permitir login
   - Enviar enlace de confirmación en signup
