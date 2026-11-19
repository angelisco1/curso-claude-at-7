# Auditoría de seguridad OWASP Top 10 (2021) - Resttek

- **Alcance:** monorepo completo (`packages/api`, `web-admin`, `web-empleados`, `web-clientes`, `web-shared`), configuración del repositorio (`.gitignore`, `.mcp.json`, `.claude/`) y dependencias (`npm audit`).
- **Tipo de auditoría:** revisión estática de código (solo lectura). No se ha ejecutado la aplicación ni se han lanzado ataques; los hallazgos se basan en la lectura del código real y en `npm audit`.
- **Rama / commit auditado:** `feat/11-accesibilizar-formulario-platos` (HEAD `9d0a765`).
- **Contexto:** es un entorno docente/de pruebas (credenciales de seed = email). Aun así, cada hallazgo se valora como si el código fuese a producción y se indica cuando el contexto de pruebas atenúa el riesgo.

---

## 1. Resumen ejecutivo

La API tiene una base razonablemente sana en lo "mecánico": **todas las consultas SQL están parametrizadas** (sin inyección SQL), las contraseñas se almacenan con **bcrypt (coste 10)**, el rol de los registros públicos está **fijado a `cliente`** en el servidor (sin escalada por mass-assignment), el listado de pedidos propios (`/orders/mine`) usa el `id` del token y Angular escapa por defecto las interpolaciones (no hay `innerHTML` ni `bypassSecurityTrust*`).

Los problemas importantes están en la **autorización** y en la **configuración por defecto**:

1. **Control de acceso roto (A01).** La autorización se limita a comprobar el rol (`authorize([...])`); **nunca se comprueba que el recurso pertenezca al restaurante del usuario** (BOLA/IDOR horizontal entre restaurantes), y los endpoints de pedidos **ni siquiera comprueban el rol**: cualquier usuario autenticado, incluido un cliente recién registrado, puede ver los pedidos activos de cualquier restaurante y cambiar el estado de cualquier línea de pedido.
2. **Secreto JWT por defecto y público en el repositorio (A02).** Si no se define `JWT_SECRET` (y no existe ningún `.env`; `dotenv` está en las dependencias pero **nunca se importa**), el secreto es `super-secret-resttek-key`: cualquiera puede forjar un token de `admin`.
3. **Denegación de servicio por lógica de negocio (A04).** `POST /orders` genera un bucle por cada unidad de `quantity` sin tope: un único cliente autenticado (el registro es abierto) puede agotar CPU/memoria del proceso.
4. **Dependencias con vulnerabilidades conocidas (A06).** `npm audit`: 57 avisos (5 críticos, 27 altos); 18 de ellos en dependencias de producción, entre ellos `body-parser` 2.2.2 (DoS) y varios paquetes `@angular/*` 21.2.7.
5. **Ausencia de defensa en profundidad:** sin rate limiting, sin cabeceras de seguridad, CORS abierto, sin logging de seguridad, base de datos SQLite con hashes **versionada en git**.

### Recuento de hallazgos por severidad

| Severidad | Nº |
|---|---|
| Crítica | 0 |
| Alta | 4 |
| Media | 9 |
| Baja | 7 |
| Informativa | 1 |
| **Total** | **21** |

> No se asigna "Crítica" porque ninguno de los hallazgos permite por sí solo ejecución remota de código o volcado total sin autenticación **en la configuración documentada de pruebas**. H-03 (secreto JWT por defecto) pasaría a **Crítica** en cualquier despliegue real que no defina `JWT_SECRET`.

---

## 2. Tabla resumen de hallazgos (ordenada por severidad)

