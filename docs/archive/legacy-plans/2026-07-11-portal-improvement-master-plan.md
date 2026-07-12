# İTÜ DF Ar.Gör Portalı Birleşik İyileştirme Ana Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teknik güvenlik ve veri bütünlüğü bulgularını, onaylanan hibrit UI/UX yeniden tasarımıyla tek bağımlılık sıralı programa dönüştürmek.

**Architecture:** Program önce production riskini sınırlar, ardından session/authorization ve veri bütünlüğü temelini kurar. UI dönüşümü bu temelin üzerine AppShell ve dikey özellik dilimleriyle ilerler; her dilim backend, frontend, test ve rollback sınırını birlikte taşır.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL/Neon, Tailwind CSS, shadcn/ui, TanStack Query, Zod, Bun, Vercel.

## Global Constraints

- Production verisine yazan her script varsayılan olarak dry-run çalışır; yazma için açık `--commit` gerekir.
- GMİM işlemleri DUİM kayıtlarına, DUİM işlemleri GMİM kayıtlarına dokunamaz; dekan istisnası sunucu tarafında açıkça test edilir.
- Her mantıklı değişiklik ayrı, küçük ve geri alınabilir commit olur.
- Her git commit ve push öncesi kullanıcı onayı alınır.
- Push öncesi `git pull origin main` çalıştırılır; `git push --force` kullanılmaz.
- Production deploy öncesi lint, typecheck, test ve `next build` başarılı olmalıdır.
- Yıkıcı schema/data değişikliğinden önce yedek ve rollback yöntemi yazılı olmalıdır.
- UI görünürlüğü yetkilendirme değildir; bütün yetkiler doğrulanmış server session'ından hesaplanır.
- Mobil kabul genişlikleri: 320, 375, 390, 768, 1024 ve 1440 px.
- Birincil dokunma hedefleri en az 44 × 44 px olur.
- WCAG 2.2 AA hedeflenir.
- Yeni production secret hiçbir tracked dosyaya yazılmaz.

---

## 1. Kaynak belgeler ve roller

Bu ana plan iki kaynak belgeyi değiştirmez; onları uygulama sırasına bağlar:

- `TEKNIK_ANALIZ_RAPORU_2026-07-11.md`
  - Güvenlik, veri bütünlüğü, import, build/deploy ve mimari bulguların kaynak kaydıdır.
- `docs/superpowers/specs/2026-07-11-portal-hybrid-redesign-design.md`
  - Kullanıcı tarafından onaylanan hibrit UI/UX hedef durumudur.

Ana planın görevi:

1. Hangi teknik bulgunun hangi UI dilimini bloke ettiğini göstermek.
2. Büyük dönüşümü bağımsız test ve rollback sınırlarına ayırmak.
3. Her alt planın giriş ve çıkış kapısını tanımlamak.
4. Aynı dosyaya eşzamanlı ve çakışan değişiklik yapılmasını önlemek.

## 2. Neden tek monolitik plan yok

Program dört bağımsız fakat ilişkili sistem içeriyor:

1. Kimlik doğrulama ve yetkilendirme
2. Veri modeli, puan ve dönem bütünlüğü
3. Import/deploy/operasyon güvenliği
4. UI/UX ve responsive uygulama kabuğu

Bunların tek PR veya tek implementation plan içinde yürütülmesi şu riskleri yaratır:

- Auth regresyonu ile görsel regresyon aynı diff içinde kaybolur.
- DB migration rollback'i UI deploy'una bağlanır.
- `src/app/page.tsx` üzerinde iki farklı çalışma çakışır.
- Test hatasında sorumlu dilim belirlenemez.
- Ortak `main` dalında çalışan iki kişi için merge conflict riski büyür.

Bu nedenle ana plan sekiz alt plana bölünür. Her alt plan çalışan ve doğrulanabilir bir ara ürün üretir.

## 3. Alt plan haritası

