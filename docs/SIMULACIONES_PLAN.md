# Modulo de Simulacion - Plan Funcional y Tecnico

## 1) Objetivo
Construir un modulo de simulacion de operativa que permita:
- Definir parametros de una cuenta simulada.
- Generar operaciones aleatorias dentro de un rango de fechas.
- Visualizar resultados en un dashboard similar al actual.
- Editar directamente valores de la tabla de resultados en modo simulacion.
- Guardar la simulacion en BBDD.
- Listar simulaciones guardadas.

Nota importante de arquitectura:
- Los datos funcionales nuevos se persistiran en BBDD.
- Para simulaciones no guardadas se usara estado de trabajo en memoria de UI; opcionalmente borrador en BBDD con estado draft (recomendado), evitando dependencia de localStorage.

---

## 2) Alcance funcional (MVP)

### 2.1 Crear cuenta simulada
Opciones:
- Crear cuenta simulada nueva:
  - Nombre de la cuenta
  - Capital inicial
  - Moneda (USD por defecto)
  - Riesgo por operacion (opcional en MVP, recomendado)
- Usar cuenta existente:
  - Seleccionar una cuenta real existente del usuario.
  - Cargar sus datos base y trabajar desde ahi en modo simulacion.

### 2.2 Configurar rango temporal
- Fecha inicio
- Fecha fin
- Validacion: inicio <= fin

### 2.3 Definir volumen de operacion
- Dias de operacion (selector tipo alarma):
  - L, M, X, J, V, S, D
  - Preseleccion: L-V
- Maximo de operaciones diarias
  - Sin rango minimo/maximo.
  - El motor puede generar desde 0 hasta el maximo diario (incluyendo dias sin operativa por noticia).

### 2.4 Definir distribucion de resultados
- Porcentajes objetivo:
  - Exito
  - SL
  - Breakeven
  - No operar
- Validacion:
  - Ninguno negativo
  - Suma exacta == 100

### 2.5 Generacion de simulacion
El motor debe:
- Recorrer dias validos del rango segun dias de operacion.
- Definir oportunidades por dia entre 0 y maximo diario.
- Asignar resultado por operacion segun distribucion configurada.
- Permitir que parte de las oportunidades queden como no operar (por noticia/criterio), segun porcentaje configurado.
- Calcular metricas agregadas.

### 2.6 Resumen previo y confirmacion
Antes de generar:
- Mostrar numero estimado de dias operables.
- Maximo potencial de oportunidades totales (dias operables * maximo diario).
- Distribucion esperada por tipo de resultado.

### 2.7 Dashboard de simulacion
- Misma estructura del dashboard actual para reuso visual y logico.
- Tabla de resultados:
  - Editable directamente en: fecha, invertido, resultado, tecnico y tipo.
  - Tipo se genera aleatoriamente (buy/sell) y luego puede editarse.
  - Sin botones de accion por fila.
- Tarjetas y graficos con mismo comportamiento del dashboard real.

### 2.8 Acciones superiores del simulador
Junto a filtros:
- Nueva simulacion
  - Confirmacion previa: se perderan cambios no guardados.
  - Limpia estado de trabajo actual.
- Guardar simulacion
  - Persiste cabecera + operaciones + metricas en BBDD.

### 2.9 Pantalla principal de simulaciones
- Lista de simulaciones guardadas:
  - Nombre
  - Rango de fechas
  - Total oportunidades
  - Exitosas / SL / Breakeven / No operar
  - Fecha de guardado
- Acciones basicas:
  - Abrir
  - Duplicar (opcional recomendado)
  - Eliminar (opcional MVP+1)

---

## 3) Reglas de negocio clave
- No generar operaciones fuera de los dias seleccionados.
- No exceder maximo diario.
- En cada dia, oportunidades entre 0 y maximo diario.
- Distribucion de resultados respeta porcentajes definidos.
- Exito + SL + Breakeven + No operar debe sumar exactamente 100.
- Toda simulacion guardada queda versionada por timestamp.
- Si no esta guardada, se considera estado de trabajo descartable.

---

## 4) Estrategia de aleatoriedad (controlada)

## 4.1 Metodo recomendado
- Semilla reproducible por simulacion (seed).
- PRNG deterministico para poder regenerar la misma simulacion con la misma semilla.

## 4.2 Pasos
1. Construir lista de dias operables.
2. Para cada dia:
  - Sortear numero de oportunidades N en [0, maximo_diario].
3. Para cada oportunidad:
   - Sortear tipo de resultado usando distribucion ponderada.
  - Si tipo = no_operar, registrar oportunidad no ejecutada.
4. Ajuste final de desviacion:
   - Corregir ligeramente al final para acercarse al porcentaje objetivo global (sin romper naturalidad diaria).

