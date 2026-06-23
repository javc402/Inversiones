# 🎨 Prototipos - Inversiones

## 📋 Descripción

Carpeta con prototipos HTML/CSS modernos de la interfaz del sistema de gestión de trading "Inversiones". Los prototipos están completamente diseñados en **español**, inspirados en **DashSpace**, con **gráficos SVG reales** y una **paleta de colores centralizada**.

## ✨ Cambios Recientes (v2.1)

- ✅ **100% Español:** Toda la interfaz en idioma español
- ✅ **Login Solo Google:** Autenticación simplificada, sin registro
- ✅ **Gráficos SVG Reales:** Gráficos de línea y donut interactivos
- ✅ **Diseño DashSpace:** Inspirado en el template profesional
- ✅ **Mejor Visual:** Cards con bordes gradientes, sombras profesionales
- ✅ **Tabla Mejorada:** Datos realistas con estados y colores

---

## 📁 Estructura de Archivos

```
prototipos/
├── index.html                      # 📍 Galería de prototipos (inicio)
├── 01-login.html                   # 🔐 Login - Solo Google, 2 columnas
├── 02-dashboard.html               # 📊 Panel - Gráficos SVG + tabla
└── assets/
    └── css/
        └── paleta.css              # ⭐ Colores centralizados
```

---

## 🚀 Prototipos

### 1. Login (`01-login.html`) 🔐

**Características:**
- ✓ Autenticación solo con Google
- ✓ Layout split (imagen izquierda, formulario derecha)
- ✓ Gradiente vibrante en lado izquierdo
- ✓ Información de seguridad
- ✓ 100% español
- ✓ Responsive automático

**Elementos:**
- Branding (logo + nombre)
- Título "Bienvenido"
- Subtítulo descriptivo
- Caja de información de seguridad
- Botón "Iniciar con Google"
- Divider "o"
- Caja de consejo
- Footer copyright

---

### 2. Dashboard (`02-dashboard.html`) 📊

**Características:**
- ✓ Sidebar navegable con menú
- ✓ Header con saludo personalizado
- ✓ 4 KPI cards con gradientes coloridos
- ✓ Gráficos SVG reales (línea y donut)
- ✓ Tabla de operaciones recientes
- ✓ Estados con badges de color
- ✓ 100% español
- ✓ Completamente responsive

**Elementos:**

#### Sidebar
- Logo y marca "Inversiones"
- Menú "Panel" (Panel Principal, Operaciones, Análisis, Planes)
- Menú "Herramientas" (Calendario, Mensajes, Reportes)
- Link activo con gradiente azul

#### Header
- Saludo personalizado "¡Bienvenido de vuelta, Cristina! 👋"
- Botones de acción (notificaciones, settings, tema)
- Avatar de usuario

#### KPI Cards
1. **Ganancia del Mes** - $22,550 (Azul-Púrpura) ↑ +12.5%
2. **Crecimiento** - +33% (Rosa-Magenta) ↑ +5.2%
3. **Tasa de Éxito** - 69.5% (Amarillo) ↑ +3.1%
4. **Riesgo en Abierto** - $2,450 (Rojo) ↑ +1.8%

#### Gráficos SVG
- **Evolución de Ganancias:** Gráfico de línea con área rellena (7 días)
- **Distribución de Operaciones:** Donut chart con 127 operaciones distribuidas

#### Tabla
Columnas: Fecha | Par | Tipo | Estado | Razón R:R | Resultado

**Datos de ejemplo:**
- EURUSD - Éxito (+$125.50)
- GBPUSD - Pendiente (-$85.00)
- USDMXN - Éxito (+$210.75)
- EURGBP - Cierre (-$42.30)
- NZDUSD - Éxito (+$298.50)

---

## 🎨 Paleta de Colores

### Archivo Central: `assets/css/paleta.css`

#### Colores Principales (Azul)
```
--color-primary-dark:    #0a2342  (Headers, sidebar)
--color-primary:         #1E5BA8  (Botones, acciones)
--color-primary-light:   #2E7BC0  (Hover states)
--color-primary-lighter: #E8F2FF  (Backgrounds)
```

#### Colores Secundarios (Estados)
```
--color-success:  #10B981  (Éxito, ganancias)
--color-danger:   #EF4444  (Pérdidas, errores)
--color-warning:  #F59E0B  (Alertas)
--color-info:     #3B82F6  (Información)
```

#### Gradientes Utilizados
```
Azul-Púrpura:    #667eea → #764ba2
Rosa-Magenta:    #f093fb → #f5576c
Amarillo:        #ffa400 → #ffd660
Rojo:            #ff6b6b → #ff4757
```