| Plan | Ad | Ana bulgular | Bağımlılık | Çıkış ürünü |
|---|---|---|---|---|
| P00 | Olayı sınırlandırma ve repo hijyeni | SEC-01, OPS-01 | Yok | Eski DB secret iptal, tracked secret temiz |
| P01 | Test ve migration güvenlik ağı | ENG-01, ENG-02, ENG-03 | P00 | Typecheck/test/build kapıları ve migration deploy |
| P02 | Session, parola ve authorization | SEC-02–SEC-08 | P01 | HttpOnly session ve merkezi rol/bölüm yetkisi |
| P03 | Görev, puan ve dönem bütünlüğü | DATA-01–DATA-05 | P02 | Transactional/idempotent görevler ve dönem modeli |
| P04 | Güvenli import/export ve operasyon | IMP-01, IMP-02, ENG-04 | P02, P03 | Dry-run/preview/rollback import |
| P05 | UI temeli ve AppShell | ARCH-01, ARCH-02, UI spec 5/9/10/12 | P02 | Token sistemi, URL routes, responsive shell |
| P06 | Dashboard ve Görevler dikey dilimi | UI spec 6/7/13/15 | P03, P05 | Rol bazlı dashboard, sayfalı görev UI/API |
| P07 | Takvim, içerik ve yönetim dikey dilimleri | UI spec 8/11/14/16 | P04–P06 | Calendar, announcements, people, management |
| P08 | Kapanış hardening ve yayın | ENG-04, UI spec 14–20 | P00–P07 | A11y/perf/security release gate |

## 4. Program bağımlılık akışı

```text
P00 Olayı sınırlandırma
  └─ P01 Test ve migration güvenlik ağı
       └─ P02 Session ve authorization
            ├─ P03 Görev, puan ve dönem bütünlüğü
            │    └─ P04 Güvenli import/export
            └─ P05 UI temeli ve AppShell
                 └─ P06 Dashboard ve Görevler
                      └─ P07 Takvim, içerik ve yönetim
                           └─ P08 Kapanış hardening
```

P03 ve P05, P02 tamamlandıktan sonra dosya sahipliği çakışmayacak biçimde yürütülebilir. Ancak ortak repo ve mevcut `page.tsx` değişiklikleri nedeniyle varsayılan yürütme sıralıdır.

## 5. Program çapında dosya sahipliği

### P00–P02 güvenlik sahipliği

```text
prisma/schema.prisma
prisma/migrations/**
src/lib/auth/**
src/lib/authorization/**
src/lib/validation/**
src/app/api/login/route.ts
src/app/api/change-password/route.ts
src/app/api/reset-password/route.ts
src/app/api/add-assistant/route.ts
src/app/api/**/route.ts
scripts/**
.gitignore
package.json
next.config.ts
```

### P03–P04 veri sahipliği

```text
prisma/schema.prisma
prisma/migrations/**
src/features/tasks/server/**
src/features/periods/server/**
src/features/import-export/server/**
src/app/api/tasks/**
src/app/api/approve-task/**
src/app/api/respond-task/**
src/app/api/delete-task/**
src/app/api/reset-period/**
src/app/api/import-excel/**
src/app/api/export-excel/**
scripts/reconcile-points.*
scripts/migrate-periods.*
```

### P05–P07 UI sahipliği

```text
src/app/globals.css
src/app/layout.tsx
src/app/dashboard/**
src/app/tasks/**
src/app/calendar/**
src/app/announcements/**
src/app/people/**
src/app/management/**
src/components/app-shell/**
src/components/navigation/**
src/components/responsive/**
src/features/*/components/**
src/features/*/queries/**
src/app/page.tsx
```

`src/app/page.tsx` yalnız P05 başladığında parçalanır. P00–P04 sırasında zorunlu auth adaptasyonu dışında UI refactor yapılmaz.

## 6. Canonical doğrulama komutları

Mevcut `package.json` build script'i production DB'ye `prisma db push` çalıştırdığı için P01 tamamlanana kadar doğrulama şu komutlarla yapılır:

```powershell
bun x prisma validate
bun x eslint src
bun x tsc --noEmit
bun test
bun x next build
```

Beklenen sonuç:

- Her komut exit code `0` verir.
- `next build` çıktısında “Skipping validation of types” bulunmaz.
- Testlerde skipped authorization/department testi bulunmaz.
- Build sırasında `prisma db push` çalışmaz.

P01 öncesinde `bun x tsc --noEmit`, yanlış uzantılı `scripts/import-excel-full.ts` nedeniyle beklenen şekilde başarısızdır. P01 bu engeli kaldırır.

## 7. P00 — Olayı sınırlandırma ve repo hijyeni

**Amaç:** Açığa çıkmış production DB erişimini geçersiz kılmak ve yeni sızıntıyı önlemek.

