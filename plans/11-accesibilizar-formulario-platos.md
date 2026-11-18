# Plan: Accesibilizar el formulario de platos

## Metadatos

| Campo | Valor |
| --- | --- |
| Issue | #11 — Accesibilizar el formulario de platos |
| Fecha | 2026-11-18 |
| Autor | angelvil92 |
| Estado | En curso |
| Rama sugerida | `feat/11-accesibilizar-formulario-platos` |

## Objetivo y alcance

### Objetivo

Que el formulario de creación/edición de platos de `web-admin` cumpla WCAG 2.2 nivel AA: se puede rellenar y enviar solo con el teclado, con un orden de tabulación lógico, foco visible y errores anunciados y asociados a cada campo. Como evidencia, un test de Playwright graba un vídeo creando un plato solo con el teclado, y la lógica y el marcado accesible quedan cubiertos con tests unitarios.

### Dentro del alcance

- `DishFormComponent` (`/restaurants/:restaurantId/dishes/new` y `/:id/edit`).
- Etiquetas reales (`<label for>`) en todos los controles y título como encabezado (`<h1>`).
- Sustituir los `div` clicables (Guardar, Cancelar, añadir ingrediente, quitar ingrediente, volver) por `<button>`/`<a>` nativos con nombre accesible.
- Envolver en `<form>` con `(ngSubmit)` para enviar con Enter.
- Validación en cliente (nombre obligatorio, precio > 0, al menos un ingrediente; y al añadir ingrediente: ingrediente seleccionado y cantidad > 0) con mensajes por campo (`aria-invalid`, `aria-describedby`), resumen de errores con `role="alert"` y foco al primer campo inválido.
- Indicador de foco visible (`:focus-visible`) en **todas las apps** (`web-admin`, `web-empleados`, `web-clientes`) y en `web-shared/src/lib/styles/base.css` (WCAG 2.4.7 / 2.4.11).
- **Tests unitarios** en `web-admin` con el runner oficial de Angular 21 (`@angular/build:unit-test` + Vitest + jsdom): funciones de validación y componente (`TestBed`).
- **Tests E2E** con Playwright en `web-admin`; Playwright hace el seed y levanta API y `web-admin` automáticamente. Incluye `@axe-core/playwright` para el chequeo de WCAG 2.2 AA.
- Vídeo del flujo con teclado (error de validación + creación correcta) con pausas entre acciones, **versionado en el repo**.

### Fuera del alcance

- Accesibilidad del resto de pantallas de las apps (listados, shell/menú, etc.), salvo los estilos globales de foco.
- Tests unitarios en `web-empleados`, `web-clientes` y `web-shared` (solo se configura el runner en `web-admin`).
- Cambios en la API o en sus validaciones.
- Integrar los tests de frontend en CI.

## Contexto

- **Formulario**: [dish-form.component.html](../packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html), [dish-form.component.ts](../packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts) y su `.css`. Usa `FormsModule` con `[(ngModel)]` sobre `form: CreateDishDto`, e inyecta `DishStore`, `DishService`, `IngredientStore`, `ActivatedRoute` y `Router`. Problemas detectados:
  - Las etiquetas son `<div class="fake-label">` (no asociadas a los controles) y el título es `<div class="fake-title">`.
  - Guardar, Cancelar, "añadir ingrediente" (`+`) y "quitar ingrediente" (papelera) son `<div (click)>`: no son focusables ni activables con teclado y no tienen nombre accesible.
  - El enlace "volver" solo contiene un icono, sin texto accesible.
  - No hay `<form>`, así que Enter no envía. No hay validación en cliente: los errores solo llegan de la API (`Dish name is required`, `Price must be a positive number`, en inglés) en un `alert-error` genérico sin `role`.
  - El precio por defecto es `0`, lo que provoca siempre `InvalidPriceError` en la API si no se cambia.
  - `addIngredient()` ignora en silencio una cantidad inválida o un ingrediente sin seleccionar.