| ID | Severidad | OWASP 2021 | Título | Ubicación principal |
|---|---|---|---|---|
| H-01 | Alta | A01 Broken Access Control | BOLA/IDOR entre restaurantes: no se valida pertenencia del recurso al restaurante del usuario | `routes/dish.routes.ts:14-18`, `routes/ingredient.routes.ts:14-18`, `services/dish.service.ts:48-78`, `services/ingredient.service.ts:39-65` |
| H-02 | Alta | A01 Broken Access Control | Endpoints de pedidos sin autorización por rol ni por recurso | `routes/order.routes.ts:14-18`, `controllers/order.controller.ts:28-85` |
| H-03 | Alta | A02 Cryptographic Failures | Secreto JWT por defecto hardcodeado (duplicado en dos ficheros) y `dotenv` sin usar | `contexts/shared/infrastructure/http/middlewares.ts:4`, `contexts/employee/infrastructure/BcryptAuthService.ts:5` |
| H-04 | Alta | A04 Insecure Design | DoS: `quantity` sin límite en `POST /orders` | `services/order.service.ts:27-37` |
| H-05 | Media | A06 Vulnerable and Outdated Components | Dependencias con CVE conocidos (`npm audit`: 57; 18 en producción) | `package-lock.json`, `packages/*/package.json` |
| H-06 | Media | A01 Broken Access Control | Exposición de datos de restaurante (email, teléfono, propietario) vía API pública y a cualquier autenticado | `routes/restaurant.public.routes.ts:13-14`, `controllers/restaurant.controller.ts:25-61,80-93` |
| H-07 | Media | A03 Injection (validación de entrada) | Sin validación de tipos/rangos de entrada (precio, stock, cantidades, arrays, strings) | `services/dish.service.ts:100-121`, `services/ingredient.service.ts:84-102`, `models/dish.model.ts:33-41` |
| H-08 | Media | A04 Insecure Design | Pedido sin verificar que los platos existan, estén disponibles y pertenezcan al restaurante | `services/order.service.ts:21-51` |
| H-09 | Media | A05 Security Misconfiguration | Base de datos con hashes y datos versionada en git; cachés de build versionadas; `.gitignore` incompleto | `packages/api/resttek.db`, `.gitignore`, `packages/web-empleados/.angular/` |
| H-10 | Media | A07 Identification and Authentication Failures | Sin rate limiting ni bloqueo en `/auth/login` y `/auth/register` | `app.ts:16-20`, `contexts/employee/infrastructure/http/auth.routes.ts:6-7` |
| H-11 | Media | A07 Identification and Authentication Failures | Token JWT en `localStorage`, 8 h, sin revocación, claims (rol) sin refrescar, `verify` sin algoritmos fijados | `web-shared/src/lib/auth/auth.store.ts:5-22`, `BcryptAuthService.ts:17-19`, `middlewares.ts:25` |
| H-12 | Media | A07 Identification and Authentication Failures | Credenciales por defecto (contraseña = email), sin política de contraseñas en servidor, registro abierto | `scripts/seed.ts:21-56,205-216`, `RegisterClientUseCase.ts:32-48`, `CreateEmployeeUseCase.ts:22-28` |
| H-13 | Media | A09 Security Logging and Monitoring Failures | Sin logging de seguridad ni de errores 500; el `errorHandler` descarta el error | `contexts/shared/infrastructure/http/errorHandler.ts:15-33` |
| H-14 | Baja | A01 Broken Access Control | Guards del frontend solo comprueban "autenticado", no el rol | `web-shared/src/lib/auth/auth.guard.ts:5-11`, `web-admin/src/app/app.routes.ts:9-15`, `web-empleados/src/app/app.routes.ts:11-34` |
| H-15 | Baja | A03 Injection | `logoUrl` sin validar (cualquier esquema/URL) y renderizado en `<img [src]>` | `restaurant.controller.ts:17,72`, `web-clientes/.../restaurant-list.component.ts:31-32`, `order-detail.component.ts:30` |
| H-16 | Baja | A05 Security Misconfiguration | CORS abierto (`*`), sin cabeceras de seguridad (helmet), `X-Powered-By` activo, escucha en todas las interfaces | `app.ts:14-17`, `server.ts:11` |
| H-17 | Baja | A05 Security Misconfiguration | Fuga de mensajes de error internos al cliente (`error.message`) | `controllers/order.controller.ts:20-25,79-83` |
| H-18 | Baja | A07 Identification and Authentication Failures | Enumeración de usuarios (mensaje de email duplicado y timing en login); emails sin normalizar | `RegisterClientUseCase.ts:33-36`, `LoginUseCase.ts:29-38`, `Email.ts:14` |
| H-19 | Baja | A04 Insecure Design | Paginación sin límite máximo (`limit` negativo = sin límite en SQLite) | `EmployeeController.ts:38-40`, `SqliteEmployeeRepository.ts:26-40` |
| H-20 | Baja | A08 Software and Data Integrity Failures | Cadena de suministro: `npx -y` sin versión fijada en `.mcp.json`; sin CI/verificación de integridad; sin `npm audit` automático | `.mcp.json`, (no existe `.github/`) |
| H-21 | Informativa | A02 Cryptographic Failures | Sin TLS/HSTS ni cifrado en reposo de la BD (esperable en desarrollo); bcrypt coste 10 aceptable | `server.ts:11`, `config/database.ts:18` |

---

## 3. Detalle por categoría

### A01:2021 - Broken Access Control

#### H-01 (Alta) BOLA/IDOR entre restaurantes en platos, ingredientes y restaurante

**Ubicación:**
`packages/api/src/routes/dish.routes.ts:14-18`, `routes/ingredient.routes.ts:14-18`, `services/dish.service.ts:48-78`, `services/ingredient.service.ts:39-65`, `controllers/dish.controller.ts:26-70`, `controllers/ingredient.controller.ts:23-64`, `routes/restaurant.routes.ts:15-16`.

**Descripción:** las rutas anidadas `/restaurants/:restaurantId/dishes` y `/restaurants/:restaurantId/ingredients` solo aplican `authenticate` + `authorize([roles])`. El JWT contiene `restaurantId` (se firma en `LoginUseCase.ts:40-44`), pero **ningún middleware ni servicio lo compara con `req.params.restaurantId`**. Además, en `update`/`delete`/`getById` el servicio busca por `id` del recurso e **ignora por completo `:restaurantId` de la URL**.

```ts
// routes/dish.routes.ts
router.post('/',      authenticate, authorize(['admin', 'manager']), dishController.create)
router.get('/',       authenticate, authorize(['admin', 'manager', 'camarero', 'cocinero']), dishController.getAll)
router.put('/:id',    authenticate, authorize(['admin', 'manager']), dishController.update)
router.delete('/:id', authenticate, authorize(['admin', 'manager']), dishController.delete)

// services/dish.service.ts:72-78  (sin comprobar existing.restaurantId === restaurante del usuario)
async delete(id: string): Promise<void> {
    const dish = await this.dishRepository.findById(id)
    if (!dish) throw new DishNotFoundError()
    await this.dishRepository.delete(id)
}
```

**Impacto:** un `manager` (o `camarero`/`cocinero` para lectura) del restaurante `rest-1` puede, con su token válido: leer carta, ingredientes y stock de `rest-2`; crear platos en `rest-2`; **modificar o borrar platos de otro restaurante** (`PUT/DELETE /restaurants/rest-1/dishes/<id-de-rest-2>` funciona porque se ignora el `:restaurantId`). Es violación de aislamiento multi-tenant (BOLA, OWASP API1). Mismo patrón en `GET /restaurants/:id` (cualquier autenticado lee cualquier restaurante) y en `GET /restaurants` para no-admin (usa `user.restaurantId`, correcto).