**Bloke ettiği işler:** Bütün production deploy ve veri migration çalışmaları.

### Task P00.1: Neon kimlik bilgisini döndür

**Dış sistemler:** Neon, Vercel.

- [ ] Mevcut production DB rol/credential bilgisini Neon tarafında döndür.
- [ ] Vercel `DATABASE_URL` ve `DIRECT_URL` değerlerini yeni credential ile güncelle.
- [ ] Eski credential ile bağlantının reddedildiğini doğrula.
- [ ] Uygulamanın yeni credential ile read-only sağlık kontrolünü doğrula.
- [ ] Neon erişim/sorgu loglarını şüpheli kullanım için kaydet ve incele.

**Kabul:** Eski credential çalışmaz; canlı uygulama yeni credential ile çalışır.

**Onay kapısı:** Bu işlem dış sistem ve production erişimi değiştirdiği için uygulama anında kullanıcı onayı gerekir.

### Task P00.2: Tracked secret ve gerçek veri envanteri

**Files:**

- Modify: `.gitignore`
- Modify: `SISTEM_DOKUMANTASYONU.md`
- Modify/remove from tracking: secret içeren `scripts/*`
- Review/remove from tracking: `upload/**`, `tool-results/**`, `db/custom.db`, analiz JSON dosyaları

- [ ] `git grep -Il 'postgresql://'` ile tracked secret dosyalarını listele; değerleri terminal çıktısında yayınlama.
- [ ] Gerçek kişisel/kurumsal veri içeren tracked dosyaları sınıflandır.
- [ ] Secret kullanan script'leri yalnız `process.env`/`os.environ` okuyacak hale getir.
- [ ] `.gitignore` içine `.superpowers/`, local upload/tool output ve yerel DB kurallarını ekle.
- [ ] Anonimleştirilmiş test fixture'larını gerçek dosyalardan ayır.
- [ ] `git diff --check` ve yeniden `git grep` çalıştır.

**Kabul:** Güncel tree içinde production connection string yok; gerekli olmayan gerçek veri tracked değil.

### Task P00.3: Git geçmişi temizleme koordinasyonu

- [ ] Temizlenecek path/secret desenlerini yazılı listele.
- [ ] İki ortak geliştiricinin commit'lenmemiş işini güvenceye aldığını doğrula.
- [ ] History rewrite öncesi repo yedeği/tag oluşturma planını yaz.
- [ ] `git filter-repo` komutunu dry-run/ayna kopya üzerinde doğrula.
- [ ] Kullanıcı açık onayı olmadan history rewrite veya force push yapma.

**Kabul:** History rewrite prosedürü geri dönüş ve ortak geliştirici yeniden senkronizasyon adımlarını içerir.

## 8. P01 — Test ve migration güvenlik ağı

**Amaç:** Güvenlik ve UI çalışmalarından önce gerçek kalite kapıları kurmak.

