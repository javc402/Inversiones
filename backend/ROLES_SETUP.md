# Sistema de Roles y Administración de Usuarios

## Descripción

Sistema de gestión de roles y usuarios para Inversiones con dos niveles:
- **Admin**: Puede aprobar/rechazar registros, cambiar estados de usuarios y asignar/remover roles
- **User**: Usuario regular que puede usar la aplicación

## Configuración Inicial

### Paso 1: Ejecutar Migraciones SQL en Supabase

1. Ve a tu proyecto Supabase: https://app.supabase.com
2. Abre el SQL Editor en el panel izquierdo
3. Crea una nueva query y copia el contenido de:
   - `backend/migrations/001_create_roles_system.sql`
4. Ejecuta la query (Ctrl+Enter)

**Resultado esperado:**
- Tabla `roles` creada con valores: admin, user
- Tabla `user_profiles` creada con políticas RLS

### Paso 2: Crear Usuario Admin en Supabase Auth

1. Ve a **Authentication > Users** en tu dashboard Supabase
2. Haz clic en **Add user** (arriba a la derecha)
3. Llena el formulario:
   - **Email**: `jorgeac.villalobos@gmail.com`
   - **Password**: `Admin@Inversiones2026!` (generada con 8+ caracteres, mayúsculas, números y símbolos)
   - ☑️ **Auto generate password** (desmarca para usar la contraseña anterior)
4. Haz clic en **Save user**
5. **IMPORTANTE**: Copia el UUID del usuario (ID mostrado en la tabla)

### Paso 3: Asignar Rol Admin al Usuario

1. Regresa al SQL Editor en Supabase
2. Copia el contenido de `backend/migrations/002_create_admin_user.sql`
3. **REEMPLAZA** `YOUR_ADMIN_UUID` con el UUID copiado en el Paso 2
4. Ejecuta la query

**Ejemplo:**
```sql
INSERT INTO user_profiles (user_id, role_id, status)
SELECT '550e8400-e29b-41d4-a716-446655440000'::UUID, id, 'active'
FROM roles WHERE name = 'admin'
ON CONFLICT (user_id) DO NOTHING;
```

### Paso 4: Verificar Configuración

Ejecuta esta query para verificar:
```sql
SELECT up.user_id, up.status, r.name as role
FROM user_profiles up
JOIN roles r ON up.role_id = r.id
WHERE r.name = 'admin';
```

Deberías ver una fila con el UUID del admin y estado `active`.

## Flujo de Gestión de Usuarios

### Nuevo Registro de Usuario

1. Usuario se registra en LoginPage
2. Su perfil se crea con estado `pending`
3. Aparece en Admin Panel bajo "Pendientes"
4. Admin puede:
   - ✅ **Aprobar**: Cambiar estado a `active`
   - ❌ **Rechazar**: Cambiar estado a `inactive`

### Gestión en Admin Panel

El panel de administración permite:

```
📋 Lista de Usuarios
├─ Email del usuario
├─ Rol actual (User o Admin)
├─ Estado (Pendiente/Activo/Inactivo)
└─ Acciones
   ├─ Cambiar estado
   └─ Asignar/Remover rol Admin
```

## Integrando Admin Panel en la Aplicación

### En DashboardPage.tsx

```typescript
import AdminPanel from '@components/AdminPanel';
import { getCurrentUserRole } from '@services/roles';

function DashboardPage({ userEmail, onSignOut }: Props) {
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    async function loadUserRole() {
      const role = await getCurrentUserRole();
      setUserRole(role);
    }
    loadUserRole();
  }, []);

  return (
    <div className="dashboard-layout">
      {/* Contenido normal del dashboard */}
      
      {/* Mostrar panel de admin solo si es admin */}
      {userRole?.name === 'admin' && <AdminPanel />}
    </div>
  );
}
```

## Servicios Disponibles

### roles.ts

#### `getCurrentUserRole(): Promise<Role | null>`
Obtiene el rol del usuario actual (admin o user)

#### `getCurrentUserProfile(): Promise<UserProfile | null>`
Obtiene información completa del perfil del usuario

#### `listAllUsers(): Promise<UserProfile[]>`
Lista todos los usuarios (solo accesible a admins por RLS)

#### `updateUserStatus(userId: string, status: 'pending' | 'active' | 'inactive'): Promise<void>`
Cambia el estado de un usuario

#### `assignAdminRole(userId: string): Promise<void>`
Asigna rol admin a un usuario

#### `removeAdminRole(userId: string): Promise<void>`
Remueve rol admin (asigna rol user)

#### `approveUserRegistration(userId: string): Promise<void>`
Aprueba un nuevo registro (cambiar de pending a active)

#### `rejectUserRegistration(userId: string): Promise<void>`
Rechaza un registro (cambiar de pending a inactive)

## Seguridad (Row Level Security)

Las políticas RLS garantizan:
- ✅ Solo admins pueden ver todos los usuarios
- ✅ Los usuarios solo ven su propio perfil
- ✅ Solo admins pueden cambiar estados y roles
- ✅ Cualquiera puede ver la lista de roles disponibles

## Contraseña Segura del Admin

**Email**: `jorgeac.villalobos@gmail.com`
**Contraseña**: `Admin@Inversiones2026!`

Esta contraseña cumple con:
- ✓ 22 caracteres (muy segura)
- ✓ Mayúsculas y minúsculas
- ✓ Números
- ✓ Caracteres especiales (@, !)
- ✓ No contiene información personal

## Próximos Pasos

1. ✅ Ejecutar migraciones SQL
2. ✅ Crear usuario admin en Supabase
3. ✅ Asignar rol admin al usuario
4. ⬜ Integrar AdminPanel en DashboardPage
5. ⬜ Actualizar LoginPage para crear perfil en user_profiles
6. ⬜ Implementar verificación de estado (active/pending/inactive)
7. ⬜ Agregar notificaciones a admins de nuevos registros
