# Güncel Proje Durumu

**Son doğrulanan tarih:** 2026-07-13

**Son doğrulanan uygulama commit'i:** `3546c8f`

Bu dosya projenin tek güncel durum panosudur. Logbook ve archive kayıtları tarihsel kanıttır; aktif iş listesi değildir.

## Ortamlar

- Production: `https://itudfportal.vercel.app`
- İzole staging: `https://itudfportal-staging.vercel.app`
- Staging ayrı Neon branch ve ayrı Vercel projesi kullanır.
- Production üzerinde E2E hesabı veya test verisi oluşturulmaz.

## Tamamlanan ana yetenekler

- GMİM/DUİM bölüm izolasyonu ve `user`, `admin`, `baskan`, `dekan` rol yetkilendirmesi.
- HttpOnly session ve Argon2 password hash temeli.
- Görev, puan, onay, dönem, içe aktarma, sınav, program, duyuru ve personel akışları.
- Responsive AppShell, dashboard, tasks, points, calendar ve yönetim rotaları.
- Mobil dashboard/görev taşma düzeltmeleri.
- İzole staging üzerinde yedi rol/bölüm hesabı ve tekrar kullanılabilir hesap reset aracı.
- İnsan ve AI için canonical README/index/current/logbook/ADR/runbook proje hafızası ve executable doküman doğrulaması.
- Generated/upload/local DB/tool artifactlerinin Git'ten çıkarılıp ignored yerel klasörlerde korunması.
- Tracked teknik doküman ve kullanım kılavuzu üreticilerinden gerçek/default credential değerlerinin kaldırılması.
- Ana takip Excel'inden bölüme özel tam görev/puan yeniden-eşitlemesi: `scripts/sync-gmim-from-excel.mjs` (dry-run/yedekli) ve portal `/api/sync-workbook` + import ekranı kartı.

## Son doğrulama kanıtı

- `bun run docs:check`: 0 hata.
- `bun run test`: 36 test dosyası, 172 test geçti.
- `bun run typecheck`: geçti.
- `bun run lint`: geçti.
- `bun run build`: Next.js 16.2.10 ile 43 rota üretildi.
- Chrome staging: yedi hesabın girişi, bölüm sınırları ve dekan geçişi geçti.
- Chrome staging: dashboard/tasks 320, 375, 390, 768, 1024 ve 1440 px genişliklerde yatay taşma üretmedi.
- Chrome staging: 2 puanlık görev oluşturma → temsilci onayı → puan yansıması geçti.

## Açık kapılar

- Workbook senkron prod'a deploy edildi; kalan: gerçek hesapla UI'da önizleme→commit tam dumanı ve DUİM için ilk senkron.
- Portal senkron ucuna (script'teki gibi) DB-tarafı yedek/rollback eklenmesi değerlendirmesi.
- Kullanılmayan eski `/api/import-excel` uç + flat parser/servisinin tamamen kaldırılması (şimdilik UI'dan koparıldı).
- Keyboard-only focus, dialog ve live-region derin testi.
- Production Core Web Vitals ölçümü için uygun DevTools aracı.
- Login/AI rate limiting için onaylı dayanıklı ortak store.
- Eski tracked giriş bilgilerinin dış sistemlerde rotation/revocation doğrulaması.
- Neon production credential rotation, eski credential reddi ve erişim log incelemesi.
- Dönem/constraint/import migration için backup-derived anonim staging provası ve ayrı production-write onayı.
- Production deploy sonrası gerçek hesapla altı viewport tekrar kontrolü.

## Çalışma sınırları

- Specs/plans tamamlanmış işin kanıtı değildir.
- 2026-07-13'te kontrollü bir production veri yazımı yapıldı (GMİM görev/puan yeniden-eşitleme, yalnız GMİM `Task`); ayrıntı ve kanıt logbook'ta. DUİM, kişiler ve şifreler değişmedi.
- Bilinmeyen untracked kullanıcı dosyası sınıflandırılmadan silinmez.
- Credential değeri dokümana, terminal çıktısına, sohbete veya commit'e yazılmaz.
- Repository current tree içindeki gerçek giriş/database connection değerleri temizlenmiştir; Git geçmişi ve dış rotation ayrı kapıdır.

## İlgili kanıt ve prosedürler

- GMİM workbook senkron ve yeniden-eşitleme: [`2026-07-13-workbook-sync-and-gmim-resync.md`](../logbook/2026/2026-07-13-workbook-sync-and-gmim-resync.md)
- Program closeout/staging kanıtı: [`2026-07-12-portal-program-closeout-and-staging.md`](../logbook/2026/2026-07-12-portal-program-closeout-and-staging.md)
- Dependency audit: [`2026-07-12-dependency-audit.md`](../logbook/2026/2026-07-12-dependency-audit.md)
- Repository/dokümantasyon geçişi: [`2026-07-12-repository-documentation-cleanup.md`](../logbook/2026/2026-07-12-repository-documentation-cleanup.md)
- Staging runbook: [`staging-e2e.md`](../runbooks/staging-e2e.md)
- Onaylı proje hafızası tasarımı: [`2026-07-12-project-memory-and-logbook-design.md`](../archive/completed-work/2026-07-12-project-memory-and-logbook-design.md)
- Tamamlanmış uygulama planı: [`2026-07-12-project-memory-and-logbook.md`](../archive/completed-work/2026-07-12-project-memory-and-logbook.md)
