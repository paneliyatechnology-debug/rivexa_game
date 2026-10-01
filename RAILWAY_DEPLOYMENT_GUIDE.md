# Railway Backend Deployment Guide (Rivexa Gaming Platform)

This guide walks you through configuring the **`api`** service on **Railway.app** to host the NestJS REST API and Socket.IO real-time game engines.

---

## 1. Delete Unnecessary Services on Railway (Save Credits)

In your Railway canvas screenshot, 5 services were auto-detected:
- `api`
- `web`
- `admin`
- `developer`
- `realtime`

Since **`web`** is hosted on **Vercel**, you only need the **`api`** service on Railway!
- Click on `web`, `admin`, `developer`, `realtime` -> Go to **Settings** -> **Delete Service** (or keep only `api`).

---

## 2. Add PostgreSQL Database on Railway

1. On your Railway project canvas, click the **+ Add** button (top right).
2. Select **Database** -> **Add PostgreSQL**.
3. Railway will provision a managed PostgreSQL database inside your project canvas.

---

## 3. Configure the `api` Service Settings

Click on the **`api`** card on your Railway canvas:

### **Settings Tab**:
- **Root Directory**: `apps/api`
- **Build Command**:
  ```bash
  cd ../.. && pnpm install && pnpm run build --filter=api
  ```
- **Start Command**:
  ```bash
  node dist/main.js
  ```

### **Variables Tab**:
Click **+ New Variable** and add:

| Variable | Value / Reference |
| :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(Click "Add Reference" -> select your Railway Postgres database)* |
| `PORT` | `${{PORT}}` *(Railway automatically injects dynamic port)* |
| `JWT_SECRET` | `your_secure_random_jwt_secret_key` |

---

## 4. Generate Public Domain URL for Backend API

1. In the **`api`** service card, go to **Settings** -> **Networking** (or **Public Networking**).
2. Click **Generate Domain**.
3. Railway will generate a live HTTPS URL, e.g.:
   `https://api-production-xxxx.up.railway.app`

---

## 5. Push Database Schema to Railway Database

From your local machine terminal, run:

```bash
# Push Prisma schema to Railway PostgreSQL
DATABASE_URL="your_railway_postgres_connection_string" npx prisma db push --schema=packages/database/prisma/schema.prisma
```

---

## 6. Connect Vercel Frontend to Railway API

1. Open your **Vercel Project Dashboard** (`rivexa`).
2. Go to **Settings** -> **Environment Variables**.
3. Set:
   - `NEXT_PUBLIC_API_URL` = `https://api-production-xxxx.up.railway.app/api/v1`
   - `NEXT_PUBLIC_WS_URL` = `https://api-production-xxxx.up.railway.app`
4. Click **Redeploy** on Vercel.

---

## 7. Verification

- Backend API Status: `https://api-production-xxxx.up.railway.app/api/v1/admin/users` $\rightarrow$ `200 OK`
- WebSockets: Real-time games (Crash, Aviator, JetX, Pushparani) tick stream connected!
