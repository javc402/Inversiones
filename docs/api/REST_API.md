# 🔌 API Documentation

Documentación de los endpoints de la API REST generada por Supabase.

## Base URL
```
https://your-project.supabase.co/rest/v1
```

## Autenticación
Todos los requests deben incluir headers:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
apikey: SUPABASE_ANON_KEY
Content-Type: application/json
```

## 📊 Endpoints Principales

### Operaciones

#### GET - Listar operaciones
```bash
GET /operaciones?usuario_id=eq.UUID
```

Respuesta:
```json
[
  {
    "id": "uuid",
    "usuario_id": "uuid",
    "par": "EURUSD",
    "tipo": "BUY",
    "fecha": "2026-06-23",
    "precio_entrada": 1.0850,
    "precio_salida": 1.0900,
    "ganancia": 500.00,
    "estado": "CERRADA"
  }
]
```

#### POST - Crear operación
```bash
POST /operaciones
Content-Type: application/json

{
  "usuario_id": "uuid",
  "par": "GBPUSD",
  "tipo": "SELL",
  "fecha": "2026-06-23",
  "precio_entrada": 1.2750,
  "lotes": 1.0,
  "rr_ratio": 1.5
}
```

#### PUT - Actualizar operación
```bash
PATCH /operaciones?id=eq.UUID
Content-Type: application/json

{
  "precio_salida": 1.2800,
  "estado": "CERRADA"
}
```

#### DELETE - Eliminar operación
```bash
DELETE /operaciones?id=eq.UUID
```

### Usuarios

#### GET - Obtener usuario
```bash
GET /usuarios?id=eq.UUID
```

#### POST - Crear usuario (vía Google OAuth - automático)
```bash
# Google OAuth maneja esto automáticamente
# No usar este endpoint directamente
```

#### PUT - Actualizar perfil
```bash
PATCH /usuarios?id=eq.UUID
Content-Type: application/json

{
  "nombre": "Nuevo nombre",
  "avatar_url": "https://..."
}
```

### Resumen de Desempeño

#### GET - Estadísticas del día
```bash
GET /resumen_desempeño?usuario_id=eq.UUID&fecha=eq.2026-06-23
```

Respuesta:
```json
[
  {
    "id": "uuid",
    "usuario_id": "uuid",
    "fecha": "2026-06-23",
    "ganancia_total": 2500.00,
    "pérdida_total": -500.00,
    "win_rate": 75.0,
    "operaciones_ganadas": 3,
    "operaciones_perdidas": 1
  }
]
```

## 🔍 Filtros Comunes

### Filtrar por rango de fechas
```bash
GET /operaciones?fecha=gte.2026-06-01&fecha=lte.2026-06-30&usuario_id=eq.UUID
```

### Ordenar resultados
```bash
# Descendente
GET /operaciones?usuario_id=eq.UUID&order=fecha.desc

# Ascendente
GET /operaciones?usuario_id=eq.UUID&order=fecha.asc
```

### Paginar
```bash
GET /operaciones?usuario_id=eq.UUID&limit=10&offset=0
```

### Seleccionar columnas específicas
```bash
GET /operaciones?select=fecha,par,ganancia&usuario_id=eq.UUID
```

## 📋 Parámetros de Query

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `select` | Columnas a retornar | `select=id,nombre` |
| `order` | Ordenar por campo | `order=fecha.desc` |
| `limit` | Límite de resultados | `limit=10` |
| `offset` | Saltar N registros | `offset=0` |
| `eq` | Igual | `id=eq.123` |
| `neq` | No igual | `estado=neq.CANCELADA` |
| `gt` | Mayor que | `ganancia=gt.0` |
| `gte` | Mayor o igual | `fecha=gte.2026-01-01` |
| `lt` | Menor que | `ganancia=lt.0` |
| `lte` | Menor o igual | `fecha=lte.2026-12-31` |
| `in` | Dentro de lista | `tipo=in.(BUY,SELL)` |
| `is` | IS NULL / NOT NULL | `precio_salida=is.null` |

## 🧪 Ejemplos con cURL

### Crear operación
```bash
curl -X POST 'https://your-project.supabase.co/rest/v1/operaciones' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "usuario_id": "uuid",
    "par": "EURUSD",
    "tipo": "BUY",
    "fecha": "2026-06-23",
    "precio_entrada": 1.0850
  }'
```

### Listar operaciones del usuario
```bash
curl -X GET 'https://your-project.supabase.co/rest/v1/operaciones?usuario_id=eq.uuid&order=fecha.desc' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: SUPABASE_ANON_KEY'
```

### Actualizar operación
```bash
curl -X PATCH 'https://your-project.supabase.co/rest/v1/operaciones?id=eq.uuid' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "precio_salida": 1.0900,
    "estado": "CERRADA"
  }'
```

## 🔐 RLS & Seguridad

- Todos los queries están protegidos por RLS
- Los usuarios solo ven sus propios datos
- Tokens JWT se validan automáticamente
- No incluir usuario_id en filtros (se agrega automáticamente)

## 📱 Uso desde Frontend

```typescript
import { supabase } from '@lib/supabase';

// GET
const { data, error } = await supabase
  .from('operaciones')
  .select('*')
  .eq('usuario_id', userId)
  .order('fecha', { ascending: false });

// POST
const { data, error } = await supabase
  .from('operaciones')
  .insert([{ usuario_id: userId, par: 'EURUSD', ... }]);

// PATCH
const { data, error } = await supabase
  .from('operaciones')
  .update({ estado: 'CERRADA' })
  .eq('id', operacionId);

// DELETE
const { data, error } = await supabase
  .from('operaciones')
  .delete()
  .eq('id', operacionId);
```

## 🔗 Recursos

- [PostgREST Documentation](https://postgrest.org)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)

---

**Base de datos:** PostgreSQL en Supabase  
**API:** REST auto-generada por PostgREST  
**Documentación:** Supabase Dashboard