### Cómo Cambiar el Tema Completo

1. Abre `assets/css/paleta.css`
2. Busca la sección `:root { ... }`
3. Modifica los valores hex
4. **¡Todos los prototipos se actualizan automáticamente!**

**Ejemplo: Cambiar a Verde**
```css
--color-primary-dark:    #0d5f3f;
--color-primary:         #0d8b6f;
--color-primary-light:   #10b981;
```

---

## 📱 Responsive Design

Los prototipos funcionan perfectamente en:

- **Desktop:** 1024px+ (layout completo)
- **Tablet:** 768px - 1023px (ajustes de columnas)
- **Móvil:** < 768px (stack vertical, sidebar oculto)

**Breakpoints:**
```css
640px  - Máquinas pequeñas
768px  - Tablet
1024px - Desktop
1280px - Wide screen
```

---

## 🚀 Cómo Acceder

### Opción 1: Abrir en Navegador
```
file:///D:/Proyectos/Excel/prototipos/index.html
```

### Opción 2: Usar Live Server (VS Code)
1. Instala "Live Server" en extensiones
2. Click derecho en `index.html`
3. "Open with Live Server"

### Opción 3: Terminal Python
```bash
cd D:\Proyectos\Excel\prototipos
python -m http.server 8000
# Accede a http://localhost:8000
```

### Opción 4: Node.js
```bash
cd D:\Proyectos\Excel\prototipos
npx http-server
# Accede a http://localhost:8080
```

---

## 🔧 Personalización

### Cambiar Colores Globales

**Edita `assets/css/paleta.css`** - Todos los prototipos se actualizan instantáneamente.

### Agregar Nuevas Páginas

1. Crea `03-nueva-pagina.html`
2. Copia estructura de `02-dashboard.html`
3. Reemplaza contenido
4. Vincula desde `index.html`

### Componentes Disponibles

En `paleta.css` encontrarás:
- `.btn` y variantes (primary, secondary, success, danger, lg, sm)
- `.card`, `.card-header`, `.card-body`, `.card-footer`
- `.form-group`, `.form-label`, `.form-input`, `.form-select`
- `.alert` y variantes (success, warning, danger, info)
- `.badge` y variantes de colores
- `.table`, `.table-responsive`
- `.sidebar`, `.header`, `.main-content`

---

## 📊 Gráficos SVG

Los gráficos están implementados con **SVG inline** sin dependencias:

### Gráfico de Línea
- Área rellena con gradiente
- 9 puntos de datos (7 días)
- Labels de días
- Grid de fondo

### Gráfico Donut
- 4 segmentos de color
- Centro con texto (cantidad + label)
- Leyenda interactiva
- Proporciones realistas

**Ventajas:**
- Sin librerías externas
- Escalables (responsive)
- Editable con código
- Rápido de cargar

---

## 🎯 Próximas Mejoras

- [ ] Crear más páginas (Operaciones, Análisis, Planes)
- [ ] Integrar con React
- [ ] Conectar con Supabase
- [ ] Gráficos interactivos con D3.js o Chart.js
- [ ] Tema dark/light
- [ ] Despliegue en GitHub Pages
- [ ] Formularios funcionales
- [ ] Animations.css avanzadas

---

## 📚 Documentación

- **[README.md](../README.md)** - Proyecto general
- **[ESTRUCTURA_EXCEL.md](../analisis/ESTRUCTURA_EXCEL.md)** - Análisis de datos
- **[PLAN_OPTIMIZACION.md](../analisis/PLAN_OPTIMIZACION.md)** - Roadmap
- **[GIT_WORKFLOW.md](../analisis/GIT_WORKFLOW.md)** - Estrategia Git

---

## ✅ Estado

Todos los prototipos han sido:
- ✓ Validados en navegadores modernos
- ✓ Testeados responsive (móvil, tablet, desktop)
- ✓ Verificados sin errores
- ✓ Optimizados en rendimiento
- ✓ Documentados completamente
- ✓ 100% en español
- ✓ Con gráficos SVG funcionales

---

## 📝 Información

**Proyecto:** Inversiones - Sistema de Gestión de Trading  
**Versión:** 2.1 (Google OAuth + SVG Charts)  
**Última actualización:** Junio 2026  
**Idioma:** Español  
**Licencia:** Proyecto Universitario

---

**¿Necesitas ayuda?** Revisa los archivos HTML directamente - el código está bien comentado y es fácil de entender.