## 4.3 Beneficios
- Resultados realistas por dia.
- Coherencia estadistica total.
- Reproducibilidad para auditoria y debugging.

---

## 5) Modelo de datos propuesto (BBDD)

Tabla simulaciones
- id (uuid)
- user_id
- nombre
- cuenta_nombre
- capital_inicial
- moneda
- fecha_inicio
- fecha_fin
- dias_operacion (array texto)
- ops_max_dia
- pct_exito
- pct_sl
- pct_breakeven
- pct_no_operar
- seed
- estado (draft | saved)
- created_at
- updated_at

Tabla simulacion_operaciones
- id (uuid)
- simulacion_id (fk)
- fecha_operacion
- indice_dia
- resultado_tipo (win | sl | breakeven | no_operar)
- resultado_r
- riesgo_usd
- inversion_pct
- resultado_usd
- editable_override (bool)
- created_at
- updated_at

Tabla simulacion_metricas (opcional, derivable)
- simulacion_id (fk)
- total_oportunidades
- total_operaciones_ejecutadas
- total_win
- total_sl
- total_breakeven
- total_no_operar
- neto_usd
- win_rate
- created_at

---

## 6) Reuso del dashboard actual
En vez de duplicar, separar en capas:
- Capa comun de visualizacion de resumen y graficos.
- Adaptador de datos para modo real y modo simulacion.
- Tabla con modo editable solo para simulacion.

Propuesta tecnica:
- Crear componente DashboardCore compartido.
- Crear proveedor de datos:
  - RealDataProvider
  - SimulationDataProvider

Ventaja:
- Todo cambio futuro del dashboard impacta automaticamente en simulador.

---

## 7) Flujo UX propuesto
0. Menu lateral: Dashboard -> Simulacion -> resto de modulos.
1. Pantalla Simulaciones (lista)
2. Crear nueva simulacion
3. Wizard de configuracion (pasos)
4. Resumen previo
5. Generar
6. Dashboard de simulacion
7. Guardar simulacion

---

## 8) Prototipos ASCII (Desktop + Mobile)

## 8.1 Menu lateral (orden actualizado)

+--------------------------------+
| PRINCIPAL                      |
|  - Dashboard                   |
|  - Simulacion                  |
| GESTION                        |
|  - Mis noticias                |
|  - Entradas mercado            |
|  - Gestionar cuentas           |
+--------------------------------+

## 8.2 Lista principal de simulaciones (Desktop)

+---------------------------------------------------------------+
| Simulaciones                                      [+ Nueva]   |
+---------------------------------------------------------------+
| Buscar: [________________________]   Estado: [Todos v]        |
+---------------------------------------------------------------+
| Nombre           | Rango             | Oport | W/SL/BE/NO | Accion |
|---------------------------------------------------------------|
| Q3 Forex         | 2026-01-01..03-31 | 180   | 70/55/30/25 | Abrir |
| Backtest NY      | 2025-06-01..12-31 | 420   | 180/120/60/60| Abrir|
+---------------------------------------------------------------+

## 8.3 Lista principal de simulaciones (Mobile)

+--------------------------------------+
| Simulaciones          [+ Nueva]      |
+--------------------------------------+
| [Buscar............................] |
| [Todos v]                            |
+--------------------------------------+
| Q3 Forex                             |
| 2026-01-01..03-31                    |
| Oport: 180  W/SL/BE/NO: 70/55/30/25  |
| [Abrir]                              |
+--------------------------------------+

## 8.4 Wizard paso 1 - Cuenta

+---------------------------------------------------------------+
| Nueva simulacion - Paso 1/4                                   |
+---------------------------------------------------------------+
| Nombre simulacion        [___________________________]         |
| Tipo cuenta              ( ) Nueva   ( ) Usar existente       |
| Cuenta existente         [Seleccionar cuenta v]                |
| Nombre cuenta            [___________________________]         |
| Capital inicial          [___________]  Moneda [USD v]         |
| Riesgo por operacion %   [____] (opcional recomendado)         |
|                                                               |
|                                   [Cancelar] [Siguiente >]    |
+---------------------------------------------------------------+

## 8.5 Wizard paso 2 - Rango temporal y dias

+---------------------------------------------------------------+
| Nueva simulacion - Paso 2/4                                   |
+---------------------------------------------------------------+
| Fecha inicio  [dd/mm/aaaa]    Fecha fin [dd/mm/aaaa]          |
| Dias operacion:                                            |
| [x]L [x]M [x]X [x]J [x]V [ ]S [ ]D                           |
|                                                               |
|                                   [< Atras] [Siguiente >]     |
+---------------------------------------------------------------+

## 8.6 Wizard paso 3 - Volumen y distribucion