- **Estilos globales**: cada app tiene su propia copia en `packages/<app>/src/styles.css` (no importan `web-shared/src/lib/styles/base.css`). Todas hacen `outline: none` en `button` y en `.form-control:focus`, así que el foco apenas se ve. El cambio de foco hay que replicarlo en los 4 ficheros.
- **Tests de frontend**: no hay runner configurado. `web-admin` ya tiene `tsconfig.spec.json`, pero `angular.json` no tiene target `test`. Angular 21 trae `@angular/build:unit-test` con Vitest.
- **Rutas**: lazy loading en [app.routes.ts](../packages/web-admin/src/app/app.routes.ts) y [dishes.routes.ts](../packages/web-admin/src/app/features/dishes/dishes.routes.ts); todo bajo `authGuard`.
- **Datos de prueba**: `npm run seed` (idempotente, `INSERT OR IGNORE`); usuario `admin@resttek.com` / `admin@resttek.com`; restaurante `rest-1` con ingredientes.
- **Convenciones**: sin `;` salvo que sea necesario; funciones nuevas en `snake_case`; textos de UI en español; tests junto al código como en la API (`*.test.ts`).

## Tareas

> Cada tarea dura entre 5 y 10 minutos e incluye los tests (TDD: primero el test en rojo) y el código mínimo para que pasen. Marca el checkbox al terminarla.

### Infraestructura

- [x] **Tarea 1: Runner de tests unitarios en web-admin**
  - Tests: `dish-form.component.test.ts` con un primer test "se crea el componente". Usa `TestBed`, `provideRouter([])` y un `ActivatedRoute` falso con `restaurantId = 'rest-1'`, y sustituye `DishStore`, `DishService` e `IngredientStore` por dobles con `vi.fn()`. Debe pasar (es la base).
  - Código: añadir `vitest` y `jsdom` como devDependencies de `web-admin`. Añadir el target `test` en `angular.json` con builder `@angular/build:unit-test` e `include: ['src/**/*.test.ts']`, y el script `test` en `packages/web-admin/package.json`. En el `package.json` raíz, `npm test` pasa a ejecutar la API y `web-admin`, y se añade `test:admin`. Actualizar la sección Comandos de `CLAUDE.md`.
- [x] **Tarea 2: Infraestructura Playwright en web-admin**
  - Tests: `packages/web-admin/e2e/dish-form.a11y.spec.ts` con un primer test que entra como admin (helper `login_as_admin` en `e2e/helpers.ts`), navega a `/restaurants/rest-1/dishes/new` y comprueba que se ve "Nuevo plato". Debe pasar.
  - Código: añadir `@playwright/test` y `@axe-core/playwright` como devDependencies de `web-admin`. Crear `playwright.config.ts` con Chromium y `baseURL` `http://localhost:4200`. El `webServer` arranca la API con el seed previo (`npm run seed && npm run dev:api`, esperando a `http://localhost:3000/health`) y `npm run dev:admin` (esperando a `:4200`), con `reuseExistingServer: !process.env.CI`. Añadir los scripts `e2e` en `web-admin` y `e2e` en la raíz, e ignorar `test-results/` y `playwright-report/` en `.gitignore`.

### Validación (lógica pura)

- [x] **Tarea 3: `validate_dish_form`**
  - Tests: en `dish-form.validation.test.ts`, el nombre vacío o solo con espacios da el error "El nombre es obligatorio". El precio `null`, `0` o negativo da "El precio debe ser mayor que 0". Sin ingredientes da "Añade al menos un ingrediente". Un formulario válido (con un ingrediente o más) devuelve `{}` (rojo).
  - Código: en `dish-form.validation.ts`, la función pura `validate_dish_form(form): Partial<Record<'name' | 'price' | 'ingredients', string>>`.