**Recomendación:**
1. Crear un middleware `authorizeRestaurant` que, salvo para `admin`, exija `req.user.restaurantId === req.params.restaurantId` (403 si no), y aplicarlo a todas las rutas bajo `/restaurants/:restaurantId/*` y a `GET /restaurants/:id`.
2. En los servicios, cargar el recurso **filtrando por restaurante**: `findByIdAndRestaurant(id, restaurantId)` / `DELETE ... WHERE id = ? AND restaurant_id = ?`, y responder 404 si no coincide.
3. Añadir tests de integración (supertest) con dos restaurantes y comprobar 403/404 cruzado.

```ts
export const authorizeRestaurant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin') return next()
  if (!req.user?.restaurantId || req.user.restaurantId !== req.params.restaurantId) {
    res.status(403).json({ error: 'Forbidden: restaurant mismatch' }); return
  }
  next()
}
```

#### H-02 (Alta) Pedidos: sin autorización por rol ni por recurso

**Ubicación:** `routes/order.routes.ts:14-18`, `controllers/order.controller.ts:28-41, 57-68, 70-85`, `services/order.service.ts:53-84`.

**Descripción:** las cinco rutas de pedidos usan solo `authenticate`; no hay `authorize` ni comprobación de propiedad/restaurante.

```ts
router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))
```

**Impacto:**
- Un `cliente` (registro abierto y automático) puede llamar a `GET /orders/active?restaurantId=<cualquiera>` y ver todos los pedidos activos del restaurante, con `clientId` de otros clientes.
- `GET /orders/:id` devuelve cualquier pedido a cualquier autenticado (IDOR; los UUID no son adivinables, pero se filtran con el punto anterior).
- `PATCH /orders/:orderId/items/:itemId/status` permite a **cualquier usuario autenticado cambiar el estado de cualquier línea** (p. ej. marcar como `entregado` pedidos ajenos, sacándolos del tablero de cocina): integridad del flujo de negocio.
- `getActiveOrders` además acepta cualquier `restaurantId` sin comparar con el del empleado.

**Recomendación:**
- `GET /orders/active` y `PATCH .../status`: `authorize(['admin','manager','camarero','cocinero'])` + comprobar que el `restaurantId` del pedido == `req.user.restaurantId` (salvo admin). Idealmente restringir transiciones de estado por rol (cocinero: `preparando/listo`; camarero: `entregado`).
- `GET /orders/:id`: permitir solo si `order.clientId === req.user.id` (cliente) o `order.restaurantId === req.user.restaurantId` (empleado) o admin; devolver 404 en otro caso.
- `POST /orders` para clientes: forzar `clientId = req.user.id`; para empleados, validar `restaurantId` propio (ver H-08).

#### H-06 (Media) Exposición de datos de restaurante

**Ubicación:** `routes/restaurant.public.routes.ts:13-14`, `controllers/restaurant.controller.ts:25-32, 54-61, 80-93`.

**Descripción:** los endpoints **públicos sin autenticación** (`GET /api/v1/public/restaurants` y `/:id`) devuelven el mismo `toJSON` que los privados: `email`, `phone`, `ownerFirstName`, `ownerLastName`, `createdAt`, `updatedAt`. Además `GET /restaurants/:id` está accesible a cualquier rol autenticado.

```ts
getAllPublic = async (...) => {
    const restaurants = await this.restaurantService.getAll()
    res.status(200).json(restaurants.map(r => this.toJSON(r)))   // incluye email, phone, owner*
}
```

**Impacto:** datos personales del propietario (nombre y apellidos) y contacto interno accesibles a cualquiera en internet (scraping, phishing, RGPD: minimización de datos).

**Recomendación:** crear un DTO público con solo `id`, `name`, `address`, `logoUrl` (y teléfono/email de contacto solo si es dato de cara al público); no exponer `owner*`. Aplicar `authorizeRestaurant` (H-01) a `GET /restaurants/:id`.

#### H-14 (Baja) Guards del frontend solo comprueban autenticación

**Ubicación:** `packages/web-shared/src/lib/auth/auth.guard.ts:5-11`; `web-admin/src/app/app.routes.ts:9-15`; `web-empleados/src/app/app.routes.ts:11-34`; `web-empleados/src/app/core/layout/shell.component.ts:19-29`.

**Descripción:** `authGuard` solo devuelve `true` si hay token; no existe guard por rol. En `web-admin`, un `cliente` autenticado (o cualquier usuario) puede navegar a todas las pantallas de administración; en `web-empleados` el filtro por rol solo oculta enlaces del menú (`canSeeCocina`...), pero las rutas `/cocina`, `/barra`, `/salon` son accesibles por URL. Además `isAuthenticated` solo comprueba que exista un valor en `localStorage` (manipulable).

**Impacto:** limitado, porque la API es la que debe imponer permisos (y varios endpoints sí lo hacen); pero la UI muestra pantallas indebidas y, combinado con H-02, un cliente podría operar el tablero de cocina.

**Recomendación:** guard `roleGuard(['admin'])` con `data.roles` por ruta; recordar que es solo UX, la autorización real debe estar en la API (H-01, H-02).

---

### A02:2021 - Cryptographic Failures

#### H-03 (Alta) Secreto JWT por defecto hardcodeado; `dotenv` sin usar

**Ubicación:** `packages/api/src/contexts/shared/infrastructure/http/middlewares.ts:4` y `packages/api/src/contexts/employee/infrastructure/BcryptAuthService.ts:5`.

```ts
const JWT_SECRET: string = process.env.JWT_SECRET || 'super-secret-resttek-key'
```

**Descripción:** el secreto de firma tiene un valor de reserva conocido (está en el repositorio y en el historial git). `dotenv` figura en `packages/api/package.json` pero **no se importa en ningún fichero** (`grep dotenv` solo encuentra el `package.json`), por lo que un `.env` no se cargaría; y no existe `.env`/`.env.example` en el repositorio. La API arranca silenciosamente con el secreto por defecto. El valor está además duplicado en dos ficheros (riesgo de desincronización).

