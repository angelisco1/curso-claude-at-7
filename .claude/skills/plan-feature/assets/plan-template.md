# Plan: {{TITULO_DE_LA_FEATURE}}

## Metadatos

| Campo | Valor |
| --- | --- |
| Issue | #{{NUM_ISSUE}} — {{TITULO_ISSUE}} |
| Fecha | {{YYYY-MM-DD}} |
| Autor | {{AUTOR}} |
| Estado | Borrador |
| Rama sugerida | `feat/{{NUM_ISSUE}}-{{breve-descripcion}}` |

## Objetivo y alcance

### Objetivo

{{Una o dos frases con lo que se quiere conseguir y por qué.}}

### Dentro del alcance

- {{Qué se incluye}}

### Fuera del alcance

- {{Qué NO se incluye en este plan}}

## Contexto

{{Situación actual del código y del dominio relevante para la feature: archivos, capas (routes, controllers, services, repositories), endpoints o tablas afectadas, convenciones del proyecto que aplican, enlaces a docs relevantes (por ejemplo `docs/api/api-pagination.md`).}}

## Tareas

> Cada tarea dura entre 5 y 10 minutos e incluye los tests (TDD: primero el test en rojo) y el código mínimo para que pasen. Marca el checkbox al terminarla.

- [ ] **Tarea 1: {{título corto}}**
  - Tests: {{qué casos se escriben primero y en qué archivo de `tests/`}}
  - Código: {{qué se implementa para que pasen, y en qué archivo/capa}}
- [ ] **Tarea 2: {{título corto}}**
  - Tests: {{...}}
  - Código: {{...}}

## Criterios de aceptación

- [ ] {{Criterio verificable 1}}
- [ ] {{Criterio verificable 2}}
- [ ] Todos los tests pasan con `npm test`
- [ ] Todas las tareas del plan están marcadas

## Dudas abiertas

> Preguntas que necesito que respondas antes o durante la implementación.

- [ ] **D1:** {{Pregunta}} — _Respuesta:_

## Decisiones tomadas

> Decisiones que he tomado por mi cuenta. Corrígeme si alguna no te encaja.

- **DEC1:** {{Decisión}} — _Motivo:_ {{por qué}}
