# 🚢 MOTOSPORT – מערכת מעקב משלוחים

מערכת ניהול ומעקב משלוחי יבוא ימיים בזמן אמת.

---

## ⚡ הפעלה מהירה

### 1. שכפל ותתקין תלויות
```bash
git clone <repo-url>
cd motosport-tracking
npm install
```

### 2. הגדר משתני סביבה
```bash
cp .env.example .env.local
```
פתח `.env.local` ומלא:
```
DATABASE_URL="postgresql://postgres.eupqmwosmgfqqbrawmds:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.eupqmwosmgfqqbrawmds:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="הרץ: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
SHIPSGO_API_KEY="ebc1b633-9302-4d4b-bb27-2d952682c8ff"
WEBHOOK_SECRET="בחר_מחרוזת_סודית"
```

### 3. הגדר מסד נתונים
פתח את Supabase Dashboard → SQL Editor → העתק והרץ את הקובץ:
```
prisma/supabase_migration.sql
```

### 4. צור Prisma client
```bash
npx prisma generate
```

### 5. הרץ בפיתוח
```bash
npm run dev
```

פתח http://localhost:3000

---

## 🔑 כניסה ראשונית

לאחר הרצת ה-migration, צור משתמש Admin ישירות ב-SQL Editor:

```sql
-- החלף את הסיסמה לפי הרצונך
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'מנהל מערכת',
  'admin@motosport.co.il',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 'password'
  'admin'
);
```

> **שים לב:** שנה את הסיסמה מיד לאחר כניסה ראשונה דרך דף ניהול משתמשים.

---

## 🗂️ מבנה הפרויקט

```
app/
├── login/              ← מסך התחברות
├── (dashboard)/
│   ├── page.tsx        ← דף הבית – טבלת משלוחים
│   ├── shipments/
│   │   ├── new/        ← הוספת משלוח (3 שלבים)
│   │   └── [id]/       ← פרטי משלוח + ציר זמן
│   └── admin/
│       ├── users/      ← ניהול משתמשים
│       └── branches/   ← ניהול סניפים
├── api/
│   ├── shipments/      ← CRUD + Refresh
│   ├── admin/          ← Users & Branches API
│   └── webhooks/       ← ShipsGo webhook
```

---

## 👥 תפקידים והרשאות

| פעולה | סוכן | מנהל ייבוא | מנהל מערכת |
|-------|------|------------|------------|
| צפייה במשלוחי הסניף | ✅ | ✅ | ✅ |
| צפייה בכל המשלוחים | ❌ | ✅ | ✅ |
| הוספת/עריכת משלוח | ❌ | ✅ | ✅ |
| ניהול משתמשים/סניפים | ❌ | ❌ | ✅ |

---

## 🌐 Deploy ל-Vercel

```bash
# התקן Vercel CLI
npm i -g vercel

# Deploy
vercel

# הגדר Environment Variables ב-Vercel Dashboard
# Settings → Environment Variables → העתק מ-.env.local
```

---

## 🔔 Webhook מ-ShipsGo

הגדר ב-ShipsGo Dashboard את ה-webhook URL:
```
https://your-domain.vercel.app/api/webhooks/shipsgo
```

Header נדרש:
```
x-webhook-secret: [ה-WEBHOOK_SECRET שהגדרת]
```

---

## 📋 API Reference

```
GET    /api/shipments              רשימת משלוחים (עם פילטרים)
POST   /api/shipments              יצירת משלוח
GET    /api/shipments/:id          פרטי משלוח
PUT    /api/shipments/:id          עדכון משלוח
DELETE /api/shipments/:id          מחיקת משלוח
PATCH  /api/shipments/:id          רענון מ-ShipsGo

GET    /api/admin/users            רשימת משתמשים
POST   /api/admin/users            יצירת משתמש
PUT    /api/admin/users/:id        עריכת משתמש
DELETE /api/admin/users/:id        מחיקת משתמש

GET    /api/admin/branches         רשימת סניפים
POST   /api/admin/branches         יצירת סניף
PUT    /api/admin/branches/:id     עריכת סניף
DELETE /api/admin/branches/:id     מחיקת סניף

POST   /api/webhooks/shipsgo       קבלת עדכונים
```