+---------------------------------------------------------------+
| Nueva simulacion - Paso 3/4                                   |
+---------------------------------------------------------------+
| Maximo de operaciones por dia [__]                              |
|                                                               |
| Distribucion resultados (%)                                     |
| Exito      [__]                                                 |
| SL         [__]                                                 |
| Breakeven  [__]                                                 |
| No operar  [__]                                                 |
| Suma: 100% (validado)                                           |
|                                                               |
|                                   [< Atras] [Siguiente >]     |
+---------------------------------------------------------------+

## 8.7 Wizard paso 4 - Resumen y generar

+---------------------------------------------------------------+
| Nueva simulacion - Paso 4/4                                   |
+---------------------------------------------------------------+
| Cuenta: Demo NY / Capital: 10,000 USD                         |
| Rango: 2026-01-01 a 2026-12-31                                 |
| Dias: L M X J V                                                 |
| Maximo diario: 4                                                 |
| Distribucion: Exito 40% | SL 30% | BE 20% | NO 10%              |
|                                                               |
| Estimado dias operables: 261                                    |
| Oportunidades maximas: 1044                                      |
|                                                               |
|                           [< Atras] [Generar simulacion]       |
+---------------------------------------------------------------+

## 8.8 Dashboard de simulacion (Desktop)

+-----------------------------------------------------------------------+
| Simulacion: Demo NY     [Nueva simulacion] [Guardar simulacion]       |
+-----------------------------------------------------------------------+
| Filtros: [Cuenta v] [Anio v] [Mes v]                                  |
+-----------------------------------------------------------------------+
| KPI1 Oport | KPI2 Exito | KPI3 SL | KPI4 BE | KPI5 No operar | Neto  |
+-----------------------------------------------------------------------+
| Grafico evolucion              | Distribucion                          |
+-----------------------------------------------------------------------+
| Tabla operaciones (editable inline, sin botones por fila)             |
| Fecha       Tipo     Riesgo USD   Inversion %   Resultado R   USD      |
| 01/01/2026  Win      [50]         [1.0]         [1.5]         75       |
| 01/01/2026  SL       [50]         [1.0]         [-1.0]       -50       |
+-----------------------------------------------------------------------+

## 8.9 Dashboard de simulacion (Mobile)

+--------------------------------------+
| Simulacion: Demo NY                  |
| [Nueva] [Guardar]                    |
| Filtros [Cuenta v] [Anio v] [Mes v]  |
+--------------------------------------+
| KPI (apilados)                        |
| Oport / Exito / SL / BE / No operar  |
+--------------------------------------+
| Grafico evolucion                     |
| Distribucion                          |
+--------------------------------------+
| Tabla editable (columnas clave)       |
| Fecha | Tipo | Riesgo | Resultado     |
+--------------------------------------+

## 8.10 Confirmacion nueva simulacion

+---------------------------------------------------------------+
| Confirmacion                                                   |
+---------------------------------------------------------------+
| Se perderan los cambios no guardados de la simulacion actual. |
| Deseas continuar?                                              |
|                                         [Cancelar] [Continuar] |
+---------------------------------------------------------------+

---

## 9) Plan de implementacion por fases

Fase 1 (MVP funcional)
- Modelo BBDD simulaciones + operaciones.
- API CRUD basica de simulaciones.
- Wizard de creacion + validaciones.
- Generador aleatorio con seed.
- Dashboard simulacion con tabla editable.
- Botones Nueva simulacion y Guardar simulacion.
- Lista de simulaciones guardadas.
- Integracion del menu Simulacion justo despues de Dashboard.

Fase 2 (Mejora)
- Duplicar simulacion.
- Versionado de escenarios.
- Exportacion CSV.
- Comparador entre simulaciones.

Fase 3 (Avanzado)
- Perfiles de estrategia.
- Restricciones por sesion/activo.
- Monte Carlo multipaso.

---

## 10) Riesgos y mitigacion
- Aleatoriedad poco realista:
  - Mitigar con semilla + ajuste de desviacion global.
- Crecimiento de volumen de operaciones:
  - Paginacion y carga incremental.
- Divergencia entre dashboard real y simulado:
  - Reuso por componente comun.

---

## 11) Decisiones ya confirmadas
1. Operativa diaria: solo maximo por dia (sin rango).
2. Cuenta: puede ser nueva o una existente.
3. Distribucion: Exito + SL + Breakeven + No operar = 100 exacto.
4. Debe existir vista mobile del flujo y dashboard de simulacion.
5. Menu: Simulacion va justo despues de Dashboard.
6. Guardado: si la simulacion ya existe, se actualiza (no version nueva obligatoria).
7. No operar: se guarda como fila en la tabla de operaciones.

## 12) Siguiente paso aprobado
1. Implementar migraciones SQL del modulo de simulaciones (tablas, constraints, indices y RLS).