**Impacto:** cualquiera puede generar un JWT HS256 válido con `{ "id": "x", "role": "admin", "restaurantId": null }` y obtener acceso total (crear empleados, borrar platos, etc.). En un despliegue real que olvide `JWT_SECRET` esto sería **Crítico**.

**Recomendación:**
- Eliminar el valor por defecto: leer el secreto una sola vez en `config/` y **abortar el arranque** si falta (o si tiene < 32 bytes), salvo `NODE_ENV=test`.
- Importar `dotenv/config` en `server.ts` (o usar `node --env-file`), añadir `.env.example` y asegurar `.env` en `.gitignore`.
- Generar el secreto con `openssl rand -base64 48`; plan de rotación.

```ts
// config/env.ts
const secret = process.env.JWT_SECRET
if (!secret || secret.length < 32) {
  if (process.env.NODE_ENV !== 'test') throw new Error('JWT_SECRET no definido o demasiado corto')
}
export const JWT_SECRET = secret ?? 'test-only-secret-with-at-least-32-chars!!'
```

#### H-21 (Informativa) Transporte y reposo

- La API escucha en HTTP plano (`server.ts:11`); no hay HSTS ni redirección a HTTPS (esperable tras un proxy inverso en producción; documentarlo).
- SQLite sin cifrado en reposo (`config/database.ts:18`); aceptable en desarrollo.
- **Bien hecho:** hashing con `bcrypt` coste 10 (`BcryptAuthService.ts:6,10`) y comparación con `bcrypt.compare`; el hash nunca se devuelve en las respuestas (los controladores mapean campos explícitos). Se recomienda subir a coste 12 y/o evaluar argon2id a futuro.

---

### A03:2021 - Injection

**Inyección SQL: no se han encontrado problemas.** Se revisaron todos los accesos a datos (`repositories/*.ts`, `SqliteEmployeeRepository.ts`, `config/database.ts`): todas las consultas con datos de usuario usan placeholders `?` y arrays de parámetros (`db.run/get/all(sql, params)`), incluido el `WHERE role = ?` y `LIMIT ? OFFSET ?` de `findAll`. Las plantillas de string (template literals) solo contienen SQL estático (`order.repository.ts:60,90,117,144`). No hay `eval`, `child_process`, `exec`, ni construcción dinámica de comandos o rutas de fichero.

**XSS (Angular): sin hallazgos explotables.** `grep` de `innerHTML`, `bypassSecurityTrust*`, `DomSanitizer`, `document.write`, `eval` en `packages/web-*/src` no da resultados. Los datos de usuario (nombres de platos, notas de pedido, nombres de restaurante) se muestran con interpolación `{{ }}`, que Angular escapa. El único `[href]` dinámico (`dish-form.component.html:22`) usa un `targetId` interno generado por la propia app.

#### H-07 (Media) Falta de validación de tipos y rangos de entrada

**Ubicación:** `services/dish.service.ts:100-121`, `services/ingredient.service.ts:84-102`, `models/dish.model.ts:33-41`, `controllers/*.ts` (acceso directo a `req.body`), `AuthController.ts:13-33`.

**Descripción:** no hay librería de validación de esquemas (zod/joi/class-validator); los controladores pasan `req.body.*` sin comprobar el tipo y los servicios solo comparan con `<= 0`/`< 0`.

```ts
if (props.price <= 0) throw new InvalidPriceError()      // "abc" <= 0 es false -> pasa; NaN/strings se aceptan
if (props.currentStock < 0) throw new NegativeStockError() // idem con "abc"
props.ingredients.map(i => validateDishIngredient(i))      // si ingredients no es array -> TypeError -> 500
```

**Impacto:** datos corruptos en BD (SQLite acepta texto en columnas `REAL`), errores 500 por `TypeError`, valores absurdos (precio `1e308`), `name`/`description` de longitud ilimitada (el límite global de `express.json()` es 100 KB), `email`/`password` no-string que provocan excepciones de `bcrypt`/`sqlite3` (500). No es inyección, pero es la base de varios fallos de lógica.

**Recomendación:** introducir esquemas (zod) por endpoint en un middleware `validate(schema)`: `price: z.number().positive().max(100000)`, `currentStock: z.number().nonnegative()`, `name: z.string().trim().min(1).max(120)`, `ingredients: z.array(...).max(50)`, `quantity: z.number().int().min(1).max(50)`, etc. Rechazar con 400.

#### H-15 (Baja) `logoUrl` sin validar

**Ubicación:** `controllers/restaurant.controller.ts:17,72` (se guarda tal cual); frontend `web-clientes/src/app/features/restaurants/restaurant-list.component.ts:31-32` y `orders/order-detail.component.ts:30` (`<img [src]="restaurant.logoUrl">`).

**Descripción/Impacto:** un admin (o un atacante con token de admin) puede registrar cualquier URL. En `<img>` no se ejecuta `javascript:` y Angular sanea `src`, pero se puede forzar a todos los clientes a cargar un recurso externo (tracking pixel, filtración de IP, contenido mixto/HTTP, imagen ofensiva).

**Recomendación:** validar en servidor que sea `https://` y de un dominio permitido (o subir el logo a almacenamiento propio); longitud máxima.

---

### A04:2021 - Insecure Design

#### H-04 (Alta) DoS por `quantity` sin límite en pedidos

**Ubicación:** `packages/api/src/services/order.service.ts:27-37` (y `repositories/order.repository.ts:50-55`).

```ts
for (const item of request.items) {
    for (let i = 0; i < item.quantity; i++) {
        items.push({ id: randomUUID(), dishId: item.dishId, quantity: 1, notes: item.notes, status: 'pendiente' })
    }
}
// luego: un INSERT secuencial por cada item
```

