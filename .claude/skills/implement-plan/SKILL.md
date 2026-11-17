---
name: implement-plan
description: Implementa un plan de la carpeta `plans/` (generado con plan-feature) tarea a tarea con TDD estricto, marcando cada tarea en el plan y haciendo un commit por tarea, y al final verifica los criterios de aceptación. Úsala cuando el usuario pida implementar, ejecutar o desarrollar un plan.
argument-hint: "<ruta del plan, ej. plans/12-paginar-listado-vendehumos.md>"
---

# implement-plan

Implementa el plan indicado por el usuario siguiendo TDD estricto, una tarea cada vez.

## Proceso

### 1. Lee el plan

- Usa el argumento como ruta del plan. Si no viene, lista `plans/` y pregunta cuál implementar.
- Lee el plan completo: tareas, criterios de aceptación, dudas abiertas y decisiones.
- Si hay **dudas abiertas** sin responder (`_Respuesta:_` vacío) que afecten a la implementación, pregúntaselas al usuario antes de empezar.
- Lee también `CLAUDE.md` y respeta sus convenciones (arquitectura por capas, funciones en `snake_case`, sin `;` salvo cuando sea necesario, documentación en español).

### 2. Prepara la rama

El nombre de la rama viene en el plan (campo "Rama sugerida" de los metadatos).

1. Comprueba que el working tree no tiene cambios que se vayan a mezclar sin querer (`git status`). Los archivos sin relación (p. ej. `.DS_Store`) no se añaden nunca a los commits.
2. Comprueba si existe la rama `development` (`git branch --list development`, y también en remoto con `git branch -r`).
   - **Si no existe**, créala a partir de `main` o, si no existe `main`, de `master`: `git branch development main` (o `master`).
   - **Si existe**, úsala tal cual.
3. Crea la rama del plan a partir de `development` y cámbiate a ella: `git switch -c <rama> development`.
4. Si la rama del plan ya existe, no la recrees ni la sobrescribas: pregunta al usuario si continuar sobre ella.
5. Cambia el estado del plan a `En curso` en los metadatos (esto se incluirá en el commit de la primera tarea).

### 3. Implementa las tareas de 1 en 1, en orden

Para **cada** tarea sin marcar (`- [ ]`) del plan, ejecuta este ciclo completo antes de pasar a la siguiente:

1. 🔴 **Test primero.** Escribe solo los tests que describe la tarea, en el archivo de `tests/` indicado (cada archivo de test fija `process.env.DB_PATH = ':memory:'` antes de importar `app`). No escribas código de producción todavía.
2. 🔴 **Ejecútalo y comprueba que falla** (`npm test`). Tiene que salir **rojo por la razón correcta** (la funcionalidad no existe o no se comporta como se espera), no por un error de sintaxis o de import en el propio test. Si sale verde, el test no sirve: revísalo. Nunca continúes sin haber visto el rojo.
3. 🟢 **Código mínimo.** Escribe solo el código necesario para que pasen esos tests, en la capa que indica la tarea (repository → service → controller → route).
4. 🟢 **Ejecútalo de nuevo** (`npm test`) y comprueba que **toda** la suite está en verde, no solo los tests nuevos. Si falla, corrige el código (no debilites los tests para que pasen) y repite.
5. **Marca la tarea** en el plan: cambia `- [ ]` por `- [x]` en esa tarea.
6. **Commit de la tarea**, que incluye juntos los tests, el código y el plan actualizado. Sigue el formato de Conventional Commits de [.claude/commands/commit.md](../../commands/commit.md) (tipo y scope adecuados, descripción en español, minúsculas, imperativo y sin punto final) pero **sin pedir confirmación al usuario**: haz el commit directamente (en esta skill se salta el paso de confirmación de ese comando). Añade solo los archivos de la tarea con `git add <archivos>` (nunca `git add -A`) y termina el mensaje con el pie de co-autoría que indiquen las instrucciones de la sesión.

Reglas del ciclo:

- Una tarea = un commit. No mezcles tareas ni dejes una tarea a medias entre commits.
- No adelantes código de tareas futuras ni refactorices fuera del alcance de la tarea.
- Si una tarea resulta demasiado grande o el plan es incorrecto/incompleto, para y consúltalo con el usuario en lugar de improvisar. Si tomas una decisión por tu cuenta, anótala en "Decisiones tomadas" del plan.
- Si el proyecto no queda en verde tras una tarea, no pases a la siguiente.

### 4. Comprueba los criterios de aceptación

Cuando todas las tareas estén hechas:

1. Recorre los criterios de aceptación uno a uno y **verifícalos de verdad** (ejecuta `npm test`, revisa el código, haz peticiones de prueba si procede, comprueba que existe la documentación pedida, etc.). No los marques por suposición.
2. Marca con `- [x]` solo los que se cumplan. Si alguno no se cumple, corrígelo (con el mismo ciclo TDD y su commit) o, si no es posible, déjalo sin marcar y explica el motivo al usuario.
3. Cuando todos estén marcados, cambia el estado del plan a `Implementado`.
4. Haz un último commit con los cambios del plan (criterios marcados y estado), con tipo `docs`.

### 5. Informa al usuario

Resume: la rama creada, las tareas completadas (con sus commits), el resultado de los criterios de aceptación y cualquier punto pendiente o decisión que hayas tomado.

## Restricciones

- No hagas `git push`, ni abras PR, salvo que el usuario lo pida.
- No uses `--amend`, `--no-verify`, `git reset --hard` ni `git push --force`.
- No modifiques el contenido de las tareas del plan salvo para marcarlas; el plan solo cambia en checkboxes, estado y "Decisiones tomadas".
- Si un hook de pre-commit falla, corrige el problema y crea un commit nuevo.
