# 🎯 Frontend - Inversiones

Aplicación React + TypeScript para gestión de operaciones de trading.

## 📦 Dependencias

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router v6** - Navigation
- **Axios** - HTTP client
- **Recharts** - Interactive charts
- **Supabase JS** - Backend client

## 📁 Estructura

```
src/
├── components/    # Componentes React reutilizables
├── pages/         # Páginas de la aplicación (Login, Dashboard, etc.)
├── services/      # Servicios para API calls
├── hooks/         # Custom React hooks
├── lib/           # Configuración (Supabase, etc.)
├── types/         # TypeScript types e interfaces
├── styles/        # CSS/SCSS global
├── App.tsx        # Componente principal
└── main.tsx       # Entry point
public/
├── favicon.ico
└── manifest.json
```

## 🚀 Comenzar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
# Copiar plantilla
cp .env.example .env.local

# Editar con credenciales de Supabase
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### 3. Iniciar servidor de desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

## 🏗️ Arquitectura

### Páginas (Routes)
- **LoginPage** - Autenticación Google
- **DashboardPage** - Panel principal con KPIs y charts
- **OperationsPage** - CRUD de operaciones
- **AnalysisPage** - Análisis y reportes
- **PlansPage** - Planes de ejecución

### Componentes
- **Header** - Encabezado con acciones
- **Sidebar** - Navegación
- **KPICard** - Tarjeta de métrica
- **OperationTable** - Tabla de operaciones
- **Charts** - Gráficos (usando Recharts)

### Services
- **auth.ts** - Autenticación (Google OAuth)
- **operaciones.ts** - CRUD operaciones
- **resumen.ts** - Métricas y análisis
- **usuarios.ts** - Gestión de usuario

### Hooks
- **useAuth()** - Contexto de autenticación
- **useOperations()** - Gestión de operaciones
- **useSummary()** - Estadísticas

## 📝 Convenciones

### Componentes
```typescript
// PascalCase, destructuring de props
interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  return <div>Login</div>;
};
```

### Variables y funciones
```typescript
// camelCase
const getUserData = async (userId: string) => {
  // Implementation
};
```

### Tipos
```typescript
// src/types/index.ts
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

export interface Operacion {
  id: string;
  usuario_id: string;
  par: string;
  // ...
}
```

## 🔧 Scripts

```bash
npm run dev       # Iniciar desarrollo
npm run build     # Compilar para producción
npm run preview   # Previsualizar build
npm run lint      # Linter (ESLint)
npm run format    # Formatear código (Prettier)
```

## 🌐 Integración Supabase

### Inicializar cliente
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Usar en componentes
```typescript
import { supabase } from '@lib/supabase';

const { data, error } = await supabase
  .from('operaciones')
  .select('*')
  .eq('usuario_id', userId);
```

## 🔐 Autenticación

- **Proveedor:** Google OAuth (único método)
- **Gestión:** Supabase Auth
- **Tokens:** JWT (automático)
- **Sesión:** Context API + localStorage

## 📊 Charts

Usando Recharts para gráficos interactivos:

```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

const MyChart = () => (
  <LineChart data={data} width={600} height={400}>
    <CartesianGrid />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#1E5BA8" />
  </LineChart>
);
```

## 🎨 Estilos

### CSS Variables (del prototipo)
```css
:root {
  --color-primary-dark: #0a2342;
  --color-primary: #1E5BA8;
  --color-primary-light: #2E7BC0;
  --color-success: #10B981;
  --color-danger: #EF4444;
}
```

### Usar en componentes
```tsx
<button style={{ color: 'var(--color-primary)' }}>
  Click me
</button>
```

## 🧪 Testing (Próximo)

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
npm run test
```

## 📚 Recursos

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Recharts Docs](https://recharts.org)

## 🐛 Troubleshooting

### Error: "VITE_SUPABASE_URL is undefined"
```bash
# Crear .env.local con variables correctas
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Error: "Cannot find module @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### Puerto 5173 en uso
```bash
npm run dev -- --port 3000
```

## 📞 Soporte

Ver `.instructions.md` en la raíz del proyecto para más ayuda.

---

**Prototipo:** `../prototipos/02-dashboard.html`  
**Documentación:** `../analisis/PLAN_OPTIMIZACION.md`  
**Variables de entorno:** `.env.local` (no commitear)