**Descripción:** por cada unidad de `quantity` se crea un objeto en memoria y una fila SQL. No se valida que `quantity` sea entero ni que tenga máximo; tampoco el número de elementos de `items`.

**Impacto:** `POST /api/v1/orders` con `{"items":[{"dishId":"x","quantity":100000000,"notes":null}]}` bloquea el event loop y agota la memoria del único proceso Node (la API entera deja de responder). Requiere solo un token de `cliente`, que se obtiene gratis con el registro abierto. Una cantidad como `1e9` mata el proceso por OOM; los valores fraccionarios o negativos producen pedidos vacíos/incoherentes.

**Recomendación:** validar `Number.isInteger(quantity) && 1 <= quantity <= 20` (ajustable), `items.length` entre 1 y 50, `notes` string ≤ 200; envolver la creación en una transacción; aplicar rate limiting (H-10).

#### H-08 (Media) El pedido no verifica platos, disponibilidad ni restaurante

**Ubicación:** `services/order.service.ts:21-51`, `controllers/order.controller.ts:7-26`.

**Descripción:** solo se comprueba que `restaurantId` no esté vacío. No se verifica: que el restaurante exista (el fallo llega como error de FK de SQLite), que cada `dishId` exista, **pertenezca a ese restaurante** y esté `available`, ni que `items` sea un array (si no lo es, `for...of` lanza `TypeError`). `tableId` es texto libre.

**Impacto:** pedidos con platos de otro restaurante o no disponibles; líneas huérfanas (`LEFT JOIN` las muestra con `dishName` nulo); fallos 400/500 con mensajes internos (H-17). Un cliente puede inundar de pedidos falsos la cocina de cualquier restaurante (sin límite por usuario).

**Recomendación:** en `OrderService.create`, cargar los platos por `restaurantId`, rechazar los inexistentes/no disponibles, comprobar existencia del restaurante, limitar pedidos activos por cliente y validar el formato de `tableId`.

#### H-19 (Baja) Paginación sin límite máximo

**Ubicación:** `contexts/employee/infrastructure/http/EmployeeController.ts:38-40`, `SqliteEmployeeRepository.ts:26-40`.

`parseInt(req.query.limit) || 10` acepta `limit=1000000` y valores negativos (en SQLite `LIMIT -1` = sin límite). Solo accesible por `admin`, de ahí la severidad baja. **Recomendación:** `Math.min(Math.max(limit, 1), 100)` y `offset >= 0`; validar `role` contra la lista de roles.

---

### A05:2021 - Security Misconfiguration

#### H-09 (Media) Base de datos y cachés versionadas en git

**Ubicación:** `packages/api/resttek.db` (tracked), `.gitignore`, `packages/web-empleados/.angular/cache/**` (30 ficheros tracked), `packages/web-empleados/dist/` (sin ignorar).

**Descripción:** `.gitignore` contiene `packages/api/resttek.db`, pero el fichero **ya estaba versionado** (`git ls-files` lo lista; aparece como `M` en `git status`), de modo que la regla no tiene efecto y cada ejecución de la API/seed genera cambios que se pueden commitear. La BD contiene los hashes bcrypt de todas las cuentas semilla (cuya contraseña es el propio email) y cualquier dato real que se cree. Tampoco se ignoran `.angular/`, `dist/`, `node_modules/.vite` de los paquetes (aparecen en el estado de git).

**Impacto:** fuga de datos/hashes a quien tenga acceso al repo; riesgo de subir datos reales o cuentas creadas en pruebas; ruido en el repositorio.

**Recomendación:** `git rm --cached packages/api/resttek.db` y todo `.angular/`, ignorar `*.db`, `.angular/`, `dist/`, `.vite/`, `.env*` (salvo `.env.example`); la BD debe generarse con `npm run seed`. Si alguna vez se commiteó una BD con datos reales, rotar credenciales y purgar el historial.

#### H-16 (Baja) CORS abierto y sin cabeceras de seguridad

**Ubicación:** `packages/api/src/app.ts:14-17`, `server.ts:11`.

```ts
const app = express()
app.use(cors())          // Access-Control-Allow-Origin: *
app.use(express.json())
```

