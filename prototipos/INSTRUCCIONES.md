# 🎨 Cómo Acceder a los Prototipos

## 📍 Ubicación de Archivos

```
d:\Proyectos\Excel\prototipos\
├── index.html                    ← PUNTO DE ENTRADA
├── 01-login.html
├── 02-dashboard.html
├── 03-nueva-operacion.html
├── 04-listado-operaciones.html
├── 05-resumen-mensual.html
├── README.md
└── assets/
    └── css/
        └── paleta.css           ← COLORES CENTRALIZADOS
```

---

## 🚀 Formas de Acceder

### **Opción 1: Abrir directamente en navegador (MÁS FÁCIL)**

```
1. Abre el Explorador de Archivos
2. Navega a: D:\Proyectos\Excel\prototipos\
3. Doble-click en index.html
4. Se abrirá en tu navegador predeterminado
```

**Ventaja:** Funciona inmediatamente, sin configuración.

---

### **Opción 2: Desde VS Code (RECOMENDADO)**

```
1. Abre VS Code
2. Abre la carpeta: D:\Proyectos\Excel
3. En la carpeta prototipos/, click derecho en index.html
4. Selecciona "Open with Live Server"
5. Se abre automáticamente en navegador
```

**Ventaja:** Live reload automático cuando edites CSS.

**Requisito:** Instala extensión "Live Server" (gratuita)

---

### **Opción 3: Con Python (Para desarrollo)

```bash
# En terminal/PowerShell, navega a la carpeta
cd d:\Proyectos\Excel\prototipos

# Inicia servidor local
python -m http.server 8000

# Abre navegador en:
# http://localhost:8000/index.html
```

**Ventaja:** Funciona como servidor real, sin CORS.

---

### **Opción 4: Con Node.js (Alternativa)

```bash
# Instala http-server (una sola vez)
npm install -g http-server

# Inicia servidor
cd d:\Proyectos\Excel\prototipos
http-server

# Abre navegador en:
# http://localhost:8080
```

---

## 📱 Prototipos Disponibles

Desde `index.html` puedes acceder a:

| # | Nombre | Archivo | Descripción |
|---|--------|---------|-------------|
| 1 | 🔐 Login | `01-login.html` | Página de autenticación |
| 2 | 📊 Dashboard | `02-dashboard.html` | Panel principal con KPIs |
| 3 | 📝 Nueva Operación | `03-nueva-operacion.html` | Formulario completo |
| 4 | 📋 Listado | `04-listado-operaciones.html` | Tabla interactiva |
| 5 | 📈 Resumen Mensual | `05-resumen-mensual.html` | Análisis por mes |

---

## 🎨 Cambiar Paleta de Colores

### **Paso 1: Abrir archivo CSS**

```
D:\Proyectos\Excel\prototipos\assets\css\paleta.css
```

### **Paso 2: Encontrar sección :root**

```css
:root {
  /* COLORES PRIMARIOS - AZULES */
  --color-primary-dark: #0c3a7f;
  --color-primary: #1565c0;
  --color-primary-light: #2196f3;
  --color-primary-lighter: #bbdefb;
  
  /* ... más colores ... */
}
```

### **Paso 3: Cambiar los valores**

**Ejemplo: Cambiar a Verde**

```css
/* Antes - Azul */
--color-primary-dark: #0c3a7f;
--color-primary: #1565c0;

/* Después - Verde */
--color-primary-dark: #1b5e20;
--color-primary: #2e7d32;
```

### **Paso 4: Guardar y recargar**

```
Ctrl+S para guardar
F5 en navegador para recargar
```

**¡Toda la aplicación cambia de color automáticamente!**

---

## 🎯 Ejemplos de Cambios Rápidos

### **Tema Verde**
```css
--color-primary-dark: #1b5e20;
--color-primary: #2e7d32;
--color-primary-light: #4caf50;
--color-primary-lighter: #c8e6c9;
```

### **Tema Rojo/Naranja**
```css
--color-primary-dark: #d32f2f;
--color-primary: #f44336;
--color-primary-light: #ef5350;
--color-primary-lighter: #ffcdd2;
```

### **Tema Púrpura**
```css
--color-primary-dark: #512da8;
--color-primary: #673ab7;
--color-primary-light: #9c27b0;
--color-primary-lighter: #e1bee7;
```

### **Tema Gris (Profesional)**
```css
--color-primary-dark: #37474f;
--color-primary: #546e7a;
--color-primary-light: #78909c;
--color-primary-lighter: #cfd8dc;
```

---

## 📊 Vista Previa sin Abrir

Puedes ver cómo se ve cada prototipo directamente en GitHub:

```
https://github.com/javc402/Inversiones/tree/dev/prototipos
```

Y hacer click en cada HTML para ver el código.

---

## 🔧 Editar Prototipos

### **Desde VS Code**

```
1. Abre VS Code
2. File > Open Folder
3. Selecciona D:\Proyectos\Excel
4. En el sidebar, navega a prototipos/
5. Edita los archivos .html y .css
6. Con Live Server activo, verás cambios en tiempo real
```

### **Cambiar Contenido**

**Ejemplo: Cambiar nombre en Dashboard**

En `02-dashboard.html`, busca:

```html
<div class="welcome-title">Bienvenido, Cristina</div>
```

Cambia a:

```html
<div class="welcome-title">Bienvenido, Juan</div>
```

Guarda (Ctrl+S) y verás el cambio inmediatamente en el navegador.

---

## 📋 Checklist de Verificación

```
✓ Localizar carpeta: D:\Proyectos\Excel\prototipos\
✓ Abrir index.html en navegador
✓ Ver página principal con índice de prototipos
✓ Hacer click en cada prototipo para ver
✓ Abrir paleta.css en editor
✓ Cambiar un color y recargar
✓ Verificar que toda la aplicación cambió de color
✓ Editar algún texto en un prototipo
✓ Guardar y ver cambios en navegador
```

---

## 🐛 Solución de Problemas

### **Problema: Archivo no se ve**
```
Solución: Abre con la ruta completa o arrastra a navegador
```

### **Problema: CSS no se aplica**
```
Solución: Ctrl+F5 (refresco duro) para limpiar caché
```

### **Problema: Live Server no funciona**
```
Solución: Instala extensión "Live Server" desde VS Code marketplace
```

### **Problema: Puerto 8000 ya está en uso**
```
Solución: Usa otro puerto: python -m http.server 9000
```

---

## 📞 Notas Importantes

- ✅ **Sin dependencias:** No necesitas npm, node, etc.
- ✅ **Totalmente editable:** Todos los archivos son texto plano
- ✅ **Fácil de personalizar:** Solo edita CSS
- ✅ **Responsive:** Funciona en móvil, tablet, desktop
- ✅ **Preparado para React:** Fácil migrar código después

---

## 🚀 Próximos Pasos

1. **Revisar todos los prototipos** desde `index.html`
2. **Experimentar con colores** en `paleta.css`
3. **Familiarizarse con la estructura** HTML/CSS
4. **Luego**: Convertir a componentes React

---

**Creado:** 23 de Junio, 2026  
**Ubicación:** `d:\Proyectos\Excel\prototipos\`  
**Paleta centralizada:** `assets/css/paleta.css`