- [x] **Tarea 4: `validate_new_ingredient`**
  - Tests: sin ingrediente seleccionado da "Selecciona un ingrediente". Una cantidad `0`, negativa o vacía da "La cantidad debe ser mayor que 0". Un ingrediente ya añadido da "El ingrediente ya está en el plato". Uno válido devuelve `{}` (rojo).
  - Código: la función `validate_new_ingredient(id, qty, current)` en el mismo fichero.

### Marcado accesible del componente

- [x] **Tarea 5: Título como encabezado y etiquetas asociadas a los campos principales**
  - Tests (unitario): el componente renderiza un `h1` con "Nuevo plato" (y "Editar plato" con `id`). Para nombre, precio, categoría, disponible y descripción existe un `label[for]` cuyo `for` coincide con el `id` del control (rojo).
  - Código: cambiar `fake-title` por `<h1>` y los `fake-label` por `<label for="dish-…">` con `id` en cada control. Ajustar el CSS para mantener el aspecto.
- [x] **Tarea 6: Agrupación y etiquetas de la sección de ingredientes**
  - Tests (unitario): existe un `fieldset` con `legend` "Ingredientes del plato". El select de ingrediente y el input de cantidad tienen un `label` asociado (rojo).
  - Código: `<fieldset>` + `<legend>` y etiquetas (visualmente ocultas con `.sr-only` si hace falta). Añadir la utilidad `.sr-only` a `styles.css`.
- [x] **Tarea 7: Botón nativo para añadir ingrediente con errores por campo**
  - Tests (unitario): "Añadir ingrediente" es un `button[type=button]` con `aria-label`. Al pulsarlo con datos válidos se añade el ingrediente a `form.ingredients`. Con datos inválidos no se añade, el control queda con `aria-invalid="true"` y `aria-describedby` apunta al mensaje de `validate_new_ingredient` (rojo).
  - Código: sustituir el `div` por `<button>`. `addIngredient()` usa `validate_new_ingredient` y guarda los errores en la signal `errors`.
- [x] **Tarea 8: Lista de ingredientes y botón nativo para quitarlos**
  - Tests (unitario): los ingredientes añadidos se pintan en un `ul` > `li`. Cada uno tiene un `button` con `aria-label` "Quitar <nombre>". Al pulsarlo se elimina y el foco vuelve al select de ingrediente (rojo).
  - Código: chips como `<ul>/<li>` y `chip-remove` como `<button type="button">`; tras quitar, `focus()` en el select.
- [x] **Tarea 9: Enlace "volver" e iconos decorativos**
  - Tests (unitario): el enlace de volver tiene `aria-label` "Volver al listado de platos". Todos los `lucide-icon` del formulario tienen `aria-hidden="true"` (rojo).
  - Código: añadir `aria-label` al enlace y `aria-hidden` a los iconos.

### Envío y errores

- [x] **Tarea 10: `<form>` con `ngSubmit` y botones Guardar/Cancelar nativos**
  - Tests (unitario): existe un `form`. "Guardar" es `button[type=submit]` y "Cancelar" es un `a` con `routerLink` al listado. Con datos válidos (nombre, precio y un ingrediente), disparar `submit` en el form llama a `store.create('rest-1', form)` y navega al listado (rojo).
  - Código: `<form (ngSubmit)="onSubmit()" novalidate>`, Guardar como `<button type="submit">` (con `aria-busy` mientras `loading()`), Cancelar como `<a routerLink class="btn">`.
- [x] **Tarea 11: Validación en el envío con error por campo**
  - Tests (unitario): con nombre vacío, precio `null` y sin ingredientes, al enviar no se llama a `store.create`. Nombre y precio tienen `aria-invalid="true"` y `aria-describedby` con el id de un mensaje visible que contiene el texto de `validate_dish_form`. El `fieldset` de ingredientes y su select quedan asociados (`aria-describedby`) al mensaje "Añade al menos un ingrediente". Al corregir el campo, o al añadir un ingrediente, el error desaparece (rojo).
  - Código: `onSubmit` valida antes de llamar al store. El precio inicial pasa a `null` en lugar de `0` (con un tipo de formulario propio que admite `null` y se convierte a `CreateDishDto` al enviar). Mensajes con `id="dish-<campo>-error"`.