**Descripción:** `cors()` sin opciones permite cualquier origen. No se usa `helmet` (sin `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, etc.), `X-Powered-By: Express` está activo y `app.listen(PORT)` escucha en todas las interfaces. Los frontends se sirven con el dev-server de Angular, sin CSP.

**Impacto:** como la autenticación usa cabecera `Authorization` (no cookies) el CORS abierto no permite CSRF clásico, por eso Baja; pero cualquier web puede invocar la API con un token robado y se pierde defensa en profundidad.

**Recomendación:** `app.disable('x-powered-by')`, `app.use(helmet())`, `cors({ origin: process.env.CORS_ORIGINS.split(','), methods: [...], maxAge: 600 })`, `express.json({ limit: '50kb' })`; CSP estricta en el hosting de los frontends.

#### H-17 (Baja) Fuga de mensajes de error internos

**Ubicación:** `controllers/order.controller.ts:20-25` y `79-83` (el resto de controladores usa `errorHandler`, que sí devuelve 500 genérico).

```ts
} catch (error) {
    if (error instanceof Error) {
        res.status(400).json({ error: error.message })   // puede ser "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed", TypeError, etc.
```

**Impacto:** revela detalles de implementación (SQLite, nombres de columnas, cadenas de `TypeError`) y confunde los códigos de estado (errores internos como 400). `errorHandler.ts:25-28` también devuelve `err.name` (nombre de clase) y los mensajes de `InvalidRoleError` listan los roles válidos; informativo.

**Recomendación:** unificar el manejo con `next(error)` y `errorHandler`; devolver mensajes genéricos para errores no controlados y registrar el detalle en el log (H-13).

---

### A06:2021 - Vulnerable and Outdated Components

#### H-05 (Media) Dependencias con vulnerabilidades conocidas

**Evidencia:** `npm audit` (ejecutado en la raíz del monorepo): **57 avisos totales** (5 críticos, 27 altos, 21 moderados, 4 bajos). Solo dependencias de producción (`--omit=dev`): **18** (2 críticos, 11 altos, 3 moderados, 2 bajos).

Los más relevantes, con su alcanzabilidad real en este proyecto:

| Paquete (versión instalada) | Aviso | Alcance en Resttek |
|---|---|---|
| `body-parser` 2.2.2 (vía `express` 5.2.1) | DoS por bytes finales en cuerpo comprimido; límite no aplicado con valor inválido (GHSA-27r3-jxmh-p828, GHSA-v422-hmwv-36x6) | **Alcanzable**: `express.json()` en `app.ts:17`. Actualizar `express`/`body-parser`. |
| `@angular/core`/`compiler`/`common`/`router`/`forms` 21.2.7 | XSS por bypass de saneamiento en bindings de namespace/host/two-way y i18n; DoS en `formatDate`/`DecimalPipe`; avisos de SSR/hydration/`HttpTransferCache` | Parcialmente alcanzable: las apps son SPA sin SSR (los avisos SSR/hydration no aplican), pero usan `DatePipe`/`DecimalPipe` y plantillas Angular; actualizar a >= 21.2.20+ (el rango vulnerable llega a 21.2.19/24 según paquete). |
| `sqlite3` 5.1.7 -> `tar` 6.2.1 / `node-gyp` | Escritura arbitraria de ficheros en `tar` (crítico) | Solo en **instalación/compilación** del binario nativo (cadena de build); riesgo bajo en runtime. `npm audit fix --force` propone `sqlite3@6` (cambio mayor). |
| `proxy-addr` 2.0.7 (crítico) | Spoofing de IP con subredes "trust proxy" | **No explotable ahora**: la app no configura `trust proxy`. Relevante si se pone tras un proxy y se usa rate limiting por IP. |
| `vitest` <=4.1.10, `tinypool`, `piscina` (críticos) | Lectura/ejecución de ficheros con el UI server; prototype pollution | Solo **devDependencies** (tests); no desplegadas. No lanzar `vitest --ui` en máquinas expuestas. |
| `vite`, `postcss`, `esbuild`, `@angular/build/cli` (altos/bajos) | Path traversal/lectura de ficheros en dev-server | Solo desarrollo; no exponer el dev-server fuera de localhost. |

**Recomendación:** `npm audit fix` (sin `--force`) y actualizar `express`, `@angular/*` y `@angular/build` a su última 21.x; evaluar `sqlite3@6`; fijar `engines`; añadir `npm audit --omit=dev --audit-level=high` a CI y Dependabot/Renovate; mantener `package-lock.json` versionado (ya lo está).

---

### A07:2021 - Identification and Authentication Failures

#### H-10 (Media) Sin rate limiting ni bloqueo de cuentas

**Ubicación:** `app.ts:16-20`; `contexts/employee/infrastructure/http/auth.routes.ts:6-7`.

**Descripción:** no hay ninguna limitación de peticiones (ni `express-rate-limit`, ni bloqueo tras N fallos, ni retardo progresivo, ni CAPTCHA). `POST /auth/login` admite fuerza bruta/credential stuffing ilimitado y `POST /auth/register` permite crear cuentas masivamente (que luego sirven para H-04 y H-02). bcrypt (coste 10, ~60-100 ms) es además un vector de consumo de CPU si se inunda el login.

**Recomendación:** `express-rate-limit` global (p. ej. 100 req/min/IP) y específico en `/auth/login` (5-10 intentos/15 min por IP+email) y `/auth/register`; bloqueo temporal por cuenta; configurar `trust proxy` correctamente si hay proxy inverso (ver `proxy-addr` en H-05).

#### H-11 (Media) Gestión de sesión/JWT

**Ubicación:** `web-shared/src/lib/auth/auth.store.ts:5-22`; `BcryptAuthService.ts:17-19`; `middlewares.ts:24-30`.

```ts
localStorage.setItem('auth_token', token)
localStorage.setItem('auth_user', JSON.stringify(user))      // y JSON.parse sin try/catch al arrancar (auth.store.ts:9)
...
jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })           // sin algorithm, sin iss/aud
jwt.verify(token, JWT_SECRET)                                 // sin { algorithms: ['HS256'] }
```

**Descripción e impacto:**
- El token se guarda en `localStorage`: cualquier XSS futuro (ver avisos de Angular en H-05) lo exfiltra y es accesible a extensiones. Hoy no se ha encontrado XSS, por eso Media y no Alta.
- Vida de 8 h sin refresh ni revocación; el rol y `restaurantId` van en el token y **no se re-validan contra la BD**: un empleado despedido/cambiado de rol conserva sus permisos hasta 8 h. No hay `logout` en servidor.
- `jwt.verify` no fija `algorithms` (con jsonwebtoken 9 y secreto de cadena solo acepta HS*, por lo que `alg: none` queda rechazado; es una mejora de defensa en profundidad). No se usan `iss`/`aud`/`sub`; el payload usa `id` en vez de `sub`.
- `AuthRequest.user` tipado como `any`; los controladores castean `(req as any).user`.
- Inconsistencia de errores: `authenticate` responde `401` pero sin cuerpo estandarizado.

**Recomendación:** access token corto (15 min) + refresh token rotatorio en cookie `HttpOnly; Secure; SameSite=Strict` (o al menos mantener el token solo en memoria); `jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience })`; consultar el estado del empleado (activo/rol) en `authenticate` o mantener una lista de revocación (`jti`); envolver el `JSON.parse` del store en `try/catch`.

#### H-12 (Media; Baja en entorno de pruebas) Credenciales por defecto y sin política de contraseñas

**Ubicación:** `scripts/seed.ts:21-27, 45-56, 205-216`; `RegisterClientUseCase.ts:32-48`; `CreateEmployeeUseCase.ts:22-28`; `web-shared/.../register.component.ts:34`; README/CLAUDE.md.

**Descripción:** todas las cuentas semilla (incluido `admin@resttek.com`, rol `admin`) tienen como contraseña **su propio email**, y el seed lo imprime por consola y está documentado. El servidor **no valida la contraseña** al registrar ni al crear empleados (`password` puede ser `""`... bcrypt acepta cadena vacía; el único control, `length >= 6`, está solo en el frontend, `register.component.ts:34`). El registro es abierto y sin verificación de email.

**Impacto:** en cualquier entorno donde se ejecute `npm run seed`, el admin es trivialmente accesible; contraseñas débiles aceptadas por la API (se puede saltar el frontend).

**Recomendación:** el seed debe leer las contraseñas de variables de entorno o generar aleatorias (y desactivarse con `NODE_ENV=production`); política servidor (>= 10-12 caracteres, bloqueo de contraseñas comunes o iguales al email); verificación de email para cuentas de cliente; forzar cambio de contraseña inicial del admin.

#### H-18 (Baja) Enumeración de usuarios y emails sin normalizar

**Ubicación:** `RegisterClientUseCase.ts:33-36`, `LoginUseCase.ts:29-38`, `Email.ts:14`.

- `POST /auth/register` responde `400 DuplicatedEmailError "Email is already in use"`: permite comprobar si un email está registrado.
- En el login, si el email no existe se responde de inmediato sin ejecutar `bcrypt.compare`; el tiempo de respuesta distingue usuario existente de inexistente (el mensaje sí es genérico: `InvalidCredentialsError`).
- Los emails no se normalizan (`trim`/`lowercase`): `Admin@resttek.com` y `admin@resttek.com` son cuentas distintas; permite suplantación visual. La regex del email es permisiva (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).

**Recomendación:** normalizar emails (lowercase + trim) en el VO `Email` y en la consulta; ejecutar un `bcrypt.compare` contra un hash ficticio cuando el usuario no existe; en registro, respuesta genérica + verificación por email.

---

### A08:2021 - Software and Data Integrity Failures

#### H-20 (Baja) Cadena de suministro y verificación de integridad

**Ubicación:** `.mcp.json`, ausencia de `.github/` (sin CI), `package.json` de los workspaces.

- `.mcp.json` ejecuta `npx -y @modelcontextprotocol/server-slack` **sin versión fijada** y con `SLACK_BOT_TOKEN` en el entorno: se ejecuta en cada arranque la última versión publicada de un paquete externo con acceso al token (riesgo de typosquatting/compromiso del paquete). Los tokens se pasan correctamente por variable de entorno (no hay secretos en el fichero).
- No hay pipeline de CI que ejecute tests, `npm audit` ni verificación de lockfile; las dependencias usan rangos `^`. El `package-lock.json` sí está versionado (positivo).
- No se encontró deserialización insegura ni carga dinámica de código; el frontend carga `auth_user` de `localStorage` con `JSON.parse` (datos solo para UI, la autorización real está en el JWT).

**Recomendación:** fijar versión (`@modelcontextprotocol/server-slack@x.y.z`), `npm ci` en CI, `npm audit`, firmas/provenance (`npm audit signatures`), revisión de dependencias en PR.

---

### A09:2021 - Security Logging and Monitoring Failures

#### H-13 (Media) Sin logging de seguridad

**Ubicación:** `contexts/shared/infrastructure/http/errorHandler.ts:15-33`; `server.ts`; controladores de pedidos (`order.controller.ts:38-40,52-54,64-66,81-83`).

```ts
export const errorHandler = (err: any, _req, res, _next) => {
    if (err instanceof AppError) { ... res.status(statusCode).json({ error: err.name, message: err.message }); return }
    res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' })   // el error original se descarta, sin log
}
```

**Descripción:** no existe logger (solo `console.log` de arranque y del seed). No se registran logins fallidos/exitosos, registros, accesos denegados (401/403), creación de empleados, cambios de estado de pedidos ni errores 500 (el `errorHandler` y los `catch` de `order.controller.ts` los descartan). Tampoco hay ID de correlación ni métricas/alertas.

**Impacto:** un ataque de fuerza bruta, un abuso de IDOR (H-01/H-02) o un fallo interno pasan completamente desapercibidos y no hay forma de investigar un incidente.

**Recomendación:** logger estructurado (pino) con `requestId`; registrar eventos de auditoría (login ok/fail con email e IP, 401/403, altas/bajas de empleados, cambios de estado de pedido con el actor); loggear `err` completo en el 500 (sin datos sensibles: nunca contraseñas ni tokens); alertas sobre picos de 401/403/429.

---

### A10:2021 - Server-Side Request Forgery (SSRF)

**No se han encontrado problemas.** El backend no realiza peticiones HTTP salientes (no hay `fetch`, `axios`, `http.request`, ni librerías de cliente HTTP en `packages/api/src`) ni acepta URLs para descargarlas, procesarlas o renderizarlas en servidor. El único campo con URL (`logoUrl`) solo se **almacena** y lo carga el navegador del cliente (ver H-15 para validar el esquema/dominio, de cara a un futuro uso en servidor, p. ej. generación de miniaturas). Tampoco se leen ficheros a partir de entrada de usuario (sin path traversal en la API).

---

## 4. Resumen por categoría

| Categoría | Estado | Hallazgos |
|---|---|---|
| A01 Broken Access Control | Problemas | H-01 (Alta), H-02 (Alta), H-06 (Media), H-14 (Baja) |
| A02 Cryptographic Failures | Problemas | H-03 (Alta), H-21 (Info) |
| A03 Injection | SQLi y XSS sin problemas; validación débil | H-07 (Media), H-15 (Baja) |
| A04 Insecure Design | Problemas | H-04 (Alta), H-08 (Media), H-19 (Baja) |
| A05 Security Misconfiguration | Problemas | H-09 (Media), H-16 (Baja), H-17 (Baja) |
| A06 Vulnerable Components | Problemas | H-05 (Media) |
| A07 Identification & Auth Failures | Problemas | H-10, H-11, H-12 (Media), H-18 (Baja) |
| A08 Software & Data Integrity | Problemas menores | H-20 (Baja) |
| A09 Logging & Monitoring | Problemas | H-13 (Media) |
| A10 SSRF | Sin problemas | - |

### Qué se comprobó y salió bien (para no repetir trabajo)

- **SQL:** 100 % de las consultas parametrizadas; sin concatenación de entrada de usuario.
- **Contraseñas:** bcrypt coste 10; el hash no sale en ninguna respuesta (mapeo explícito de campos en `EmployeeController` y `LoginUseCase`).
- **Escalada por registro:** `RegisterClientUseCase` fija `role: 'cliente'` y `restaurantId: null`; el `role` del body se ignora. `POST /employees` (crear empleados con cualquier rol) exige `admin`.
- **Rutas administrativas:** `/employees`, `/employees/:id` y `/restaurants/:id/employees` solo para `admin`; `POST/PUT /restaurants` solo `admin`; mutaciones de ingredientes solo `admin`.
- **`/orders/mine`:** usa el `id` del token, no un parámetro (sin IDOR). El precio del plato se lee de BD y no del cliente (el cliente no puede manipular precios; los pedidos no almacenan precio).
- **JWT:** algoritmo HS256 por defecto, expiración definida (8 h), `alg: none` rechazado por la librería; token con prefijo `Bearer` comprobado.
- **Frontend:** sin `innerHTML`, `bypassSecurityTrust*`, `eval` ni `window.open`; interpolaciones escapadas por Angular; no se pone el token en la URL; los frontends solo hablan con `/api/v1` mediante proxy.
- **Secretos en el repo:** sin claves/tokens reales en el código ni en `.mcp.json` (variables de entorno); `git log -S` no muestra secretos adicionales (solo el secreto por defecto de H-03 y las contraseñas de seed documentadas).
- **SSRF / path traversal / ejecución de comandos:** inexistentes en la API.

---

## 5. Plan de remediación priorizado

### Fase 1 - Inmediato (antes de cualquier despliegue fuera de local)

1. **H-03**: eliminar el secreto JWT por defecto, abortar si falta, cargar `.env` (usar `dotenv/config`), añadir `.env.example`. *Esfuerzo: 30 min.*
2. **H-01 + H-02**: middleware `authorizeRestaurant`, `authorize([...])` en todas las rutas de pedidos, filtrar por `restaurant_id` en servicios/repositorios y comprobar propiedad en `GET /orders/:id`. Añadir tests de integración multi-tenant. *Esfuerzo: 0,5-1 día.*
3. **H-04 + H-07 + H-08**: validación de esquemas (zod) en todos los endpoints, límites de `quantity`/`items`, verificación de platos/restaurante al crear pedido. *Esfuerzo: 1 día.*
4. **H-12 (parte seed)**: no ejecutar `seed` con contraseñas predecibles fuera de desarrollo; política mínima de contraseñas en servidor.

### Fase 2 - Corto plazo (1-2 semanas)

5. **H-10**: `express-rate-limit` en login/registro y global; **H-16**: `helmet`, CORS por lista blanca, `x-powered-by` off, límite de body.
6. **H-05**: `npm audit fix`, actualizar `express`/`body-parser`, `@angular/*`, `@angular/build`; añadir `npm audit` a CI.
7. **H-09**: `git rm --cached` de `resttek.db` y `.angular/`; completar `.gitignore`.
8. **H-13**: logging estructurado + auditoría de eventos de seguridad; **H-17**: unificar manejo de errores.
9. **H-06**: DTO público de restaurante sin datos del propietario.

### Fase 3 - Medio plazo

10. **H-11**: access token corto + refresh en cookie HttpOnly, revocación/validación de estado del empleado, `algorithms`/`iss`/`aud` en `verify`.
11. **H-14**: guards por rol en frontends (solo UX); **H-18**: normalización de emails y respuestas uniformes; **H-19**: tope de paginación; **H-15**: validación de `logoUrl`.
12. **H-20**: fijar versiones de herramientas externas (`.mcp.json`), CI con tests y `npm audit`, Dependabot/Renovate.
13. **H-21**: TLS/HSTS en el proxy de producción, cifrado en reposo o migrar a un SGBD gestionado; evaluar argon2id/bcrypt 12.

### Verificación sugerida tras corregir

- Tests de integración (supertest): usuario de `rest-1` recibe 403/404 sobre recursos de `rest-2`; `cliente` recibe 403 en `/orders/active` y en `PATCH .../status`; `POST /orders` con `quantity` enorme devuelve 400 rápido.
- Arranque de la API sin `JWT_SECRET` debe fallar.
- `npm audit --omit=dev --audit-level=high` sin hallazgos.
- Escaneo dinámico (OWASP ZAP baseline) contra un entorno de pruebas una vez aplicadas las correcciones.

---

*Informe generado mediante revisión estática de solo lectura; no se modificó ningún fichero del proyecto salvo la creación de este documento.*
