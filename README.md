# ShoeOps 👟

Platform SaaS manajemen operasional dan analitik bisnis untuk usaha cuci sepatu Indonesia.

## Fitur

- **Halaman Customer** — cek status pesanan publik (tanpa login)
- **Halaman Operasional** — input pesanan, update status, dashboard harian
- **Halaman Owner** — dashboard bisnis, analitik, insight otomatis, laporan

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)

## Cara Menjalankan

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Supabase

1. Buat project di [supabase.com](https://supabase.com)
2. Copy URL dan anon key
3. Rename `.env.local.example` → `.env.local` dan isi nilai-nilainya:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

4. Buka **SQL Editor** di Supabase dashboard
5. Jalankan seluruh isi file `lib/supabase/schema.sql`
6. Buat user di **Authentication → Users**:
   - `owner@tokoku.com` (password: demo123456)
   - `operasional@tokoku.com` (password: demo123456)
7. Insert ke tabel `public.users`:
```sql
insert into public.users (id, tenant_id, role, name, email) values
  ('<auth_uid_owner>', '00000000-0000-0000-0000-000000000001', 'owner', 'Pemilik Toko', 'owner@tokoku.com'),
  ('<auth_uid_ops>',   '00000000-0000-0000-0000-000000000001', 'operasional', 'Staff Ops', 'operasional@tokoku.com');
```
(Ganti `<auth_uid_*>` dengan UUID dari Supabase Auth)

### 3. Jalankan development server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Demo (tanpa Supabase)

Aplikasi otomatis menggunakan **mock data** jika Supabase tidak terkonfigurasi.
Semua halaman bisa dijelajahi langsung.

Demo pages:
- `/` — Landing page
- `/cek-pesanan` — Cek status pesanan (coba kode SO-1241)
- `/login` → `/owner` — Dashboard owner
- `/login` → `/operasional` — Halaman operasional

## Struktur Project

```
app/
  page.tsx              # Landing page
  cek-pesanan/          # Halaman customer (publik)
  login/                # Login
  operasional/          # Dashboard operasional
  owner/                # Dashboard owner
    analitik/           # Halaman analitik & laporan
    customer/           # Data customer
    treatment/          # Kelola treatment
    pengaturan/         # Pengaturan toko
  expired/              # Subscription expired
components/
  ui/                   # Komponen UI reusable
  layout/               # Sidebar, banner, dll
  forms/                # Form components
  owner/                # Owner-specific components
lib/
  utils.ts              # Helper functions
  mock-data.ts          # Demo data
  supabase/             # Supabase clients & schema
types/
  index.ts              # TypeScript types
hooks/
  useAuth.ts            # Auth hook
middleware.ts           # Route protection
```

## Deployment

```bash
npm run build
```

Deploy ke Vercel:
1. Push ke GitHub
2. Import di [vercel.com](https://vercel.com)
3. Tambahkan environment variables
4. Deploy!
