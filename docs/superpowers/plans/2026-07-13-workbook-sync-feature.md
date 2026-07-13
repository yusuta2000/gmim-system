# Ana Takip Dosyası Senkron Özelliği — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Adımlar checkbox (`- [ ]`) ile izlenir.

**Goal:** Temsilci/başkan/dekan'ın, bölümün 15 sayfalık ana takip Excel'ini portaldan yükleyip önizleme sonrası onaylayarak o bölümün görev/puanlarını tam yeniden-eşitlemesini sağlamak.

**Architecture:** Script'te (`scripts/sync-gmim-from-excel.mjs`) doğrulanmış parse+senkron mantığı paylaşılan bir sunucu modülüne (`workbook-sync.ts`) taşınır; yeni `POST /api/sync-workbook` ucu önizleme (hash'li) ve commit modlarını sunar; import ekranına ayrı bir kart eklenir. İşlem bölüme özeldir, yalnız `Task` verisine dokunur; kişi/şifre/diğer bölüme dokunmaz.

**Tech Stack:** Next.js 16 App Router, Prisma, xlsx, React Query, vitest.

---

## Dosya yapısı

- Create `src/features/import-export/server/workbook-sync.ts` — parse + preview + commit (bölüme özel, isim eşleştirmeli).
- Create `src/features/import-export/server/__tests__/workbook-sync.test.ts` — parser/preview birim testleri (sentetik çok-sayfalı workbook).
- Create `src/app/api/sync-workbook/route.ts` — rol/bölüm korumalı önizleme+commit ucu.
- Modify `src/features/management/import/import-screen.tsx` — "Ana takip dosyası ile senkron" kartı.
- Modify `src/features/import-export/server/parser.ts` — mevcut importer'ın boş başlık sütununda 500 çökmesini engelle (guard).

## Golden kurallar (bu özellik için)

- Yalnız seçili bölümün (`department`) `Task` verisi silinir/yeniden yüklenir; kişi/şifre/diğer bölüm dokunulmaz.
- Sayfa→kişi eşleşmesi normalize substring ile; eşleşmeyen sayfalar (TOPLAM, Puan Baremi vb.) atlanır.
- Bölümde görevi olan ama Excel sayfası eşleşmeyen kişi varsa commit **bloke** (veri kaybı koruması).
- Commit için önizleme `fileHash` zorunlu; dosya önizlemeden sonra değiştiyse 409.

---

### Task 1: Paylaşılan parse+senkron modülü

**Files:**
- Create: `src/features/import-export/server/workbook-sync.ts`
- Test: `src/features/import-export/server/__tests__/workbook-sync.test.ts`

- [ ] **Step 1:** `parseWorkbookForDepartment(buffer, assistants)` yaz: her sayfayı normalize substring ile bölüm kişisine eşleştir; kişi sayfalarını `parseSheet` ile oku (başlık tespiti, sayı/tarih/puan kuralı, tarih ileri-taşıma). Meta sayfaları atla, çok-eşleşmeyi uyar.
- [ ] **Step 2:** `previewWorkbookSync({buffer, department})`: DB'den bölüm kişileri + kategoriler çek; kişi kişi `{newCount,newPoints,curCount,curPoints,curTotal}` + `fileHash` + `orphansWithTasks` + `unmatchedSheets` döndür.
- [ ] **Step 3:** `commitWorkbookSync({buffer, department})`: transaction — bölüm görevlerini sil, parse edilenleri `createMany` ile ekle, bölüm kişilerinin `totalPoints`'unu yeniden hesapla. `{deleted, inserted}` döndür.
- [ ] **Step 4:** Test: sentetik workbook (2 kişi sayfası + TOPLAM meta) → doğru sayım, tarih ileri-taşıma, orphan tespiti. `bun run test -- workbook-sync`.
- [ ] **Step 5:** Commit.

### Task 2: API ucu

**Files:**
- Create: `src/app/api/sync-workbook/route.ts`

- [ ] **Step 1:** `POST`: `requireSession` → `requireRole(['admin','dekan','baskan'])` → `department` al, `assertDepartmentAccess`. `mode` preview|commit. Preview → `previewWorkbookSync`. Commit → hash doğrula (uyuşmazsa 409) → `orphansWithTasks` varsa 409 → `commitWorkbookSync`.
- [ ] **Step 2:** Hata eşlemesi (Unauthenticated 401, Authorization 403, parse hatası 400). Build ile doğrula.
- [ ] **Step 3:** Commit.

### Task 3: UI kartı

**Files:**
- Modify: `src/features/management/import/import-screen.tsx`

- [ ] **Step 1:** Ayrı `WorkbookSyncCard`: dosya seç → "Önizle" (per-kişi tablo: Excel vs mevcut, önce→sonra puan; büyük "TÜM bölüm görevleri değişecek" uyarısı) → "Senkronize et" (hash ile commit). Başarıda tasks/points/calendar query invalidate.
- [ ] **Step 2:** `next build` ile derle; import ekranında kart görünür.
- [ ] **Step 3:** Commit.

### Task 4: Mevcut importer çökme guard'ı

**Files:**
- Modify: `src/features/import-export/server/parser.ts`

- [ ] **Step 1:** `indexOf` içinde `(header ?? '').includes(...)`; başlık dizisini yoğun (dense) üret. Böylece boş sütunlu dosyada 500 yerine anlamlı hata.
- [ ] **Step 2:** Mevcut parser testleri geçsin (`bun run test -- parser`).
- [ ] **Step 3:** Commit.

### Task 5: Doğrulama + dokümantasyon kapanışı

- [ ] `bun run test`, `bun run typecheck`, `bun run build`, `bun run docs:check`.
- [ ] Staging/prod: yeni kartla küçük bir workbook önizleme dry-run doğrulaması (prod'da commit yalnız gerçek güncelleme gerektiğinde).
- [ ] `docs/logbook/2026/` kaydı, `CURRENT.md` ve `INDEX.md` güncelle.
