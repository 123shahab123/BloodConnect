# 🩸 BloodConnect — Laravel 11 + React 18 PWA

---

## ⚡ Quick Start (3 steps)

### Step 1 — Database
```sql
-- In MySQL:
CREATE DATABASE bloodconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Backend
```bash
cd backend

# Windows:
setup.bat

# Linux / Mac:
bash setup.sh
```

Then open `backend/.env` and set your MySQL password:
```
DB_PASSWORD=your_mysql_password_here
```
Then run `php artisan serve` — API runs on **http://localhost:8000**

**Also run the scheduler** (separate terminal) — without this, blood requests are never matched to donors, so no notifications (in-app or push) get created at all:
```bash
php artisan schedule:work
```
(In production, use a real cron entry calling `php artisan schedule:run` every minute instead of `schedule:work`.)

### Step 3 — Frontend
```bash
cd frontend
npm install
# Create .env.local:
echo VITE_API_URL=http://localhost:8000/api > .env.local
npm run dev
```

Open **http://localhost:3000** 🩸

(Push notifications need extra setup — see "📲 FCM Push Notifications" below.)

---

## 🔐 Authentication

| Field | Required? |
|---|---|
| Phone number | ✅ Required |
| Password | ✅ Required (min 6 chars) |
| Email | ⭕ Optional |

No SMS. No OTP. Simple phone + password.

---

## 🔧 Troubleshooting

### CORS error in browser
Make sure `FRONTEND_URL=http://localhost:3000` is set in `backend/.env`

### "JwtAuth already declared" error
Delete the folder literally named `{app` from your backend directory if it exists (it's a packaging artifact):
```bash
# Windows PowerShell:
Remove-Item -Recurse -Force "backend\{app"
# Mac/Linux:
rm -rf "backend/{app"
```

### "Server error" on blood request submit
This is always CORS. Check that Laravel is running (`php artisan serve`) and `.env` has the correct `FRONTEND_URL`.

### Storage permission error (Windows)
```bash
mkdir backend\storage\framework\cache\data
mkdir backend\storage\framework\sessions
mkdir backend\storage\framework\views
mkdir backend\storage\logs
```

### Notifications never appear (in-app OR push), even though everything looks configured
The 5-wave donor matching only runs via Laravel's scheduler (`routes/console.php` → `Schedule::call(...)->everyMinute()`). If you're not running `php artisan schedule:work` (dev) or a cron calling `php artisan schedule:run` every minute (production), blood requests just sit there and donors never get matched or notified — independent of whether FCM itself is configured correctly. See Step 2 above.

---

## 👑 Admin Panel
URL: **http://localhost:3000/admin**
Email: `admin@bloodconnect.af`
Password: `BloodConnect@Admin2026!`

---

## 📲 FCM Push Notifications (Free)

Push notifications need **two** separate pieces of Firebase config — a backend secret and a frontend public config. Both are free, no billing required.

### Backend (sends pushes)
1. Go to https://console.firebase.google.com → Create project (free)
2. ⚙️ Project Settings → **Service Accounts** tab → **Generate New Private Key**
3. Save the downloaded JSON as `backend/storage/app/firebase-credentials.json`

### Frontend (receives pushes — required, not optional)
The web app has to register itself with Firebase before any device can receive a push. This needs different config than the backend's service account file.

1. ⚙️ Project Settings → **General** tab → scroll to "Your apps" → click `</>` to add a Web app (skip Firebase Hosting, not needed) → copy the `firebaseConfig` values shown
2. ⚙️ Project Settings → **Cloud Messaging** tab → "Web configuration" → "Web Push certificates" → **Generate key pair** → copy the key
3. Create `frontend/.env.local` (copy from `frontend/.env.example`) and fill in all the `VITE_FIREBASE_*` values from steps 1–2
4. `npm run dev` (or rebuild for production) — users will see a "Push Notifications" toggle in their Profile page to opt in

### Verifying it's actually working
- `php artisan fcm:test` from `backend/` — checks the credentials file loads correctly; pass a real device token (`php artisan fcm:test "TOKEN"`) to send a live test push
- The admin dashboard (`/admin/dashboard`) reports `fcm_configured: true/false` for the backend half
- A user must explicitly enable the "Push Notifications" toggle in their Profile page (Notification permission can't be auto-granted by browsers) before their device can receive anything
- Check `backend/storage/logs/laravel.log` for `FCM:` prefixed lines if pushes still aren't arriving — the service logs the specific reason (missing file, bad JSON, wrong key type, etc.)

Without any of this configured, in-app notifications still work fine — push is silently skipped.

---

## 🗂 Structure
```
bloodconnect/
├── backend/                     Laravel 11 API
│   ├── app/
│   │   ├── Console/Commands/    fcm:test — CLI FCM diagnostic
│   │   ├── Http/
│   │   │   ├── Middleware/      Cors, ForceJson, JwtAuth, AdminAuth
│   │   │   └── Controllers/Api/ Auth, User, BloodRequest, Notification, Geo, Admin
│   │   ├── Models/               User, BloodRequest, DonorNotification, Acceptance, ...
│   │   └── Services/
│   │       ├── MatchingEngine.php   5-wave geographic matching algorithm
│   │       └── FcmService.php       Firebase push (pure PHP, no extra package)
│   ├── database/
│   │   ├── migrations/          12 tables
│   │   └── seeders/             34 provinces, 60+ districts, config, admin
│   ├── routes/api.php
│   ├── setup.bat                Windows one-click setup
│   └── setup.sh                 Linux/Mac one-click setup
│
└── frontend/                    React 18 + TypeScript PWA
    ├── public/
    │   └── firebase-messaging-sw.js   Background push handler
    └── src/
        ├── pages/
        │   ├── auth/            LoginPage (phone+pass), RegisterPage (3-step, email optional)
        │   ├── HomePage         Availability toggle, incoming donor requests
        │   ├── DonatePage       Pending donation notifications queue
        │   ├── RequestBloodPage 2-step form (blood type → location + contact)
        │   ├── RequestDetailPage Wave progress, donor list with phone reveal
        │   ├── RequestsPage     My requests history
        │   ├── HistoryPage      Donation history + notification inbox
        │   ├── ProfilePage      Language (Dari/Pashto/English), push notifications toggle, logout
        │   └── admin/           Dashboard, Users, Requests, Analytics, Config
        ├── lib/firebase.ts      Firebase app + messaging init (client-side FCM config)
        ├── hooks/usePushNotifications.tsx  Permission, token sync, foreground messages
        ├── services/api.ts      All API calls to Laravel
        ├── store/index.ts       Zustand auth + app state
        └── i18n/index.ts        Dari + Pashto + English translations
```
