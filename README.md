# Inversiones - Sistema de Gestión de Trading

## 📋 Descripción

Aplicación web para gestión integral de operaciones de trading, análisis de desempeño y gestión de riesgos. Sistema diseñado para traders, estudiantes e inversores.

## 🏗️ Estructura del Proyecto

```
Inversiones/
├── analisis/                 # Documentación y análisis
│   ├── ESTRUCTURA_EXCEL.md   # Análisis de estructura Excel original
│   └── PLAN_OPTIMIZACION.md  # Plan de migración a web
├── Datos Originales/        # Datos originales Excel
├── docs/                    # Documentación técnica
├── frontend/                # Aplicación React (a crear)
├── backend/                 # API Node.js (a crear)
└── scripts/                 # Scripts de utilidad
```

## 🚀 Fases de Desarrollo

### Fase 1: Análisis (✅ Completada)
- [x] Análisis estructura Excel
- [x] Plan de optimización
- [x] Arquitectura técnica

### Fase 2: Setup Inicial
- [ ] Crear rama dev
- [ ] Crear rama release
- [ ] Setup frontend React
- [ ] Setup backend

### Fase 3: MVP
- [ ] Autenticación
- [ ] CRUD Operaciones
- [ ] Dashboard básico
- [ ] Base de datos

## 📚 Documentación

- [ESTRUCTURA_EXCEL.md](./analisis/ESTRUCTURA_EXCEL.md) - Análisis detallado del Excel original
- [PLAN_OPTIMIZACION.md](./analisis/PLAN_OPTIMIZACION.md) - Plan de optimización y mejora

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Material-UI + Recharts
- **Backend:** Node.js + Express + PostgreSQL
- **Database:** Supabase (PostgreSQL)
- **Hosting:** GitHub Pages (Frontend) + Supabase (Backend)

## 📖 Guía Rápida

### Branching Strategy

```
main (release)
├── release/* (release branches)
└── dev (development)
    ├── feature/xxx
    ├── bugfix/xxx
    └── ...
```

### Workflow

1. Crear feature branch desde `dev`
2. Hacer commits
3. Pull request a `dev`
4. Review y merge
5. Cuando está listo: `dev` → `release` → `main`

## 📝 Contribuciones

Este es un proyecto académico para la universidad.

## 📄 Licencia

MIT License

## 👤 Autores

- javc402

---

**Última actualización:** 23 de Junio, 2026
