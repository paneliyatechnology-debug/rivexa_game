# Rivexa Gaming Platform - Full Architecture & Deployment Documentation

This document provides a comprehensive technical overview, tech stack breakdown, WebSocket & Socket.IO specification, and step-by-step production deployment instructions for the **Rivexa Gaming Platform**.

---

## 1. System Architecture Overview

The project is structured as a high-performance **Monorepo** managed with **Turborepo** and **pnpm / npm workspaces**. It separates frontend client code, backend API services, real-time WebSocket game engines, database schemas, and shared utilities into modular packages.

```
gaming-platform/
├── apps/
│   ├── api/                  # NestJS Backend API & WebSocket Game Engines (Port 4000)
│   ├── web/                  # Next.js Frontend Web Application & Admin Panel (Port 3002)
│   └── admin/                # Optional dedicated admin application
├── packages/
│   ├── database/             # Shared Prisma ORM client & PostgreSQL Schema
│   ├── auth/                 # Password hashing (Bcrypt) & auth tokens
│   ├── types/                # Shared TypeScript types and DTOs
│   └── game-sdk/             # Game engine SDK, RTP calculators & utilities
├── package.json              # Root workspace definition
└── turbo.json                # Turborepo build pipeline config
```

---

## 2. Technology Stack Summary

### **Frontend (`apps/web`)**
| Technology | Version / Tool | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Server-side rendering, client routing, modern React features |
| **UI Library** | **React 19** | Component-based UI layer |
| **Styling** | **Tailwind CSS v4 & Vanilla CSS** | Modern dark-mode glassmorphic theme, responsive layouts |
| **Icons** | **Lucide React** | Scalable UI icons |
| **Real-Time Client** | **`socket.io-client` (v4.8.1)** | Real-time WebSocket connection to backend game engines |
| **Game Rendering** | **HTML5 Canvas & Phaser 3** | High FPS smooth animations for Crash, JetX, Aviator, Spin |

### **Backend (`apps/api`)**
| Technology | Version / Tool | Purpose |
| :--- | :--- | :--- |
| **Framework** | **NestJS 12** | Enterprise Node.js TypeScript backend framework |
| **HTTP Server** | **Express** | REST API controller routing (`/api/v1/...`) |
| **Real-Time Server** | **Socket.IO (`@nestjs/platform-socket.io`)** | WebSocket Server Gateway for real-time games |
| **ORM** | **Prisma ORM (v6.3.0)** | Type-safe database queries, migrations, and schema modeling |
| **Security** | **Bcrypt** | Secure salt-hashed password storage |
| **Email Service** | **Nodemailer** | SMTP email notifications & OTP verification |

### **Database & Infrastructure**
| Technology | Purpose |
| :--- | :--- |
| **PostgreSQL (v14+)** | Relational primary database storing users, wallets, bets, transactions, merchant bank accounts, and financial reports |
| **Node.js (v20+)** | Server execution environment |
| **PM2 / Systemd** | Production process daemon manager |
| **Nginx** | Production reverse proxy, SSL termination & WebSocket forwarding |

---

## 3. Real-Time WebSockets & Socket.IO Specification

### **Is Socket.IO / WebSocket used in this project?**
**YES. Socket.IO is actively used for all real-time multiplayer game engines.**