### Task P01.1: Test runner ve test dizini

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/__tests__/smoke.test.ts`

**Produces:**

- `bun test` ile çalışan Vitest suite
- DOM testleri için jsdom setup

- [ ] Test bağımlılıklarını seçilen Bun/Vitest sürümleriyle ekle.
- [ ] Başarısız bir smoke testi yaz ve `bun test` ile FAIL olduğunu gör.
- [ ] Minimal fixture/setup ekleyerek testi PASS yap.
- [ ] `test`, `test:watch`, `typecheck`, `lint` script'lerini ekle.
- [ ] Commit için kullanıcı onayı iste.

### Task P01.2: TypeScript kontrolünü gerçek kapı yap

**Files:**

- Modify/remove: `scripts/import-excel-full.ts`
- Create if retained: `scripts/import-excel-full.py`
- Modify: `tsconfig.json`
- Modify: `next.config.ts`

- [ ] Yanlış uzantılı Python script'inin production secret içermeyen gerekli davranışını belirle.
- [ ] Script gerekli değilse tracking'den çıkar; gerekliyse doğru uzantı ve dry-run guard ile taşı.
- [ ] `bun x tsc --noEmit` çalıştır ve kalan gerçek type hatalarını kaydet.
- [ ] Type hatalarını küçük dilimlerle düzelt.
- [ ] `typescript.ignoreBuildErrors` ayarını kaldır.
- [ ] Typecheck ve build'in PASS olduğunu doğrula.

### Task P01.3: Migration tabanlı deploy

**Files:**

- Modify: `package.json`
- Create: `prisma/migrations/**`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `SISTEM_DOKUMANTASYONU.md`

- [ ] Mevcut production schema ile Prisma schema farkını read-only incele.
- [ ] Baseline migration yaklaşımını yedek DB üzerinde doğrula.
- [ ] Build script'inden `prisma db push` kaldır.
- [ ] Production deploy için `prisma migrate deploy` sırasını yaz.
- [ ] `AGENTS.md` ve `CLAUDE.md` dosyalarını birebir aynı güncelle.
- [ ] Boş/uyumlu migration ile staging build doğrula.

**Kabul:** Application build DB schema'yı kontrolsüz değiştirmez.

## 9. P02 — Session, parola ve authorization

**Amaç:** Tüm API ve UI kimliğini server-side session'a bağlamak.

### Hedef arayüzler

```ts
export type SessionUser = {
  id: string;
  role: 'admin' | 'baskan' | 'dekan' | 'user';
  department: 'GMIM' | 'DUIM';
};

export async function requireSession(): Promise<SessionUser>;
export function requireRole(user: SessionUser, roles: SessionUser['role'][]): void;
export function assertDepartmentAccess(user: SessionUser, department: 'GMIM' | 'DUIM'): void;
```

### Task P02.1: Session ve password schema

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_sessions_and_password_hash/migration.sql`
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/__tests__/password.test.ts`
- Test: `src/lib/auth/__tests__/session.test.ts`

- [ ] Hash/verify için failing test yaz.
- [ ] Argon2id veya seçilen güvenli algoritmayla minimal implementasyonu yap.
- [ ] Session token'ın yalnız hash'inin DB'de saklandığını test et.
- [ ] Cookie'nin HttpOnly, Secure production, SameSite ve expiry ayarlarını test et.
- [ ] Migration'ı yedek/staging DB üzerinde doğrula.

### Task P02.2: Merkezi authorization

**Files:**

- Create: `src/lib/authorization/roles.ts`
- Create: `src/lib/authorization/department.ts`
- Test: `src/lib/authorization/__tests__/matrix.test.ts`

- [ ] user/admin/baskan/dekan × GMIM/DUIM matrisini tablo testi olarak yaz.
- [ ] Dekanın iki bölüme eriştiğini; diğer rollerin yalnız kendi bölümüne eriştiğini test et.
- [ ] `requireRole` ve `assertDepartmentAccess` implementasyonunu yap.
- [ ] Hata kodlarını `UNAUTHENTICATED` ve `FORBIDDEN` olarak standardize et.

### Task P02.3: API göçü

**Files:** `src/app/api/**/route.ts`

Göç sırası:

1. Login/password/person management
2. Tasks/approvals/respond/delete
3. Exams/schedule/supervisor
4. Announcements/notifications
5. Categories/import/export/reset-period

Her route için:

- [ ] Yetkisiz isteğin failing integration testini yaz.
- [ ] Yanlış bölüm isteğinin failing testini yaz.
- [ ] Request body/query içinden yetki veren ID alanını kaldır.
- [ ] Session, rol ve bölüm helper'larını ekle.
- [ ] DTO dışına çıkan kişisel alanları response'dan çıkar.
- [ ] Route'a özel testleri PASS yap.
- [ ] Bir sonraki route'a geçmeden commit onayı iste.

**Çıkış kapısı:** Oturumsuz kurumsal veri okuma/yazma mümkün değildir.

## 10. P03 — Görev, puan ve dönem bütünlüğü

### Task P03.1: Transactional görev mutation'ları

**Files:**

- Create: `src/features/tasks/server/task-service.ts`
- Modify: task mutation route'ları
- Test: `src/features/tasks/server/__tests__/task-service.integration.test.ts`

**Produces:**

```ts
approveTask(input: { taskId: string; reviewer: SessionUser }): Promise<TaskDto>
respondToTask(input: { taskId: string; action: 'accept' | 'reject'; responder: SessionUser }): Promise<TaskDto>
deleteTask(input: { taskId: string; requester: SessionUser }): Promise<void>
```

- [ ] İkinci onayın puanı tekrar artırmadığını gösteren failing test yaz.
- [ ] Yanlış durum geçişinin `CONFLICT` verdiğini test et.
- [ ] Görev durumu, puan ve notification yazımını tek transaction'a al.
- [ ] Koşullu update sonucu `1` değilse mutation'ı conflict ile durdur.
- [ ] Reconciliation invariant testini PASS yap.

### Task P03.2: Enum, index ve unique constraint

**Files:** `prisma/schema.prisma`, yeni migration.

- [ ] Mevcut string değerleri dry-run script ile envanterle.
- [ ] Geçersiz değer varsa mapping raporu üret; doğrudan değiştirme.
- [ ] Department/Role/TaskStatus/TaskSource enum migration'ını staging'de test et.
- [ ] `ExamSupervisor @@unique([examId, assistantId])` ekle.
- [ ] Sık sorgular için ölçülen index'leri ekle.
- [ ] Migration rollback prosedürünü doğrula.

### Task P03.3: AcademicPeriod

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/features/periods/server/period-service.ts`
- Create: `scripts/migrate-periods.ts`
- Test: `src/features/periods/server/__tests__/period-service.integration.test.ts`

