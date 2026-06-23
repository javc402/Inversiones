# 🎨 Prototipos - Inversiones

## 📋 Descripción

Carpeta con prototipos HTML/CSS de la interfaz del sistema de gestión de trading "Inversiones". Todos los prototipos comparten una **paleta de colores centralizada** que permite cambiar la temática de toda la aplicación desde un único archivo CSS.

---

## 📁 Estructura de Carpetas

```
prototipos/
├── index.html                    # Página principal - Índice de prototipos
├── 01-login.html                 # Prototipo: Página de Login
├── 02-dashboard.html             # Prototipo: Dashboard Principal
├── 03-nueva-operacion.html       # Prototipo: Formulario Nueva Operación
├── 04-listado-operaciones.html   # Prototipo: Listado de Operaciones
├── 05-resumen-mensual.html       # Prototipo: Resumen Mensual
└── assets/
    └── css/
        └── paleta.css            # ⭐ PALETA CENTRALIZADA
```

---

## 🎨 Paleta de Colores Centralizada

**Archivo:** `assets/css/paleta.css`

La paleta de colores está definida en **variables CSS** en la sección `:root`. Esto permite cambiar TODA la temática del sitio editando solo este archivo.

### Colores Principales (Azul)

```css
--color-primary-dark: #0c3a7f;      /* Azul oscuro - Headers */
--color-primary: #1565c0;           /* Azul principal */
--color-primary-light: #2196f3;     /* Azul claro */
--color-primary-lighter: #bbdefb;   /* Azul muy claro - Backgrounds */
```

### Colores Secundarios

```css
--color-success: #4caf50;           /* Verde - Ganancias */
--color-danger: #f44336;            /* Rojo - Pérdidas */
--color-warning: #ff9800;           /* Naranja - Alertas */
--color-info: #2196f3;              /* Azul - Información */
```

### Colores Neutral

```css
--color-dark: #212529;              /* Texto oscuro */
--color-gray-900 a --color-gray-100;  /* Grises */
--color-white: #ffffff;             /* Blanco */
```

---

## 🔄 Cómo Cambiar la Paleta

### 1. **Cambiar todos los Azules a Verde**

En `assets/css/paleta.css`, busca la sección `:root` y reemplaza:

```css
/* Antes - Azules */
--color-primary-dark: #0c3a7f;
--color-primary: #1565c0;
--color-primary-light: #2196f3;
--color-primary-lighter: #bbdefb;

/* Después - Verdes */
--color-primary-dark: #1b5e20;
--color-primary: #2e7d32;
--color-primary-light: #4caf50;
--color-primary-lighter: #c8e6c9;
```

**Resultado:** Toda la aplicación cambia a temática verde automáticamente.

### 2. **Cambiar a Tema Oscuro**

Dentro de la sección `:root`, modifica:

```css
--color-white: #1a1a1a;
--color-dark: #f5f5f5;
--color-gray-100: #2c2c2c;
```

### 3. **Personalizar Espacios**

```css
--spacing-md: 16px;      /* Cambiar a 20px */
--spacing-lg: 24px;      /* Cambiar a 32px */
```

---

## 📱 Prototipos Disponibles

### 1. **Login** (`01-login.html`)
- Página de acceso
- Email y contraseña
- Recordarme
- Recuperar contraseña
- Crear cuenta

### 2. **Dashboard** (`02-dashboard.html`)
- Panel principal
- 4 KPI Cards
- Sidebar con navegación
- Últimas operaciones
- Gráficos placeholder

### 3. **Nueva Operación** (`03-nueva-operacion.html`)
- Formulario completo (5 secciones)
- Información temporal
- Datos de la operación
- Análisis técnico
- Resultado
- Referencias
- Validación visual

### 4. **Listado Operaciones** (`04-listado-operaciones.html`)
- Tabla interactiva
- Filtros (período, tipo, resultado)
- Búsqueda
- Paginación
- Acciones por fila

### 5. **Resumen Mensual** (`05-resumen-mensual.html`)
- KPIs anuales
- Cards por mes
- Gráficos comparativos
- Tabla de comparación
- Selector de año

---

## 🚀 Cómo Usar los Prototipos

### **Opción 1: Ver en Navegador**

```bash
# Abre index.html en tu navegador
# http://localhost/prototipos/index.html
# O simplemente arrastra el archivo al navegador
```

### **Opción 2: Con servidor local**

```bash
# Usando Python 3
python -m http.server 8000

# O con Node.js (http-server)
npx http-server

# Luego abre: http://localhost:8000/prototipos
```

### **Opción 3: En VS Code**

1. Instala extensión "Live Server"
2. Click derecho en `index.html`
3. "Open with Live Server"
4. Se abre automáticamente en navegador

---

## 📝 Componentes CSS Disponibles

### Botones

```html
<button class="btn btn-primary">Primario</button>
<button class="btn btn-secondary">Secundario</button>
<button class="btn btn-success">Éxito</button>
<button class="btn btn-danger">Peligro</button>

<!-- Tamaños -->
<button class="btn btn-primary btn-lg">Grande</button>
<button class="btn btn-primary btn-sm">Pequeño</button>
```

