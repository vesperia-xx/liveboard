# Desplegar Liveboard en Vercel

Tiempo estimado: 15 minutos. Necesitas: cuenta en GitHub, [Neon](https://neon.tech) (Postgres gratis) y [Pusher](https://dashboard.pusher.com) (realtime gratis).

## 1. Base de datos — Neon

1. Crea un proyecto en Neon (por ejemplo `liveboard`) y una base de datos `neondb`.
2. Copia la **connection string** (usa la **pooled** si está disponible):

```
postgresql://user:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

3. Aplica el esquema (las migraciones ya están en el repo):

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npx prisma migrate deploy
```

Resultado esperado: `All migrations have been successfully applied.` (9 tablas).

## 2. Realtime — Pusher

1. En [dashboard.pusher.com](https://dashboard.pusher.com) → **Create app** → nombre `liveboard`, cluster `eu` (u el más cercano).
2. En **App Keys**, copia: `app_id`, `key`, `secret`, `cluster`.

## 3. Sube el repo a GitHub

```bash
git init && git add . && git commit -m "Liveboard — realtime team workspace"
git remote add origin git@github.com:<tu-usuario>/<repo>.git
git push -u origin main
```

> `.env` está en `.gitignore`; nunca se sube. Las credenciales van en Vercel, no en el repo.

## 4. Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
2. Framework: **Next.js** (detectado automáticamente). Build command: `npm run build` (ya incluye `prisma generate` vía `postinstall`). Output: `.next`.
3. **Environment Variables** (Production + Preview):

| Name                          | Value                                        |
| ----------------------------- | -------------------------------------------- |
| `DATABASE_URL`                | la URL de Neon del paso 1                    |
| `JWT_SECRET`                  | cadena aleatoria larga (`openssl rand -hex 32`) |
| `PUSHER_APP_ID`               | `app_id` de Pusher                           |
| `PUSHER_KEY`                  | `key` de Pusher                              |
| `PUSHER_SECRET`               | `secret` de Pusher                           |
| `PUSHER_CLUSTER`              | `eu` (u otro)                                |
| `NEXT_PUBLIC_PUSHER_KEY`      | `key` de Pusher (misma)                      |
| `NEXT_PUBLIC_PUSHER_CLUSTER`  | `eu` (u otro)                                |
| `NEXT_PUBLIC_APP_URL`         | URL pública, p. ej. `https://liveboard-chi.vercel.app` (para `og:image` absoluta; en Vercel se usa el dominio de producción automáticamente) |

4. Click en **Deploy**.

## 5. Verificar en producción

```bash
node scripts/smoke.mjs https://<tu-app>.vercel.app
```

Debe pasar **37/37 checks** (crea usuarios de prueba, workspace, tareas, verifica autorización y realtime) y luego:

1. Abre la URL pública → landing → **Create your workspace**.
2. Crea proyecto + tarea.
3. Abre el proyecto en **dos ventanas / dos navegadores** con cuentas distintas → mueve una tarjeta: se sincroniza en tiempo real sin refrescar y aparece en el feed de actividad.

## Notas y troubleshooting

- **El `NEXT_PUBLIC_PUSHER_KEY` se incrusta en el bundle en build**, no en runtime. Si lo cambias en Vercel, pulsa **Redeploy**.
- **Socket.io / `server.js`**: solo aplica al desarrollo local. En Vercel se despliega el build estándar de Next.js y realtime va por Pusher (el modo local usa Socket.io automáticamente cuando no hay `PUSHER_*`).
- **Prisma en serverless**: funciona out-of-the-box con el cliente generado en el build (`postinstall: prisma generate`).
- **Errores de conexión a Neon**: comprueba que `?sslmode=require` está en la URL y usa la connection string **pooled** bajo carga.
- **Migraciones futuras**: `npx prisma migrate dev` local → commit del SQL generado → `prisma migrate deploy` contra Neon (o un CI/CD).
- **Imagen OpenGraph**: `/opengraph-image` se genera en el build con `next/og` (1200×630). Valida la vista previa con [opengraph.xyz](https://www.opengraph.xyz/url/https%3A%2F%2Fliveboard-chi.vercel.app) o pegando la URL en Slack/X; si cambias `NEXT_PUBLIC_APP_URL`, haz **Redeploy**.
- **CI**: cada push/PR a `main` ejecuta `.github/workflows/ci.yml` (typecheck → migraciones → build → smoke contra un Postgres efímero del propio runner).
- **Dominio propio**: Vercel → Project → Settings → Domains.
