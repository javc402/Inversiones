# 🎨 Prototipos - Inversiones

## 📋 Descripción

Carpeta con prototipos HTML/CSS modernos de la interfaz del sistema de gestión de trading "Inversiones". Los prototipos están inspirados en el diseño de **DashSpace** y utilizan una **paleta de colores centralizada** que permite cambiar la temática completa desde un único archivo CSS.

## ✨ Características

- **Diseño Moderno:** Inspirado en DashSpace con colores azules profesionales
- **Paleta Centralizada:** Todos los colores en `assets/css/paleta.css`
- **Completamente Responsive:** Funciona en móvil, tablet y desktop
- **Sin Dependencias:** HTML, CSS y JavaScript puro
- **Gradientes Elegantes:** KPI cards con gradientes vibrantes
- **Animaciones Suaves:** Transiciones y hover effects profesionales

---

## 📁 Estructura de Archivos

```
prototipos/
├── index.html                      # 📍 Página principal - Galería de prototipos
├── 01-login.html                   # 🔐 Login - Split layout con gradiente
├── 02-dashboard.html               # 📊 Dashboard - Sidebar, KPIs, gráficos y tabla
└── assets/
    └── css/
        └── paleta.css              # ⭐ PALETA DE COLORES CENTRALIZADA
```

---

## 🎨 Paleta de Colores

### Archivo Central
**`assets/css/paleta.css`** - Define todas las variables CSS del sistema

### Colores Principales (Azul)

```
Azul Oscuro:    #0a2342  (Headers, sidebar)
Azul Principal: #1E5BA8  (Botones, acciones)
Azul Claro:     #2E7BC0  (Hover states)
Ultra Claro:    #E8F2FF  (Backgrounds)
```

### Colores Secundarios (Estados)

```
Verde (Éxito):    #10B981
Rojo (Peligro):   #EF4444
Naranja (Alerta): #F59E0B
Azul (Info):      #3B82F6
```

### Cómo Cambiar Todo el Tema

1. Abre `assets/css/paleta.css`
2. Busca las variables en `:root`
3. Cambia los valores hex (ej: `#1E5BA8` → `#FF0000`)
4. Todos los prototipos se actualizan automáticamente

---

## 📱 Prototipos

### 1. Login (`01-login.html`) 🔐

**Características:**
- Split layout (imagen izquierda, formulario derecha)
- Gradiente vibrante en lado izquierdo
- Campos: Email y Password
- Checkbox "Remember me"
- Link "Forgot Password?"
- Botones de Login Social (Google, Github)
- Completamente responsive

**Acceso:**
- Directo: Abre `01-login.html` en navegador
- Desde galería: Click en "Ver Prototipo" en `index.html`

---

### 2. Dashboard (`02-dashboard.html`) 📊

**Características:**
- **Sidebar:** Menú navegable con logo y opciones (Dashboard, Operaciones, Análisis, Planes)
- **Header:** Búsqueda, botones de acción, avatar de usuario
- **KPI Cards:** 4 cards con gradientes coloridos mostrando métricas
  - Earn of Month (Azul-Púrpura)
  - Earn Growth (Rosa-Magenta)
  - Win Rate (Amarillo-Naranja)
  - Risk Level (Rojo)
- **Gráficos:** Placeholders para Line Chart y Pie Chart
- **Tabla:** Recent Operaciones con datos de ejemplo
- **Responsive:** Sidebar colapsable en móvil

**Acceso:**
- Directo: Abre `02-dashboard.html` en navegador
- Desde galería: Click en "Ver Prototipo" en `index.html`

---

## 🚀 Cómo Usar

### Opción 1: Abrir en Navegador Directamente
```
D:\Proyectos\Excel\prototipos\index.html
```

### Opción 2: Usar Live Server (VS Code)
1. Instala extensión "Live Server"
2. Click derecho en `index.html`
3. Selecciona "Open with Live Server"

### Opción 3: Usar Python
```bash
cd D:\Proyectos\Excel\prototipos
python -m http.server 8000
# Accede a http://localhost:8000
```

### Opción 4: Usar Node.js
```bash
cd D:\Proyectos\Excel\prototipos
npx http-server
# Accede a http://localhost:8080
```

---

## 🔧 Personalización

### Cambiar Paleta de Colores Completa

1. **Edita `assets/css/paleta.css`**
2. **Sección `:root { ... }`** - Modifica valores hex

#### Ejemplo: Cambiar a Tema Verde

```css
:root {
    --color-primary-dark: #0d5f3f;
    --color-primary: #0d8b6f;
    --color-primary-light: #10b981;
    --color-primary-lighter: #d1fae5;
    /* ... resto de variables ... */
}
```

#### Ejemplo: Cambiar a Tema Rojo

```css
:root {
    --color-primary-dark: #7f0c0c;
    --color-primary: #dc2626;
    --color-primary-light: #ef4444;
    --color-primary-lighter: #fee2e2;
    /* ... resto de variables ... */
}
```

### Agregar Nuevos Componentes

Todos los componentes están disponibles en `paleta.css`:
- `.btn` - Botones con variantes
- `.card` - Tarjetas
- `.form-group` - Grupos de formulario
- `.alert` - Alertas
- `.badge` - Badges
- `.table` - Tablas

---

## 📊 Componentes Disponibles

### Botones
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
```

### Cards
```html
<div class="card">
    <div class="card-header">Título</div>
    <div class="card-body">Contenido</div>
    <div class="card-footer">Pie</div>
</div>
```

### Alerts
```html
<div class="alert alert-success">Éxito</div>
<div class="alert alert-warning">Alerta</div>
<div class="alert alert-danger">Error</div>
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
```

---

## 📐 Responsive Breakpoints

Los prototipos son responsive en múltiples resoluciones:

```
Ultra móvil:  < 640px
Móvil:        ≥ 640px
Tablet:       ≥ 768px
Desktop:      ≥ 1024px
Wide:         ≥ 1280px
```

Todos adaptan automáticamente:
- Sidebar se oculta en móvil
- Grid se reorganiza
- Textos se redimensionan
- Espaciado se ajusta

---

## 🎯 Próximos Pasos

1. **Crear más prototipos** (Operaciones, Análisis, Planes)
2. **Convertir a React** con componentes reutilizables
3. **Integrar gráficos interactivos** (Recharts)
4. **Conectar con Supabase** para datos reales
5. **Agregar tema dark/light**
6. **Desplegar en GitHub Pages**

---

## 📚 Archivos de Soporte

- **Documentación General:** `README.md` (en raíz del proyecto)
- **Plan de Optimización:** `analisis/PLAN_OPTIMIZACION.md`
- **Estructura Excel:** `analisis/ESTRUCTURA_EXCEL.md`
- **Git Workflow:** `analisis/GIT_WORKFLOW.md`

---

## ✅ Validación

Todos los prototipos han sido:
- ✓ Validados en navegadores modernos
- ✓ Testeados en resoluciones múltiples
- ✓ Verificados sin errores de consola
- ✓ Optimizados para rendimiento
- ✓ Documentados completamente

---

## 📝 Licencia

Proyecto universitario - Uso educativo

---

**Última actualización:** Junio 2026  
**Versión:** 2.0 (DashSpace Redesign)
