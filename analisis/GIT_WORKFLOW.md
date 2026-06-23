# Git Workflow y Estrategia de Branching

## 📋 Resumen

El repositorio utiliza **Git Flow** adaptado para desarrollo ágil. Las tres ramas principales son:

- **main** → Producción/Release (Estable)
- **release** → Pre-producción (Testing)
- **dev** → Desarrollo (Inestable)

---

## 🌳 Estructura de Ramas

```
                    PRODUCCIÓN
                        ↑
                      main
                    (stable)
                        ↑
                    [merge PR]
                        ↑
                    STAGING/TESTING
                        ↑
                      release
                   (pre-release)
                        ↑
                    [merge PR]
                        ↑
                    DESARROLLO
                        ↑
    feature/xxx ← ← ← dev ← ← ← bugfix/xxx
    feature/yyy ← ← ← ↑ ← ← ← bugfix/yyy
                      (active)
```

---

## 📖 Workflow Estándar

### 1️⃣ Crear Feature (Nueva Funcionalidad)

```bash
# Actualizar dev
git checkout dev
git pull origin dev

# Crear rama feature desde dev
git checkout -b feature/nombre-feature

# Ejemplo:
git checkout -b feature/dashboard-kpis
git checkout -b feature/login-auth
git checkout -b feature/export-csv
```

**Naming Convention:**
- `feature/dashboard-kpis` ✅
- `feature/add_login` ✅
- `feature-crear-login` ❌

---

### 2️⃣ Hacer Commits en la Feature

```bash
# Hacer cambios, agregar archivos
git add src/pages/LoginPage.jsx
git add src/hooks/useAuth.js

# Commit con mensaje descriptivo
git commit -m "feat: Agregar página de login con validación"

# Ejemplo de buenos mensajes:
# feat: Agregar dashboard con gráficos
# fix: Corregir validación de fecha
# docs: Actualizar README
# refactor: Mejorar estructura de hooks
# test: Agregar tests para operaciones
```

**Formato Commit (Conventional Commits):**
```
<tipo>(<scope>): <descripción>

<cuerpo detallado opcional>
<issue relacionado: #123>

Tipos:
- feat:     Nueva funcionalidad
- fix:      Corrección de bug
- docs:     Cambios en documentación
- style:    Cambios de estilo (sin código)
- refactor: Refactorización de código
- test:     Agregar/modificar tests
- chore:    Cambios en config, deps, etc.
```

---

### 3️⃣ Push a Repositorio Remoto

```bash
# Publicar la rama feature
git push -u origin feature/dashboard-kpis

# Cambios posteriores
git push origin feature/dashboard-kpis
```

---

### 4️⃣ Crear Pull Request (PR)

En GitHub:
1. Ir a https://github.com/javc402/Inversiones
2. Ver notificación "feature/dashboard-kpis" con botón "Compare & pull request"
3. O ir a Pull Requests → New Pull Request
4. Seleccionar:
   - Base: `dev` (destino)
   - Compare: `feature/dashboard-kpis` (tu rama)
5. Llenar:
   - Título: "Agregar dashboard con KPIs"
   - Descripción:
     ```
     ## Descripción
     Agrega el dashboard principal con cards de KPIs.
     
     ## Cambios
     - Nuevo componente KPICards
     - Nueva página DashboardPage
     - Integración con Supabase
     
     ## Testing
     - [x] Verifica que carguen los datos
     - [x] Responsive en móvil
     
     Closes #123
     ```
6. Crear PR

---

### 5️⃣ Code Review y Merge

**En el PR:**
- Los colaboradores revisan código
- Hacen comentarios/sugerencias
- Aprueban cambios

**Si hay cambios requeridos:**
```bash
# En tu rama local
git checkout feature/dashboard-kpis
git add .
git commit -m "fix: Ajustes según review"
git push origin feature/dashboard-kpis
# El PR se actualiza automáticamente
```

**Una vez aprobado:**
- Click "Squash and merge" (recomendado) o "Create a merge commit"
- Confirmar merge
- Delete branch (opcional pero recomendado)

---

### 6️⃣ Eliminar Rama Local

```bash
# Después de merge en remoto
git checkout dev
git pull origin dev

# Eliminar rama local
git branch -d feature/dashboard-kpis

# O forzar (si no está completamente mergeada)
git branch -D feature/dashboard-kpis
```

---

## 🔄 Flujo de Release (Release Candidate)

Cuando `dev` está listo para testing:

### 1️⃣ Crear release branch

```bash
git checkout release
git pull origin release

# Merge desde dev
git merge dev --no-ff -m "merge: dev a release para v1.0.0"
git push origin release
```

### 2️⃣ Testing en release