### **How Socket.IO is Used:**
1. **Backend WebSocket Gateway (`GameGateway`)**:
   - Implemented in [`apps/api/src/games/game-engine/game.gateway.ts`](file:///home/dell/Jaydeep/Game/gaming-platform/apps/api/src/games/game-engine/game.gateway.ts).
   - Listens on namespace `/` on the main API port (`4000`).
   - Runs automated high-frequency tick loops (100ms interval) for real-time games.
2. **Supported Real-Time Games**:
   - **Crash / Aviator**: Live rising curve multiplier broadcast, synchronized countdowns, live bet placing, auto cashouts, crash events.
   - **JetX Flight**: Live rocket trajectory multiplier stream and active player cashout sync.
   - **Pushparani**: Real-time multiplayer crash game tick stream.
   - **Fast Parity & Parity**: Period timers and result countdown broadcasts.
3. **Socket.IO Channels & Events**:
   - `subscribe:crash` / `crash:state` / `crash:tick` / `crash:result`
   - `subscribe:jet` / `jet:state` / `jet:tick` / `jet:result`
   - `subscribe:pushparani` / `pushparani:state` / `pushparani:tick` / `pushparani:result`
4. **Client Connection Resolver**:
   - Dynamic API & WebSocket resolver in [`apps/web/src/lib/config.ts`](file:///home/dell/Jaydeep/Game/gaming-platform/apps/web/src/lib/config.ts) dynamically constructs `http://<domain-or-ip>:4000` so mobile phones, local IPs, and domain names connect seamlessly.

---

## 4. Key Functional Features Overview

### **User Platform**
- **8 Core Games**: Fast Parity (30s), Parity (1m), Crash/Aviator, JetX, Mines, Pushparani, Andar Bahar, Spin Wheel, Over/Under Dice.
- **Wallet System**: Main balance, bonus balance, commission balance, deposit history, withdrawal requests.
- **Referral & MLM System**: Tiered referral link commission engine.

### **Admin Control Panel (`/admin`)**
- **User Management**: Full CRUD (Create, Edit, Delete with cascading relation cleanup, Block/Activate user, Direct Credit/Debit Wallet Balance, Live P&L analytics).
- **Payment Operations**: Merchant UPI/Bank account manager, UTR manual deposit verifications, withdrawal processing.
- **RTP & Game Overrides**: Real-Time Profit-Target setting, result override engines (force win/loss for house edge control).
- **Financial Reports**: Date-filtered Net Profit, Total Turnover, Total Payouts, and Leaderboards.

---

## 5. Environment Variables Configuration

### **Backend (`apps/api/.env`)**
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gaming_platform?schema=public"
JWT_SECRET="your_secure_random_jwt_secret_key_here"
```

### **Frontend (`apps/web/.env.production`)**
```env
NEXT_PUBLIC_API_URL="https://yourdomain.com/api/v1"
NEXT_PUBLIC_WS_URL="https://yourdomain.com"
```

---

## 6. Step-by-Step Production Deployment Guide

### **Step 1: Server Setup (Ubuntu 22.04 LTS recommended)**
```bash
# Update server packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x, Git, Build Essentials
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx

# Install pnpm and PM2 globally
sudo npm install -g pnpm pm2
```

### **Step 2: Database Setup (PostgreSQL)**
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Switch to postgres user and create database & user
sudo -u postgres psql
```
In the PostgreSQL prompt:
```sql
CREATE DATABASE gaming_platform;
CREATE USER game_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE gaming_platform TO game_user;
\q
```

### **Step 3: Clone Codebase & Install Dependencies**
```bash
cd /var/www
sudo git clone <your-repository-url> gaming-platform
sudo chown -R $USER:$USER /var/www/gaming-platform
cd /var/www/gaming-platform

# Install monorepo dependencies
pnpm install
```

### **Step 4: Database Migration & Build**
```bash
# Set environment variables in packages/database & apps/api
cp apps/api/.env.example apps/api/.env

# Run Prisma schema push to create all tables
cd packages/database
npx prisma db push
npx prisma generate

# Build entire monorepo
cd /var/www/gaming-platform
pnpm run build
```

### **Step 5: Process Management with PM2**
Create `ecosystem.config.cjs` in `/var/www/gaming-platform`:

```javascript
module.exports = {
  apps: [
    {
      name: 'rivexa-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_URL: 'postgresql://game_user:your_strong_password@localhost:5432/gaming_platform?schema=public'
      }
    },
    {
      name: 'rivexa-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002 -H 0.0.0.0',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
```

Start PM2 services:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### **Step 6: Nginx Reverse Proxy & WebSockets Config**
Create `/etc/nginx/sites-available/gaming-platform`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend Next.js app
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # REST API endpoints
    location /api/v1/ {
        proxy_pass http://127.0.0.1:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO Real-Time WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/gaming-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **Step 7: SSL Certificate Setup (Certbot)**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 7. Verification Checklist Post-Deployment

- [x] REST API responds at `https://yourdomain.com/api/v1/admin/users`
- [x] Socket.IO WebSocket establishes connection at `wss://yourdomain.com/socket.io/`
- [x] Next.js pages load smoothly at `https://yourdomain.com`
- [x] Admin panel functions at `https://yourdomain.com/admin`
- [x] Database connections & Prisma models operate without FK constraint bottlenecks