- [x] **Tarea 12: Resumen de errores anunciado y foco al primer campo inválido**
  - Tests (unitario): tras un envío inválido aparece un elemento con `role="alert"` que indica el número de errores e incluye enlaces a cada campo. `document.activeElement` es el input del nombre. Si solo falta el ingrediente, el foco va al select de ingrediente. El `alert-error` de errores de API también tiene `role="alert"` (rojo).
  - Código: añadir el bloque de resumen y hacer `focus()` en el primer control con error (`ElementRef`/`viewChild`) tras validar.
- [x] **Tarea 13: Modo edición sigue funcionando**
  - Tests (unitario): con `id` en la ruta, `DishService.getById` (falso) rellena los campos. Al enviar se llama a `store.update` y no a `store.create` (rojo si el refactor lo rompió; si pasa a la primera, confirmar que falla al cambiar la llamada).
  - Código: ajustes mínimos en `loadDish`/`onSubmit` con el nuevo tipo de formulario.

### Foco visible (todas las apps)

- [x] **Tarea 14: Foco visible en web-admin**
  - Tests (E2E): `e2e/focus-visible.spec.ts` monta un HTML mínimo con `page.setContent` (un `button`, un `a`, un `.btn` y un `.form-control`), inyecta `packages/web-admin/src/styles.css` con `page.addStyleTag({ path })`, recorre con Tab y comprueba que el `outline-style` calculado del elemento activo no es `none` (rojo).
  - Código: regla `:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px }` para `button`, `a`, `.btn` y `.form-control`, quitando los `outline: none` que lo impiden. Verificar que el contraste del color de foco con el fondo es ≥ 3:1.
- [x] **Tarea 15: Foco visible en web-empleados, web-clientes y web-shared**
  - Tests (E2E): parametrizar el spec anterior para los `styles.css` de `web-empleados` y `web-clientes` y para `web-shared/src/lib/styles/base.css` (rojo en los tres).
  - Código: aplicar la misma regla en los tres ficheros.

### Comportamiento con teclado en navegador real

- [x] **Tarea 16: Flujo de ingredientes y envío con teclado**
  - Tests (E2E): con el teclado, Tab hasta el select de ingrediente, flechas para elegir, Tab a la cantidad, Tab y Espacio en "Añadir ingrediente": aparece el ingrediente. Después, rellenando nombre "Plato E2E <timestamp>" y precio (con el ingrediente ya añadido), Enter en el nombre envía y el plato aparece en el listado. Debe pasar con lo implementado; si falla, corregir.
  - Código: correcciones que salgan del test.
- [ ] **Tarea 17: Orden de tabulación lógico**
  - Tests (E2E): desde el enlace "volver", con Tab el foco recorre en este orden: volver → nombre → precio → categoría → disponible → descripción → ingrediente → cantidad → añadir → Cancelar → Guardar.
  - Código: corregir el orden del DOM si hace falta (sin `tabindex` positivos).
- [ ] **Tarea 18: Chequeo automático WCAG 2.2 AA con axe**
  - Tests (E2E): `new AxeBuilder({ page }).include('form').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()` no da violaciones, ni en el estado inicial ni con los errores visibles (rojo si quedan violaciones).
  - Código: corregir lo que reporte axe (p. ej. contraste de los mensajes de error, `autocomplete`).
