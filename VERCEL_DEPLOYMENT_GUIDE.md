   # Complete Guide: Deploying Rivexa Gaming Platform to Vercel & Production

   This guide explains how to properly deploy the **Rivexa Gaming Platform** to **Vercel** (Frontend) and a **Node.js Host** (Backend API & Socket.IO Game Engines).

   ---

   ## ⚠️ Important Architectural Notice

   1. **Vercel is Serverless**:
      - Vercel is ideal for hosting **Next.js Frontend (`apps/web`)**.
      - Vercel **cannot** run persistent background Socket.IO WebSocket loops (Crash curve, JetX rocket engine, Pushparani ticks) because serverless functions freeze between HTTP requests.
   2. **Recommended Architecture**:
      - **Frontend (`apps/web`)**: Hosted on **Vercel** (Free & Fast Global CDN).
      - **Backend API & WebSockets (`apps/api`)**: Hosted on **Render.com** / **Railway.app** / **VPS (Ubuntu)**.
      - **Database**: Hosted on **Neon.tech** / **Supabase** / **Render PostgreSQL** (Free Managed PostgreSQL).

   ---

   ## Part 1: Setting up Free Managed PostgreSQL Database (Neon / Supabase)

   Before deploying Vercel, you need a cloud PostgreSQL database:

   1. Create a free account at **[Neon.tech](https://neon.tech)** or **[Supabase.com](https://supabase.com)**.
   2. Create a new project/database named `gaming_platform`.
   3. Copy your PostgreSQL Connection String (starts with `postgresql://...`).

   ---

   ## Part 2: Deploying Frontend (`apps/web`) on Vercel (Screenshot Settings)

   On the Vercel screen shown in your browser:

   ### 1. Project Selection & Root Directory
   - **Project Name**: `rivexa` (or `rivexa-web`)
   - **Framework Preset**: **Next.js**
   - **Root Directory**: Click **Edit** and set it to:
   ```text
   apps/web
   ```
   *(Important: Change from `apps/admin` to `apps/web` so all user pages, games, and `/admin` panel deploy correctly!)*

   ### 2. Build & Output Settings
   - **Build Command**: Leave as default (`next build` or `pnpm build`)
   - **Output Directory**: Leave as default (`.next`)
   - **Install Command**: Leave as default (`pnpm install` or `npm install`)

   ### 3. Environment Variables (in Vercel Dashboard)
   Add the following Environment Variables in Vercel under **Settings -> Environment Variables**:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://your-api-domain.com/api/v1` | URL of your deployed NestJS Backend API |
   | `NEXT_PUBLIC_WS_URL` | `https://your-api-domain.com` | URL of your deployed Socket.IO WebSocket server |

   Click **Deploy**!

   ---

   ## Part 3: Deploying Backend API & Real-Time Socket.IO (`apps/api`)

   ### **Option A: Free Managed Deployment on Render.com**

   1. Sign up on **[Render.com](https://render.com)**.
   2. Click **New +** -> **Web Service**.
   3. Connect your GitHub repository: `jaydipkhunt06-prog/Rivexa`.
   4. Configure the Web Service settings:
      - **Name**: `rivexa-api`
      - **Root Directory**: `apps/api`
      - **Environment**: `Node`
      - **Build Command**:
      ```bash
      cd ../.. && pnpm install && pnpm run build
      ```
      - **Start Command**:
      ```bash
      node dist/main.js
      ```
   5. Add Environment Variables on Render:
      - `DATABASE_URL` = `postgresql://user:password@ep-xyz.neon.tech/gaming_platform?sslmode=require`
      - `PORT` = `4000`
      - `JWT_SECRET` = `your_random_jwt_secret_key`
   6. Click **Create Web Service**.
   7. Copy the generated API URL (e.g. `https://rivexa-api.onrender.com`).

   ---

   ### **Option B: Deployment on Ubuntu VPS (DigitalOcean / AWS / Linode)**

   1. SSH into your VPS:
      ```bash
      ssh root@YOUR_SERVER_IP
      ```
   2. Run PM2 process for backend API:
      ```bash
      cd /var/www/gaming-platform/apps/api
      pnpm run build
      pm2 start dist/main.js --name "rivexa-api"
      pm2 save
      ```

   ---

   ## Part 4: Connect Vercel Frontend to Backend

   1. Go back to your **Vercel Dashboard** for `rivexa`.
   2. Go to **Settings** -> **Environment Variables**.
   3. Update:
      - `NEXT_PUBLIC_API_URL` = `https://rivexa-api.onrender.com/api/v1` (or your VPS domain)
      - `NEXT_PUBLIC_WS_URL` = `https://rivexa-api.onrender.com` (or your VPS domain)
   4. Redeploy Vercel project (**Deployments** -> **Redeploy**).

   ---

   ## Part 5: Final Live Verification Checklist

   - [x] **Database**: Cloud PostgreSQL (Neon/Supabase) updated with `npx prisma db push`.
   - [x] **Frontend**: Vercel deployed at `https://rivexa.vercel.app` (Root Directory set to `apps/web`).
   - [x] **Backend API**: Responding at `https://rivexa-api.onrender.com/api/v1/admin/users`.
   - [x] **Socket.IO Real-Time Games**: Live WebSocket ticks connecting to games (Crash, Aviator, JetX, Pushparani).
