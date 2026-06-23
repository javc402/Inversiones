# 📐 Arquitectura de la Aplicación

## 🏗️ Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                         │
├─────────────────────────────────────────────────────────────────┤
│  React App (TypeScript + Vite)                                  │
│  ├── Pages (Login, Dashboard, Operations, Analysis)             │
│  ├── Components (Header, Sidebar, Charts, Tables)               │
│  ├── Services (API calls, Auth, Data fetching)                  │
│  └── Hooks (useAuth, useOperations, useSummary)                 │
├─────────────────────────────────────────────────────────────────┤
│  HTTP/REST                                                      │
├─────────────────────────────────────────────────────────────────┤
│              SUPABASE (Backend as a Service)                    │
│  ├── Authentication (Google OAuth)                              │
│  ├── PostgreSQL Database                                        │
│  │   ├── usuarios                                               │
│  │   ├── operaciones                                            │
│  │   ├── planes_ejecucion                                       │
│  │   ├── resumen_desempeño                                      │
│  │   └── capital_disponible                                     │
│  └── REST API (PostgREST)                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Flujo de Datos

### Login
```
Usuario → Google OAuth Button
    ↓
Supabase Auth (Google)
    ↓
JWT Token + User Session
    ↓
Redirect a Dashboard
```

### Cargar Operaciones
```
ComponentDidMount / useEffect
    ↓
supabase.from('operaciones').select()
    ↓
Filter by usuario_id (RLS automático)
    ↓
Backend API REST
    ↓
PostgreSQL Query
    ↓
Return JSON Array
    ↓
Update State
    ↓
Re-render Component
```

### Crear Operación
```
Form Submit
    ↓
Validate Input
    ↓
supabase.from('operaciones').insert()
    ↓
Backend: Validar RLS
    ↓
PostgreSQL: INSERT
    ↓
Return created record
    ↓
Update UI (state)
    ↓
Show success message
```

## 🗂️ Estructura de Carpetas

```
d:/Proyectos/Excel/
├── frontend/                          # React App
│   ├── src/
│   │   ├── pages/                     # Página completa
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── OperationsPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   └── PlansPage.tsx
│   │   ├── components/                # Componentes reutilizables
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── OperationTable.tsx
│   │   │   ├── LineChart.tsx
│   │   │   └── DonutChart.tsx
│   │   ├── services/                  # Llamadas API
│   │   │   ├── auth.ts
│   │   │   ├── operaciones.ts
│   │   │   ├── resumen.ts
│   │   │   └── usuarios.ts
│   │   ├── hooks/                     # Custom Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useOperations.ts
│   │   │   └── useSummary.ts
│   │   ├── lib/                       # Configuración
│   │   │   ├── supabase.ts
│   │   │   └── constants.ts
│   │   ├── types/                     # TypeScript tipos
│   │   │   └── index.ts
│   │   ├── styles/                    # CSS
│   │   │   ├── index.css
│   │   │   └── App.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── backend/                           # Servicios Backend
│   ├── src/
│   │   ├── services/
│   │   │   ├── calculations.ts        # Lógica financiera
│   │   │   ├── validation.ts          # Validaciones
│   │   │   └── analytics.ts           # Análisis
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── constants.ts
│   │       └── helpers.ts
│   └── README.md
│
├── prototipos/                        # Prototipo HTML/CSS
│   ├── 01-login.html
│   ├── 02-dashboard.html
│   ├── index.html
│   ├── assets/css/paleta.css
│   └── README.md
│
├── analisis/                          # Documentación
│   ├── ESTRUCTURA_EXCEL.md
│   ├── PLAN_OPTIMIZACION.md
│   └── GIT_WORKFLOW.md
│
├── docs/                              # Documentación adicional
│   ├── DATABASE_SETUP.md              # Configurar BD
│   ├── DEPLOYMENT.md                  # Desplegar
│   ├── api/
│   │   └── REST_API.md
│   ├── database/
│   └── deployment/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Tests y lint
│       └── deploy.yml                 # Deploy automático
│
├── .instructions.md                   # Guía para developers
├── .copilot-instructions.md           # Contexto Copilot
├── README.md                          # Overview
└── .git/                              # Git repository
```

