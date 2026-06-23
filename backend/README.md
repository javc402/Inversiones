# 🔧 Backend - Inversiones

Servicios backend para la aplicación Inversiones.

## 📋 Descripción

Este folder contiene:
- Servicios de negocio (utilidades, cálculos)
- Funciones auxiliares
- Middleware y hooks personalizados
- Validaciones y reglas de negocio

**Nota:** La mayoría de la lógica backend está en **Supabase (PostgreSQL + REST API auto-generada)**.

## 📁 Estructura

```
src/
├── services/      # Servicios de negocio
│   ├── calculations.ts    # Cálculos financieros
│   ├── validation.ts      # Validaciones
│   └── analytics.ts       # Análisis de datos
└── utils/         # Utilidades
    ├── formatters.ts      # Formateadores
    ├── constants.ts       # Constantes
    └── helpers.ts         # Helpers generales
```

## 🗄️ Base de Datos

La base de datos está en **Supabase** (PostgreSQL).

### Tablas Principales

```sql
-- Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  nombre VARCHAR(255),
  created_at TIMESTAMP
);

-- Operaciones
CREATE TABLE operaciones (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  par VARCHAR(10),       -- EURUSD, GBPUSD, etc.
  tipo VARCHAR(10),      -- BUY, SELL
  fecha DATE,
  hora_entrada TIME,
  hora_salida TIME,
  precio_entrada DECIMAL,
  precio_salida DECIMAL,
  ganancia DECIMAL,
  drawdown DECIMAL,
  rr_ratio DECIMAL,
  estado VARCHAR(50),    -- ABIERTA, CERRADA, CANCELADA
  created_at TIMESTAMP
);

-- Planes de Ejecución
CREATE TABLE planes_ejecucion (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  ganancia_diaria_objetivo DECIMAL,
  loss_máximo_diario DECIMAL,
  riesgo_máximo_por_operación DECIMAL,
  operaciones_máximas_diarias INT,
  created_at TIMESTAMP
);

-- Resumen de Desempeño
CREATE TABLE resumen_desempeño (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  fecha DATE,
  ganancia_total DECIMAL,
  pérdida_total DECIMAL,
  win_rate DECIMAL,
  operaciones_ganadas INT,
  operaciones_perdidas INT,
  created_at TIMESTAMP
);

-- Capital Disponible
CREATE TABLE capital_disponible (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  capital_inicial DECIMAL,
  capital_actual DECIMAL,
  última_actualización TIMESTAMP
);
```

## 🔌 API REST (Auto-generada)

Supabase genera automáticamente endpoints REST desde las tablas:

```
GET    /rest/v1/operaciones
POST   /rest/v1/operaciones
PUT    /rest/v1/operaciones?id=eq.UUID
DELETE /rest/v1/operaciones?id=eq.UUID
```

## 📊 Servicios Principales

### 1. Cálculos Financieros
```typescript
// src/services/calculations.ts
export const calculateWinRate = (
  operacionesGanadas: number,
  operacionesTotales: number
): number => {
  return (operacionesGanadas / operacionesTotales) * 100;
};

export const calculateDrawdown = (
  balance: number,
  balanceMáximo: number
): number => {
  return ((balanceMáximo - balance) / balanceMáximo) * 100;
};
```

### 2. Validaciones
```typescript
// src/services/validation.ts
export const validarOperacion = (operacion: Operacion): boolean => {
  return (
    operacion.par &&
    operacion.tipo &&
    operacion.precio_entrada > 0 &&
    operacion.precio_salida > 0
  );
};
```

### 3. Análisis
```typescript
// src/services/analytics.ts
export const analizarPerfil = (operaciones: Operacion[]) => {
  return {
    totalOperaciones: operaciones.length,
    winRate: calculateWinRate(...),
    gananciaPromedio: operaciones.reduce(...) / operaciones.length,
  };
};
```

## 🔐 Seguridad

### Row Level Security (RLS)
Todos los datos están protegidos con RLS en Supabase:

```sql
-- Los usuarios solo ven sus propias operaciones
ALTER TABLE operaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios ven solo sus operaciones"
  ON operaciones
  FOR SELECT
  USING (auth.uid() = usuario_id);
```

### Autenticación
- Google OAuth vía Supabase Auth
- JWT tokens automáticos
- Session management en frontend

## 🚀 Desarrollo

### 1. Instalar dependencias (si necesarias)
```bash
npm install
```

### 2. Escribir servicios en TypeScript
```typescript
// src/services/miServicio.ts
export const miServicio = (params) => {
  // Lógica aquí
};
```

### 3. Usar desde frontend
```typescript
import { miServicio } from '@backend/services/miServicio';

const resultado = miServicio(params);
```

## 📝 Convenciones

- **Archivos:** snake_case
- **Funciones:** camelCase
- **Constantes:** UPPER_CASE
- **Interfaces:** PascalCase

## 🔄 Flujo de Datos

```
Frontend (React) 
    ↓
Services (src/services)
    ↓
Supabase Client (JavaScript)
    ↓
Supabase API REST
    ↓
PostgreSQL Database
```

## 🎯 Próximos Pasos

1. [ ] Crear tabla `operaciones` en Supabase
2. [ ] Configurar RLS en todas las tablas
3. [ ] Crear funciones PL/pgSQL para cálculos complejos
4. [ ] Implementar servicios en TypeScript
5. [ ] Integrar con frontend

## 📚 Recursos

- [Supabase PostgreSQL Docs](https://supabase.com/docs/guides/database)
- [PostgREST API Docs](https://postgrest.org/en/v11/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 🐛 Troubleshooting

### Error: "RLS policy denied"
Verificar que la política RLS está configurada correctamente:
```sql
SELECT * FROM pg_policies WHERE tablename = 'operaciones';
```

### Error: "Unauthorized"
Verificar que el usuario está autenticado en Supabase Auth.

### Error: "Column does not exist"
Verificar que el nombre de la columna es correcto (case-sensitive en PostgreSQL).

---

**Documentación BD:** `../analisis/ESTRUCTURA_EXCEL.md`  
**Plan de desarrollo:** `../analisis/PLAN_OPTIMIZACION.md`  
**Console Supabase:** https://app.supabase.com
