# 🗄️ Configuración de Base de Datos

Guía paso a paso para configurar Supabase y PostgreSQL.

## 1️⃣ Crear Proyecto en Supabase

### Acceder a Supabase
1. Ir a https://app.supabase.com
2. Registrarse o iniciar sesión
3. Crear nuevo proyecto
4. Copiar URL y API Key

### Variables de Entorno
```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 2️⃣ Crear Tablas

### En Supabase SQL Editor

```sql
-- Tabla: usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  suscripcion VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: operaciones
CREATE TABLE operaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  par VARCHAR(10) NOT NULL,           -- EURUSD, GBPUSD, etc.
  tipo VARCHAR(10) NOT NULL,          -- BUY, SELL
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  precio_entrada DECIMAL(12,5) NOT NULL,
  precio_salida DECIMAL(12,5),
  lotes DECIMAL(8,2),
  ganancia DECIMAL(12,2),
  porcentaje_ganancia DECIMAL(6,3),
  drawdown DECIMAL(6,3),
  rr_ratio DECIMAL(6,2),
  estado VARCHAR(50) DEFAULT 'ABIERTA',  -- ABIERTA, CERRADA, CANCELADA
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: planes_ejecucion
CREATE TABLE planes_ejecucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mes_año VARCHAR(10) NOT NULL,        -- 2026-01
  ganancia_diaria_objetivo DECIMAL(12,2),
  loss_máximo_diario DECIMAL(12,2),
  riesgo_máximo_por_operación DECIMAL(12,2),
  operaciones_máximas_diarias INT DEFAULT 10,
  ratio_riesgo_beneficio_mínimo DECIMAL(4,2) DEFAULT 1.5,
  drawdown_máximo_permitido DECIMAL(6,2) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, mes_año)
);

-- Tabla: resumen_desempeño
CREATE TABLE resumen_desempeño (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  ganancia_total DECIMAL(12,2),
  pérdida_total DECIMAL(12,2),
  ganancia_neta DECIMAL(12,2),
  win_rate DECIMAL(6,3),
  operaciones_ganadas INT DEFAULT 0,
  operaciones_perdidas INT DEFAULT 0,
  operaciones_totales INT DEFAULT 0,
  rr_promedio DECIMAL(6,2),
  drawdown_máximo DECIMAL(6,3),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Tabla: capital_disponible
CREATE TABLE capital_disponible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  capital_inicial DECIMAL(12,2) NOT NULL,
  capital_actual DECIMAL(12,2) NOT NULL,
  ganancia_acumulada DECIMAL(12,2) DEFAULT 0,
  última_actualización TIMESTAMP DEFAULT NOW()
);
```

## 3️⃣ Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_desempeño ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_disponible ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURIDAD

-- Usuarios: Cada usuario solo ve su propio perfil
CREATE POLICY "Los usuarios ven solo su perfil"
  ON usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden editar su perfil"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id);

-- Operaciones: Cada usuario solo ve sus operaciones
CREATE POLICY "Los usuarios ven solo sus operaciones"
  ON operaciones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear operaciones"
  ON operaciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden editar sus operaciones"
  ON operaciones FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden eliminar sus operaciones"
  ON operaciones FOR DELETE
  USING (auth.uid() = usuario_id);

-- Planes de Ejecución: Solo el usuario dueño
CREATE POLICY "Los usuarios ven solo sus planes"
  ON planes_ejecucion FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear planes"
  ON planes_ejecucion FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden editar sus planes"
  ON planes_ejecucion FOR UPDATE
  USING (auth.uid() = usuario_id);

-- Resumen de Desempeño: Solo el usuario dueño
CREATE POLICY "Los usuarios ven solo su resumen"
  ON resumen_desempeño FOR SELECT
  USING (auth.uid() = usuario_id);

-- Capital Disponible: Solo el usuario dueño
CREATE POLICY "Los usuarios ven solo su capital"
  ON capital_disponible FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar su capital"
  ON capital_disponible FOR UPDATE
  USING (auth.uid() = usuario_id);
```

## 4️⃣ Configurar Autenticación Google OAuth

1. En Supabase Dashboard → Authentication → Providers
2. Habilitar "Google"
3. Agregar credenciales OAuth de Google Console
4. Configurar redirect URL: `http://localhost:5173/auth/callback`

## 5️⃣ Indices para Performance

```sql
-- Indices en operaciones
CREATE INDEX idx_operaciones_usuario_id ON operaciones(usuario_id);
CREATE INDEX idx_operaciones_fecha ON operaciones(fecha);
CREATE INDEX idx_operaciones_usuario_fecha ON operaciones(usuario_id, fecha);

-- Indices en resumen
CREATE INDEX idx_resumen_usuario_id ON resumen_desempeño(usuario_id);
CREATE INDEX idx_resumen_fecha ON resumen_desempeño(fecha);

-- Indices en planes
CREATE INDEX idx_planes_usuario_id ON planes_ejecucion(usuario_id);
```

## 6️⃣ Triggers (Opcional pero Recomendado)

```sql
-- Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operaciones_updated_at BEFORE UPDATE ON operaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## ✅ Verificar Configuración

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'operaciones';

-- Verificar índices
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

## 🔌 Conectar desde Frontend

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Usar en componentes
const { data, error } = await supabase
  .from('operaciones')
  .select('*')
  .order('fecha', { ascending: false });
```

## 🆘 Troubleshooting

### Error: "RLS policy denied"
- Verificar que el usuario está autenticado
- Verificar que la política RLS está correcta

### Error: "Column does not exist"
- PostgreSQL es case-sensitive
- Verificar nombres de columnas exactos

### Conexión rechazada
- Verificar URL y API Key en .env.local
- Verificar que el proyecto está activo en Supabase

---

**Dashboard Supabase:** https://app.supabase.com  
**Documentación:** https://supabase.com/docs/guides/database