- [ ] **Tarea 19: Test de vídeo del flujo completo con teclado**
  - Tests (E2E): `e2e/dish-form.keyboard-video.spec.ts` con `test.use({ video: 'on', viewport: { width: 1280, height: 800 }, launchOptions: { slowMo: 400 } })` y `page.waitForTimeout(800)` entre los pasos clave. El flujo usa solo `page.keyboard` (sin `click` tras el login):
    1. Tab hasta Guardar y Enter con el formulario vacío: se ven los errores (nombre, precio y ingredientes) y el foco va al nombre.
    2. Escribir el nombre → Tab → precio → Tab → categoría (flechas) → Tab → disponible → Tab → descripción → Tab → ingrediente (flechas) → Tab → cantidad → Tab → Espacio en "Añadir ingrediente".
    3. Tab hasta Guardar y Enter: el plato aparece en el listado.
  - Código: en `afterEach`, guardar el vídeo con `page.video().saveAs('e2e/videos/dish-form-teclado.webm')`. Añadir el script `e2e:video`. **Versionar** `e2e/videos/dish-form-teclado.webm`. Añadir una sección breve en `docs/arquitectura/arquitectura-frontend.md` sobre cómo lanzar los tests unitarios, los E2E y regenerar el vídeo.

## Criterios de aceptación

- [ ] El formulario de platos (crear y editar) se puede completar y enviar solo con el teclado: Tab/Shift+Tab, flechas en los `select`, Espacio/Enter en botones y Enter para enviar.
- [ ] El orden de tabulación coincide con el visual y todos los elementos interactivos muestran un indicador de foco visible en `web-admin`, `web-empleados` y `web-clientes`.
- [ ] Todos los controles tienen etiqueta asociada y los botones/enlaces de solo icono tienen nombre accesible.
- [ ] Son obligatorios el nombre, un precio mayor que 0 y al menos un ingrediente.
- [ ] Al enviar con campos obligatorios vacíos se muestran errores por campo (`aria-invalid` + `aria-describedby`) y un resumen anunciado (`role="alert"`), el foco va al primer campo inválido y no se llama a la API.
- [ ] `axe` no reporta violaciones WCAG 2.2 A/AA en el formulario (estado inicial y con errores).
- [ ] Existe en el repo `packages/web-admin/e2e/videos/dish-form-teclado.webm`, generado con Playwright. Con pausas visibles entre acciones, se ve primero el envío del formulario vacío con sus errores y después la creación de un plato nuevo usando solo el teclado (tabs, flechas, espacio, enter) hasta verlo en el listado.
- [ ] `npm run e2e` pasa partiendo de las apps paradas (Playwright hace el seed y levanta la API y `web-admin`).
- [ ] Los tests unitarios de `web-admin` (validación y componente) pasan con `npm run test:admin`.
- [ ] `npm run build -w @resttek/web-admin`, `-w @resttek/web-empleados` y `-w @resttek/web-clientes` compilan sin errores.
- [ ] Todos los tests pasan con `npm test`
- [ ] Todas las tareas del plan están marcadas

## Dudas abiertas

> Preguntas que necesito que respondas antes o durante la implementación.

- [x] **D1:** ¿Cuál es el número de issue en GitHub? — _Respuesta:_ La #11.
- [x] **D2:** ¿El vídeo se versiona en el repo o solo se adjunta a la PR? — _Respuesta:_ Se guarda en el repo.
- [x] **D3:** ¿La validación en cliente cubre solo los campos que exige la API (nombre y precio) o también otros (p. ej. al menos un ingrediente)? — _Respuesta:_ También se exige al menos un ingrediente.
- [x] **D4:** ¿El foco visible solo en `web-admin` o en todas las apps? — _Respuesta:_ En todas las apps.
- [x] **D5:** ¿Los E2E levantan las apps y hacen el seed automáticamente? — _Respuesta:_ Sí, levantan las apps y hacen el seed.

## Decisiones tomadas

> Decisiones que he tomado por mi cuenta. Corrígeme si alguna no te encaja.