### Formularios

```html
<div class="form-group">
    <label class="form-label">Email</label>
    <input type="email" class="form-input">
    <span class="form-hint">Ayuda opcional</span>
</div>

<textarea class="form-textarea"></textarea>
<select class="form-select"></select>
```

### Tarjetas

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Título</h3>
    </div>
    <div class="card-body">
        Contenido
    </div>
    <div class="card-footer">
        Acciones
    </div>
</div>
```

### KPI Card

```html
<div class="kpi-card">
    <span class="kpi-value">75.5%</span>
    <span class="kpi-label">Win Rate</span>
    <div class="kpi-change positive">↑ +2.3%</div>
</div>
```

### Alerts

```html
<div class="alert alert-info">ℹ️ Información</div>
<div class="alert alert-success">✓ Éxito</div>
<div class="alert alert-warning">⚠️ Advertencia</div>
<div class="alert alert-danger">✕ Error</div>
```

### Badges

```html
<span class="badge">Defecto</span>
<span class="badge badge-success">Éxito</span>
<span class="badge badge-danger">Peligro</span>
<span class="badge badge-warning">Advertencia</span>
```

---

## 🎯 Mejores Prácticas

### ✅ Hacer

```css
/* Usar variables */
background-color: var(--color-primary);
padding: var(--spacing-lg);
border-radius: var(--border-radius);
```

```html
<!-- Usar clases semánticas -->
<button class="btn btn-primary">Guardar</button>
<div class="card">...</div>
<div class="alert alert-success">...</div>
```

### ❌ No Hacer

```css
/* Colores hardcodeados */
background-color: #1565c0;
padding: 24px;
border-radius: 8px;
```

```html
<!-- Estilos inline -->
<button style="background-color: blue; padding: 10px;">Haz clic</button>
```

---

## 🔧 Variables CSS Disponibles

### Colores

```css
--color-primary-dark      /* Azul oscuro */
--color-primary           /* Azul principal */
--color-primary-light     /* Azul claro */
--color-primary-lighter   /* Azul muy claro */
--color-success           /* Verde */
--color-danger            /* Rojo */
--color-warning           /* Naranja */
--color-info              /* Azul info */
--color-dark              /* Texto oscuro */
--color-gray-100 a 900    /* Grises */
--color-white             /* Blanco */
```

### Espacios

```css
--spacing-xs              /* 4px */
--spacing-sm              /* 8px */
--spacing-md              /* 16px */
--spacing-lg              /* 24px */
--spacing-xl              /* 32px */
--spacing-2xl             /* 48px */
--spacing-3xl             /* 64px */
```

### Tipografía

```css
--font-family-base        /* Fuente principal */
--font-size-xs a 4xl      /* Tamaños */
--font-weight-light
--font-weight-normal
--font-weight-semibold
--font-weight-bold
```

### Sombras

```css
--shadow-sm               /* Pequeña */
--shadow                  /* Normal */
--shadow-md               /* Mediana */
--shadow-lg               /* Grande */
--shadow-xl               /* Extra grande */
```

### Otros

```css
--border-radius           /* 8px */
--border-radius-lg        /* 12px */
--border-radius-full      /* 9999px */
--transition              /* 300ms ease-in-out */
--gradient-primary        /* Gradiente azul */
--gradient-success        /* Gradiente verde */
--gradient-danger         /* Gradiente rojo */
```

---

## 📊 Responsive Design

Los prototipos son **100% responsive** y se adaptan a:

- **Mobile:** < 640px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

```css
/* Breakpoints disponibles */
--breakpoint-mobile: 640px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 1024px;
--breakpoint-wide: 1280px;
```

---

## 🔗 Próximos Pasos

### Para Convertir en Aplicación Real

1. **Integrar React**
   ```bash
   npx create-react-app inversiones-app
   # Copiar CSS en src/
   # Crear componentes reutilizables
   ```

2. **Conectar Supabase**
   ```javascript
   import { supabase } from './lib/supabase'
   const { data } = await supabase.from('operaciones').select()
   ```

3. **Agregar JavaScript**
   ```javascript
   // Validación de formularios
   // Filtrado de tablas
   // Gráficos interactivos
   ```

4. **Crear Gráficos**
   ```javascript
   import { LineChart } from 'recharts'
   // Usar datos reales de Supabase
   ```

---

## 📚 Referencias

- [MDN Web Docs - CSS Variables](https://developer.mozilla.org/es/docs/Web/CSS/--*)
- [CSS Grid](https://developer.mozilla.org/es/docs/Web/CSS/CSS_Grid_Layout)
- [Flexbox](https://developer.mozilla.org/es/docs/Web/CSS/CSS_Flexible_Box_Layout)

---

## 🎓 Notas para Desarrollo

- **Sin frameworks:** Solo HTML y CSS puro (fácil de personalizar)
- **Sin dependencias:** No requiere npm, node, etc.
- **Escalable:** Fácil pasar a React después
- **Mantenible:** Paleta centralizada = cambios fáciles

---

**Última actualización:** 23 de Junio, 2026  
**Autor:** AI Assistant  
**Licencia:** MIT