- Deploy de `release` a ambiente de staging
- QA realiza testing completo
- Si hay bugs:

```bash
git checkout release
git checkout -b bugfix/issue-login-reset
# Hacer fix...
git commit -m "fix: Corregir reset de password"
git push origin bugfix/issue-login-reset

# Luego PR a release
# Merge a release → redeploy → testing
```

### 3️⃣ Release a Producción (main)

Cuando release está lista:

```bash
# En main
git checkout main
git pull origin main

# Merge desde release
git merge release --no-ff -m "merge: release v1.0.0 a main"

# Tag para versión
git tag -a v1.0.0 -m "Version 1.0.0 - Release"
git push origin main --follow-tags

# Volver a dev
git checkout dev
git merge main --no-ff
git push origin dev
```

---

## 🐛 Workflow de Bugfix

Para bugs encontrados en producción:

```bash
# Crear hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/critical-crash

# Hacer fix
git commit -m "fix: Corregir crash en operaciones"

# Merge a main
git push origin hotfix/critical-crash
# Crear PR → merge

# También mergear a dev
git checkout dev
git merge hotfix/critical-crash
git push origin dev
```

---

## 📊 Estado de Ramas - Ejemplo

```
main     ←── v1.0.0 (producción estable)
  ↑
  │(merge hotfix)
  │
hotfix/critical-crash
  
release  ←── testing v1.0.1
  ↑
  │(merge PR #15)
  │
  dev     ←── rama activa
  ↑ ↑ ↑
  │ │ │
  │ │ bugfix/login-validation
  │ feature/export-pdf
  feature/dashboard-enhancement (en desarrollo)
```

---

## 🎯 Mejores Prácticas

### ✅ Hacer

```bash
✅ git checkout -b feature/nombre-descriptivo
✅ git commit -m "feat: Descripción clara del cambio"
✅ git push origin feature/nombre-descriptivo
✅ Crear PR a dev
✅ Hacer squash & merge
✅ Eliminar rama después de merge
✅ Mantener dev actualizado: git pull origin dev
```

### ❌ No Hacer

```bash
❌ git checkout -b f1 o feature/x
❌ git commit -m "cambios"
❌ Hacer push directo a dev/main
❌ Commits con 1000 líneas
❌ Dejar ramas muertas sin mergear
❌ Hacer merge manual sin PR
❌ Trabajar directamente en dev
```

---

## 🔐 Protección de Ramas (GitHub Settings)

**Recomendado activar en:**

1. **main**
   - ✅ Require pull request reviews before merging
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

2. **release**
   - ✅ Require pull request reviews (1 approver)
   - ✅ Require status checks

3. **dev**
   - ✅ Require pull request reviews (optional)

---

## 📝 Comandos Útiles

### Ver ramas

```bash
# Locales
git branch

# Remotas
git branch -r

# Todas
git branch -a

# Con último commit
git branch -v
```

### Ver commits

```bash
# Últimos 10
git log --oneline -10

# Rama dev
git log origin/dev --oneline

# Diferencia entre dev y main
git log main..dev --oneline
```

### Sincronizar

```bash
# Traer todos los cambios
git fetch origin

# Actualizar dev
git checkout dev
git pull origin dev

# Rebase (mantener historia lineal)
git rebase dev
git push origin feature/xxx -f  # Force (cuidado)
```

### Deshacer cambios

```bash
# Deshacer cambios no commiteados
git checkout -- src/file.js

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Deshacer último commit (descartar cambios)
git reset --hard HEAD~1

# Revertir commit específico
git revert 1a2b3c4
git push origin dev
```

---

## 🚨 Resolución de Conflictos

Cuando hay conflictos al mergear:

```
<<<<<<< HEAD (tu rama)
Tu código aquí
=======
Código del PR/rama que se está mergeando
>>>>>>> origin/dev
```

**Resolver:**
```bash
# 1. Abrir archivo en editor
# 2. Elegir qué código mantener
# 3. Eliminar marcadores (<<<<, ====, >>>>)
# 4. Guardar

# Marcar como resuelto
git add archivo_conflictivo.js

# Completar merge
git commit -m "merge: Resolver conflictos"
git push origin rama
```

---

## 📋 Checklist antes de PR

- [ ] Código sigue estándares del proyecto
- [ ] Tests pasan (si aplica)
- [ ] Sin console.log o código comentado
- [ ] Commits tienen mensajes claros
- [ ] Rama está actualizada con dev
- [ ] Descripción de PR es clara
- [ ] No hay conflictos con dev
- [ ] Cambios son mínimos y enfocados

---

## 🔗 Referencias

- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)

---

**Última actualización:** 23 de Junio, 2026
