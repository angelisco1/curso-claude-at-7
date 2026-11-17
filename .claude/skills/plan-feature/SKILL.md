---
name: plan-feature
description: Genera un plan de implementación en markdown (carpeta `plans/`) para una feature o issue, con tareas TDD de 5-10 min, criterios de aceptación, dudas y decisiones. Úsala cuando el usuario pida planificar, diseñar o preparar la implementación de una feature, issue o cambio antes de programarlo.
argument-hint: "<num_issue> [descripción de la feature]"
---

# plan-feature

Genera un plan de implementación en `plans/<num_issue>-<breve-descripcion>.md` siguiendo la plantilla [assets/plan-template.md](assets/plan-template.md).

## Proceso

1. **Obtén el número de issue y el alcance.** Usa los argumentos si vienen. Si falta el número de issue, pregúntaselo al usuario. Si `gh` está disponible y el repo tiene remoto, puedes leer la issue con `gh issue view <num>` para extraer título y descripción.
2. **Explora el código** antes de planificar: lee `CLAUDE.md`, la estructura por capas (routes, controllers, services, repositories), los tests existentes en `tests/` y los docs de `docs/` que apliquen (p. ej. `docs/api/api-pagination.md` si la feature toca paginación).
3. **Lee la plantilla** `assets/plan-template.md` y respeta su estructura y orden de secciones. No quites ni renombres secciones.
4. **Genera el nombre del archivo**: `<num_issue>-<breve-descripcion>.md`, con la descripción en minúsculas, sin tildes, con guiones y de 2 a 5 palabras (ej. `12-paginar-listado-vendehumos.md`). Crea la carpeta `plans/` si no existe. Si el archivo ya existe, no lo sobrescribas: pregunta al usuario.
5. **Rellena el plan** según las reglas de abajo y guárdalo.
6. **Responde al usuario** con la ruta del plan, un resumen muy breve y las dudas abiertas más importantes para que las conteste.

## Reglas de contenido

- **Idioma**: todo el plan en español.
- **Metadatos**: issue, fecha (de hoy), autor (usuario de git: `git config user.name`), estado `Borrador` y rama sugerida.
- **Objetivo y alcance**: objetivo breve, y listas explícitas de dentro y fuera del alcance.
- **Contexto**: solo lo relevante para implementar (archivos, capas y convenciones afectadas), no un volcado del repo.
- **Tareas**:
  - Con checkbox `- [ ]`, para marcarlas al implementarlas.
  - Cada tarea debe poder hacerse en **5-10 minutos**. Si es más grande, divídela.
  - Cada tarea incluye **tests (TDD, primero en rojo) + el código mínimo para que pasen**. Nunca separes los tests en una tarea aparte.
  - Ordénalas de forma que cada una deje el proyecto en verde y siga la arquitectura por capas (repository → service → controller → route).
  - Respeta las convenciones del proyecto: funciones en `snake_case` y sin `;` salvo cuando sea necesario.
- **Criterios de aceptación**: checkboxes verificables y objetivos que indiquen cuándo el plan está terminado. Incluye siempre que `npm test` pasa y que todas las tareas están marcadas.
- **Dudas abiertas**: preguntas reales que no puedas resolver con el código o la issue, con hueco `_Respuesta:_` para que el usuario conteste. Si no hay, indica "Ninguna".
- **Decisiones tomadas**: toda suposición o elección que hagas por tu cuenta, con su motivo, para que el usuario pueda corregirte.

## Importante

- Esta skill solo **planifica**: no implementes código, no crees tests ni hagas commits.
- No inventes información de la issue: si algo no está claro, va a "Dudas abiertas".