- **DEC1:** Tests unitarios con el builder oficial `@angular/build:unit-test` (Vitest + jsdom) solo en `web-admin`. — _Motivo:_ es el runner por defecto de Angular 21, comparte herramienta con la API (Vitest) y basta con `web-admin` para esta issue.
- **DEC2:** Los tests unitarios de frontend se nombran `*.test.ts` junto al código y los E2E `*.spec.ts` en `packages/web-admin/e2e/`. — _Motivo:_ sigue la convención de la API y evita que Vitest y Playwright recojan los ficheros del otro.
- **DEC3:** Reparto de responsabilidades: los unitarios cubren la lógica y el marcado accesible (labels, roles, ARIA, foco tras validar), y los E2E cubren lo que necesita un navegador real (teclado, orden de tabulación, foco visible calculado, axe y vídeo). — _Motivo:_ jsdom no calcula estilos ni simula la navegación por Tab de forma fiable.
- **DEC4:** `npm test` en la raíz pasa a ejecutar los tests de la API y los unitarios de `web-admin` (no los E2E), y se actualiza `CLAUDE.md`. — _Motivo:_ que el criterio "`npm test` pasa" cubra también los tests nuevos; los E2E son lentos y necesitan servidores.
- **DEC5:** Playwright como devDependency de `@resttek/web-admin`, con un `webServer` que ejecuta `npm run seed` antes de arrancar la API y reutiliza los servidores ya levantados en local. — _Motivo:_ responde a D5 sin romper el flujo de quien ya tiene las apps arrancadas.
- **DEC6:** El foco visible en las otras apps se comprueba inyectando su `styles.css` en una página mínima de Playwright, sin levantarlas. — _Motivo:_ cada app tiene su propia copia de estilos; así se verifica sin añadir infraestructura de tests en cada una.
- **DEC7:** Añadir `@axe-core/playwright` para el chequeo automático de WCAG 2.2 AA. — _Motivo:_ da un criterio objetivo de "cumple AA".
- **DEC8:** Mantener `FormsModule` (template-driven) en lugar de migrar a Reactive Forms. — _Motivo:_ es el cambio mínimo y la accesibilidad no depende del tipo de formulario.
- **DEC9:** Mensajes de validación en español y en cliente; los de la API se siguen mostrando tal cual en el `alert` general. — _Motivo:_ la UI está en español y la API queda fuera del alcance.
- **DEC10:** Precio inicial vacío (`null`) en lugar de `0`. — _Motivo:_ permite detectar "no rellenado" y evita enviar un valor que la API rechaza siempre.
- **DEC11:** El retardo del vídeo se consigue con `slowMo: 400` ms y pausas explícitas de ~800 ms entre los pasos clave. — _Motivo:_ cada pulsación se ve bien sin alargar demasiado el vídeo.
- **DEC12:** Los tests E2E usan nombres de plato únicos (`Plato E2E <timestamp>`) en `rest-1`. — _Motivo:_ el seed no borra los datos previos (hay otra issue abierta para eso), así que se evitan colisiones entre ejecuciones.
- **DEC13:** La regla "al menos un ingrediente" solo se valida en el cliente; la API no cambia. Al editar un plato existente sin ingredientes, habrá que añadir uno para poder guardarlo. — _Motivo:_ la API está fuera del alcance (respuesta a D3). Si quieres que la API también lo exija, sería otra issue.
- **DEC14:** El test de `aria-hidden` en los iconos ya pasaba antes de implementar (lucide-angular lo pone por defecto); se añade igualmente `aria-hidden="true"` explícito en la plantilla para no depender de la librería. — _Motivo:_ el criterio de accesibilidad queda garantizado por el propio marcado.
- **DEC15:** Se excluyen `src/**/*.test.ts` de `tsconfig.app.json`. — _Motivo:_ sin ello `ng build` intentaba compilar los tests unitarios y fallaba (`vi`/`describe` sin tipos); el build de producción debe seguir compilando.
- **DEC16:** En los E2E, para elegir opción en un `select` con teclado se usa el helper `elegir_opcion_con_teclado`: prueba la flecha y, si el valor no cambia, escribe el comienzo del texto de la opción. — _Motivo:_ en Chromium sobre macOS la flecha en un `select` cerrado solo abre el desplegable y Playwright no lo maneja; no es un fallo de la aplicación.