- [ ] Açık/kapalı dönem ve carry-over kurallarının failing testlerini yaz.
- [ ] Mevcut görevlerin hangi döneme eşleneceğini dry-run raporla.
- [ ] Kapalı dönemde normal mutation'ı reddet.
- [ ] Dönem kapatmayı transaction ve audit log ile uygula.
- [ ] Eski `reset-period` davranışını yeni servise taşı ve korumasız yolu kaldır.

## 11. P04 — Güvenli import/export ve operasyon

### Task P04.1: Parser ve satır doğrulama

**Files:**

- Create: `src/features/import-export/server/parser.ts`
- Create: `src/features/import-export/server/schemas.ts`
- Test: `src/features/import-export/server/__tests__/parser.test.ts`
- Fixtures: `src/features/import-export/server/__fixtures__/**`

- [ ] Quoted CSV, Turkish date ve gerçek XLSX fixture testlerini yaz.
- [ ] Binary XLSX'i text olarak okuyan eski yolu kaldır.
- [ ] Belirsiz isim eşleşmesini hata/uyarı olarak raporla; otomatik fuzzy yazma yapma.
- [ ] Dosya boyutu ve satır sınırını doğrula.

### Task P04.2: Preview, batch ve rollback

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/features/import-export/server/import-service.ts`
- Modify: `src/app/api/import-excel/route.ts`
- Test: `src/features/import-export/server/__tests__/import-service.integration.test.ts`

- [ ] Aynı dosya hash'inin duplicate import üretmediğini test et.
- [ ] Preview endpoint'inin DB yazmadığını test et.
- [ ] Commit endpoint'ini tek transaction ve `ImportBatch` ile uygula.
- [ ] Batch rollback testini yaz ve PASS yap.
- [ ] UI başlamadan DTO sözleşmesini sabitle.

## 12. P05 — UI temeli ve AppShell

**Amaç:** Onaylı hibrit tasarım için route, token ve responsive primitive'leri kurmak.

### Task P05.1: Semantik token sistemi

**Files:**

- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `src/components/design-system/status-badge.tsx`
- Test: `src/components/design-system/status-badge.test.tsx`

- [ ] Light/dark ve GMIM/DUIM token kombinasyonları için component testleri yaz.
- [ ] Kurumsal palet doğrulanmadan değerleri “official” diye adlandırma.
- [ ] Hard-coded renkleri feature geçişlerinde kademeli kaldır; toplu kör replace yapma.
- [ ] Status badge'in renk olmadan metin/ikonla anlam taşıdığını test et.

### Task P05.2: AppShell ve role-aware navigation

**Files:**

- Create: `src/components/app-shell/app-shell.tsx`
- Create: `src/components/navigation/desktop-sidebar.tsx`
- Create: `src/components/navigation/mobile-bottom-nav.tsx`
- Create: `src/components/navigation/nav-config.ts`
- Test: `src/components/navigation/nav-config.test.ts`

**Produces:**

```ts
getNavigationItems(user: SessionUser): NavigationItem[]
```

- [ ] Dört rol için görünür navigation testlerini yaz.
- [ ] Normal kullanıcının yönetim hedeflerini görmediğini doğrula.
- [ ] Mobilde dört ana hedef ve role-aware Daha sheet'i uygula.
- [ ] Tüm hedeflerin 44 × 44 px olduğunu component/visual testle doğrula.

### Task P05.3: URL route iskeleti

**Files:** `src/app/dashboard/**`, `tasks/**`, `calendar/**`, `announcements/**`, `people/**`, `management/**`.

- [ ] Eski `/` girişini role-aware `/dashboard` yönlendirmesiyle test et.
- [ ] Her route için loading/error boundary ekle.
- [ ] Browser back/refresh/deep-link E2E testini yaz.
- [ ] Eski tab state'ini route state'ine aşamalı taşı.

## 13. P06 — Dashboard ve Görevler dikey dilimi

### Task P06.1: Rol bazlı dashboard

**Files:**

- Create: `src/app/dashboard/page.tsx`
- Create: `src/features/dashboard/components/**`
- Create: `src/features/dashboard/queries/dashboard.ts`
- Test: dashboard component/E2E testleri

- [ ] Araştırma görevlisi ve yönetici dashboard fixture'larını yaz.
- [ ] “Bugünün önceliği”, son hareketler ve puan özetini ayrı bileşenlere böl.
- [ ] Kritik öğenin `Daha` menüsüne saklanmadığını test et.
- [ ] Loading/empty/partial-error durumlarını uygula.

### Task P06.2: Sayfalı görev API ve query

**Files:**

- Modify: `src/app/api/tasks/route.ts`
- Create: `src/features/tasks/queries/task-keys.ts`
- Create: `src/features/tasks/queries/use-tasks.ts`
- Test: pagination/filter integration testleri

- [ ] Cursor/page, search, status, assistant ve date filtre schema'larını yaz.
- [ ] Kullanıcının yalnız izinli görev scope'unu aldığını test et.
- [ ] Mutation sonrası yalnız task/pending/ranking query'lerinin invalidation'ını test et.

### Task P06.3: Responsive görev UI

**Files:**

- Create: `src/app/tasks/page.tsx`
- Create: `src/features/tasks/components/task-list.tsx`
- Create: `src/features/tasks/components/task-card.tsx`
- Create: `src/features/tasks/components/task-form.tsx`
- Create: `src/components/responsive/responsive-dialog.tsx`

- [ ] 95 görevin ilk render'da tamamının DOM'a eklenmediğini test et.
- [ ] Mobil bottom sheet ve desktop panel davranışını test et.
- [ ] Label bağlantısı, ilk hataya odak ve duplicate submit testlerini yaz.
- [ ] 320–1440 viewport screenshot doğrulaması yap.

**Çıkış kapısı:** Eski görev sekmesi kaldırılabilir; davranış eşdeğerliği ve yeni UX doğrulanmıştır.

## 14. P07 — Takvim, içerik ve yönetim dilimleri

### Task P07.1: Takvim/sınav/program

- [ ] Desktop tablo ve mobil program kartı component testlerini yaz.
- [ ] Mobilde horizontal table zorunluluğunu kaldır.
- [ ] Sınavlar ve haftalık programı aynı üst route altında ayrı görünümler olarak uygula.
- [ ] Çakışma ve gözetmen durumlarını metin + ikonla göster.

### Task P07.2: Duyurular ve personel

- [ ] Duyuru read/comment/delete yetki testlerini yaz.
- [ ] Personel DTO'sunda gereksiz PII alanlarını çıkart.
- [ ] Rol ve aktiflik değişikliklerini session authorization ile bağla.
- [ ] Dialog description/focus uyarılarını sıfırla.

### Task P07.3: Yönetim araçları

- [ ] Import preview UI'sini P04 DTO'suna bağla.
- [ ] Puan baremi ve dönem yönetimini `management` route'larına taşı.
- [ ] Dönem sıfırlamada bölüm adı, etki özeti, re-auth ve audit gerektir.
- [ ] Management hedeflerini mobil `Daha` içinde role göre göster.

## 15. P08 — Kapanış hardening ve yayın

### Task P08.1: Erişilebilirlik kapanışı

- [ ] Axe taramasını bütün ana route'larda çalıştır.
- [ ] Yalnız klavye smoke testini dört rolle tamamla.
- [ ] Focus-visible, dialog trap/return ve live-region davranışını doğrula.
- [ ] 44 × 44 px altındaki birincil hedefleri sıfırla.

### Task P08.2: Performance ve dependency kapanışı

- [ ] Production Core Web Vitals baseline ölç.
- [ ] Route/bundle bazında kullanılmayan bağımlılıkları belirle.
- [ ] Next.js, xlsx ve direct runtime açıklarını ayrı commitlerle gider.
- [ ] `bun audit` bulgularını exploitable/direct/dev-only olarak sınıflandır.
- [ ] Blind `bun update --latest` çalıştırma.

### Task P08.3: Release rehearsal

- [ ] Anonimleştirilmiş staging DB ile migration rehearsal yap.
- [ ] Rollback komutlarını ve veri yedeğini doğrula.
- [ ] Normal kullanıcı, admin, başkan ve dekan E2E suite'ini çalıştır.
- [ ] 320/375/390/768/1024/1440 görsel regression suite'ini çalıştır.
- [ ] Kullanıcı onayı sonrası `git pull origin main`, tekrar doğrulama ve push yap.

## 16. Commit ve inceleme stratejisi

Her alt planın görevleri tek tek commit edilir. Önerilen commit örüntüsü:

```text
chore(security): remove tracked production secrets
test: add baseline auth test harness
feat(auth): add server-backed sessions
feat(auth): enforce department authorization
fix(tasks): make approval idempotent
feat(periods): add academic period lifecycle
feat(import): add dry-run preview batches
feat(ui): add role-aware application shell
feat(tasks): add paginated responsive task view
feat(calendar): add responsive schedule cards
fix(a11y): close keyboard and dialog gaps
chore(deps): update verified runtime dependencies
```

Kurallar:

- Her commit öncesi kullanıcı onayı.
- Bir commit yalnız tek reviewer kararına karşılık gelir.
- Migration ve onu kullanan kod aynı release sırasına göre planlanır; rollback sınırı yazılır.
- Unrelated mevcut `page.tsx` ve `.impeccable/` değişiklikleri korunur.
- Commit mesajı yapılmış işi söyler; “updates” gibi genel mesaj kullanılmaz.

## 17. Program durum tablosu

| Plan | Durum | Başlama kapısı | Tamamlanma kanıtı |
|---|---|---|---|
| P00 | Hazır | Production işlem onayı | Credential rotation + temiz tree taraması |
| P01 | Bekliyor | P00 | Lint/typecheck/test/build green |
| P02 | Bekliyor | P01 | Auth/role/department integration suite green |
| P03 | Bekliyor | P02 | Transaction/idempotency/reconciliation green |
| P04 | Bekliyor | P03 | Preview/commit/rollback import suite green |
| P05 | Bekliyor | P02 | AppShell/route/responsive shell green |
| P06 | Bekliyor | P03 + P05 | Dashboard/tasks E2E + visual green |
| P07 | Bekliyor | P04 + P06 | Calendar/content/management E2E green |
| P08 | Bekliyor | P00–P07 | Full release rehearsal green |

## 18. Ana kabul kriterleri

Program tamamlandığında:

- Eski production DB credential geçersiz ve git ağacında secret yoktur.
- Tüm kurumsal API'ler server session gerektirir.
- Admin/başkan yalnız kendi bölümünde; dekan iki bölümde işlem yapar.
- Parolalar hash'li ve varsayılan tahmin edilebilir parola yolu kaldırılmıştır.
- Görev ve puan değişiklikleri transactional/idempotenttir.
- Dönem kapanışı gerçek dönem modeli ve audit kaydı kullanır.
- Import dry-run, preview, batch, duplicate kontrolü ve rollback destekler.
- Production build type error atlamaz ve DB'ye `prisma db push` çalıştırmaz.
- Normal kullanıcı ve yönetici için URL tabanlı, role-aware navigasyon vardır.
- Mobilde dört ana hedef ve erişilebilir `Daha` sheet'i vardır.
- 95 görev ilk DOM'a topluca render edilmez; görev formu ayrı akıştır.
- Program mobil kart/desktop tablo davranışına sahiptir.
- WCAG 2.2 AA, klavye ve 44 × 44 ürün standardı ana akışlarda doğrulanmıştır.
- Her dikey dilim bağımsız test ve rollback kanıtına sahiptir.

## 19. Kaynak kapsam matrisi

| Kaynak gereksinim | Uygulayan plan/görev | Doğrulama |
|---|---|---|
| SEC-01 secret exposure | P00.1–P00.3 | Eski credential reddi, tracked/history taraması |
| SEC-02/03 session ve parola | P02.1 | Session/password unit + integration testleri |
| SEC-04/05/06 yetkisiz API | P02.2–P02.3 | Oturumsuz, yanlış rol ve yanlış bölüm testleri |
| SEC-07 bölüm izolasyonu | P02.2 | Rol × bölüm matris testi |
| SEC-08 rate limit | P02.3, P08.3 | Login/AI rate-limit integration ve E2E |
| DATA-01/02 transaction ve yarış | P03.1 | Çift onay/idempotency integration testi |
| DATA-03 dönem modeli | P03.3 | Açık/kapalı dönem ve carry-over testleri |
| DATA-04 schema constraint | P03.2 | Staging migration ve duplicate constraint testi |
| DATA-05 kalıcı silme | P03.1/P03.3 | Soft-delete/audit davranış testi |
| IMP-01 parser | P04.1 | Gerçek XLSX, quoted CSV, Turkish date fixture'ları |
| IMP-02 preview/rollback | P04.2 | No-write preview, duplicate ve rollback testleri |
| ENG-01 type bypass | P01.2 | `bun x tsc --noEmit`, build output kontrolü |
| ENG-02 DB push deploy | P01.3 | Migration rehearsal; build sırasında DB yazımı yok |
| ENG-03 test eksikliği | P01.1 | `bun test` kalite kapısı |
| ENG-04 dependency riski | P08.2 | Direct/dev/exploitable sınıflandırması |
| ARCH-01 büyük page | P05–P07 | Route/feature dikey geçişleri |
| ARCH-02 ortak API sözleşmesi | P02.2/P02.3/P06.2 | Standard error/DTO/schema testleri |
| UI spec 5 bilgi mimarisi | P05.2–P05.3 | Role-aware nav ve route E2E |
| UI spec 6 dashboard | P06.1 | İki rol dashboard component/E2E |
| UI spec 7 görevler | P06.2–P06.3 | Pagination, form, responsive testleri |
| UI spec 8 takvim | P07.1 | Desktop table/mobile card testleri |
| UI spec 9 görsel sistem | P05.1 | Token/theme/status component testleri |
| UI spec 10 responsive | P05–P08 | Altı viewport regression suite |
| UI spec 11 yıkıcı işlemler | P03.3/P07.3 | Re-auth, typed confirm, audit E2E |
| UI spec 12 mimari | P05–P07 | Hedef route/feature sınırları |
| UI spec 13 hata durumları | P02.2/P05.3/P06.1 | Standard error ve UI state testleri |
| UI spec 14 erişilebilirlik | P05.2/P06.3/P08.1 | Axe, klavye, focus, 44 × 44 |
| UI spec 15 performans | P06.2/P06.3/P08.2 | DOM/list/cache ve production ölçümleri |
| UI spec 16 test stratejisi | P01/P08 | Unit/integration/component/E2E/visual |
| UI spec 17 uygulama sırası | P00–P08 | Program dependency gates |
| UI spec 18 dış göz riskleri | P05–P08 | Role-minimal nav, subviews, staged rollout |
| UI spec 19 kapsam dışı | Global constraints | Native app/mesajlaşma/analytics eklenmez |
| UI spec 20 başarı ölçütü | Ana kabul kriterleri | P08 release rehearsal |

Self-review sonucu iki kaynak belgedeki her ana gereksinim bir plan/görev ve doğrulama kanıtına bağlanmıştır.

## 20. İlk yürütme kararı

İlk uygulanacak alt plan **P00 — Olayı sınırlandırma ve repo hijyeni** olmalıdır. Bunun ilk adımı dış sistemde Neon credential rotation olduğu için kod değişikliğinden önce açık kullanıcı onayı ve erişim koordinasyonu gerekir.

P00 uygulanmadan P02–P08 production'a gönderilmez. Read-only test/plan hazırlığı yapılabilir; production credential, veri veya deploy durumu değiştirilmez.

---

Bu ana plan, sekiz alt planın bağımlılık ve teslim sözleşmesidir. Her alt plan uygulanmadan önce `writing-plans` ile kendi ayrıntılı TDD uygulama belgesine açılmalıdır; ana plan tek başına toplu kod değişikliği yetkisi vermez.