## 🔄 Componentes Principales

### LoginPage
```
┌─────────────────────────────────────┐
│          LoginPage                  │
├─────────────────────────────────────┤
│  ├── useAuth Hook (Google)          │
│  ├── Form (Email, Password)         │
│  ├── Google OAuth Button            │
│  └── Error Handler                  │
└─────────────────────────────────────┘
```

### DashboardPage
```
┌─────────────────────────────────────┐
│       DashboardPage                 │
├─────────────────────────────────────┤
│  Header                             │
│  ├── Welcome Message                │
│  ├── Notifications                  │
│  └── Settings / Logout              │
├─────────────────────────────────────┤
│  KPI Cards (4x)                     │
│  ├── Ganancia del Mes               │
│  ├── Crecimiento                    │
│  ├── Tasa de Éxito                  │
│  └── Riesgo en Abierto              │
├─────────────────────────────────────┤
│  Charts (2x)                        │
│  ├── LineChart (Evolución)          │
│  └── DonutChart (Distribución)      │
├─────────────────────────────────────┤
│  OperationTable                     │
│  └── Últimas 5 operaciones          │
└─────────────────────────────────────┘
```

## 🔐 Flujo de Autenticación

```
1. Usuario abre app
   ↓
2. Comprobar sesión en localStorage
   ↓
3a. Si existe token válido → Ir a Dashboard
   ↓
3b. Si no existe → Mostrar LoginPage
   ↓
4. Usuario hace click "Iniciar con Google"
   ↓
5. Redirige a Google OAuth
   ↓
6. Usuario autoriza
   ↓
7. Supabase recibe código
   ↓
8. Supabase genera JWT
   ↓
9. Guardar token en localStorage
   ↓
10. Redirigir a Dashboard
```

## 🗄️ Relaciones Base de Datos

```
usuarios (1) ─────────── (N) operaciones
   │
   ├─────────── (N) planes_ejecucion
   │
   ├─────────── (N) resumen_desempeño
   │
   └─────────── (1) capital_disponible
```

## 🔄 Estados (State Management)

### Global (Context)
```typescript
// AuthContext - Usuario logueado
- user: Usuario | null
- loading: boolean
- error: string | null
- login(): void
- logout(): void

// OperationsContext - Operaciones
- operations: Operacion[]
- loading: boolean
- error: string | null
- fetchOperations(): void
- addOperation(op): void
- updateOperation(id, op): void
- deleteOperation(id): void

// SummaryContext - Estadísticas
- summary: Summary | null
- loading: boolean
- fetchSummary(): void
```

### Local (Component State)
```typescript
// Formularios
- formData: FormData
- errors: FormErrors
- isSubmitting: boolean

// UI
- isMenuOpen: boolean
- isModalOpen: boolean
- currentPage: number
```

## 📡 API Calls Pattern

```typescript
// src/services/operaciones.ts
export const getOperaciones = async (userId: string) => {
  const { data, error } = await supabase
    .from('operaciones')
    .select('*')
    .eq('usuario_id', userId)
    .order('fecha', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data;
};

// Usar en componente
const { data: operations, error } = await getOperaciones(userId);
```

## 🎨 Paleta de Colores (CSS Variables)

```css
:root {
  --color-primary-dark: #0a2342;
  --color-primary: #1E5BA8;
  --color-primary-light: #2E7BC0;
  --color-primary-lighter: #E8F2FF;
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #06B6D4;
}
```

## 🚀 Performance Optimizations

1. **Code Splitting** - Lazy load pages con React.lazy()
2. **Memoization** - useMemo() para cálculos pesados
3. **Virtualization** - Para tablas grandes (react-window)
4. **Caching** - Supabase PostgREST cachea resultados
5. **Indexing** - BD tiene índices en usuario_id, fecha

## 🔗 Integración Continua

```
Git Push
    ↓
GitHub Actions (CI)
    ├─ Lint check
    ├─ Type check
    ├─ Build test
    └─ Deploy (si es main)
```

---

**Stack:** React + TypeScript + Supabase + Vite  
**Hosting:** GitHub Pages (frontend) + Supabase (backend)  
**Auth:** Google OAuth  
**Database:** PostgreSQL
