# 🚀 Despliegue - Guía Completa

Cómo desplegar la aplicación Inversiones a producción.

## 1️⃣ Preparar el Build

### Verificar variables de entorno
```bash
cd frontend
cat .env.local
```

Debe tener:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Compilar
```bash
npm run build
# Genera carpeta dist/
```

### Verificar build
```bash
npm run preview
# Verifica que el build funciona en http://localhost:4173
```

## 2️⃣ GitHub Pages (Opción 1 - Recomendada)

### Configurar en GitHub
1. Ir a Repositorio → Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, carpeta /root

### Desplegar
```bash
# En rama main
npm run build
git add dist/
git commit -m "build: Despliegue v1.0"
git push origin main
```

GitHub Actions automáticamente despliega a: `https://javc402.github.io/Inversiones/`

### Usar dominio personalizado (Opcional)
```bash
# Crear archivo CNAME en dist/
echo "inversiones.midominio.com" > dist/CNAME
```

## 3️⃣ Vercel (Opción 2 - Más simple)

### Conectar a Vercel
1. Ir a https://vercel.com
2. Importar repositorio GitHub
3. Vercel detecta automáticamente Vite
4. Agregar variables de entorno
5. Deploy

### Variables de entorno en Vercel
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4️⃣ Netlify (Opción 3)

### Conectar Netlify
1. Ir a https://netlify.com
2. New site from Git → Conectar GitHub
3. Build command: `npm run build`
4. Publish directory: `dist`

### netlify.toml
```toml
[build]
  command = "npm run build"
  functions = "functions"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
VITE_SUPABASE_URL = "https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY = "your_anon_key_here"
```

## 5️⃣ Hacer Deploy

### Opción A: Automático (Recomendado)
Cada push a `main` automáticamente se despliega:

```bash
git checkout main
git merge release
git push origin main
# GitHub Actions / Vercel / Netlify automáticamente despliega
```

### Opción B: Manual (GitHub Pages)
```bash
npm run build
git add dist/
git commit -m "build: Producción vX.X"
git push origin main
```

## 6️⃣ Configurar DNS (Dominio Personalizado)

### Si usas dominio propio
1. Agregar registro DNS:
   ```
   CNAME inversiones.midominio.com github.io
   ```
2. O en Vercel/Netlify: Configurar en Settings → Domains

## 7️⃣ Verificar Despliegue

```bash
# Verificar que sitio está arriba
curl https://javc402.github.io/Inversiones/

# Ver logs (Vercel/Netlify)
# Dashboard → Deployments → Ver logs
```

## ✅ Checklist Antes de Deploy

- [ ] Todos los tests pasan
- [ ] Build completa sin errores
- [ ] Variables de entorno correctas
- [ ] Supabase está activo
- [ ] Google OAuth configurado
- [ ] Rama `main` está lista
- [ ] Commit message descriptivo

## 🔄 CI/CD Automático

El proyecto usa GitHub Actions:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]  # Se dispara al hacer push a main

jobs:
  deploy:
    # Automáticamente ejecuta, compila y despliega
```

## 🆘 Troubleshooting

### Error: "Build failed"
```bash
npm run build  # Verificar localmente
npm run lint   # Verificar errores
```

### Error: "Supabase connection failed"
```bash
# Verificar en .env.local
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Error: "Google OAuth failed"
1. Ir a Supabase Console
2. Authentication → Providers → Google
3. Verificar credenciales

### Sitio en blanco
1. Abrir DevTools (F12)
2. Console tab → Ver errores
3. Network tab → Verificar requests

### CORS error
```typescript
// Backend CORS está configurado en Supabase
// No debería haber problemas si usas supabase.js
```

## 📊 Monitoreo

### Ver deployment status
- GitHub: Repository → Actions
- Vercel: vercel.com → Dashboard
- Netlify: netlify.com → Sites

### Ver logs
```bash
# Vercel
vercel logs

# Ver errores en consola del navegador (F12)
```

## 🔐 Secretos en Producción

**NUNCA** commitear:
- .env.local
- API keys
- Tokens

Usar:
- GitHub Secrets (para GitHub Actions)
- Vercel Environment Variables
- Netlify Build & Deploy settings

---

**Producción:** Main branch  
**Staging:** Release branch  
**Desarrollo:** Dev branch  
**Documentación:** `.instructions.md`
