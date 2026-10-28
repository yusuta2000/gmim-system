# Güncel Proje Durumu

**Son doğrulanan tarih:** 2026-10-28

**Son doğrulanan uygulama commit'i:** `a7df254`

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
- Yöneticiler (temsilci/başkan/dekan) kendilerine atanan görevi Görevler ekranından kabul/ret edebilir.
- E-posta bildirimleri (Gmail SMTP, `src/lib/email.ts`): görev ataması ve gözetmenlik → atanan kişi; kabul/ret ve onay bekleyen görev → bölüm temsilcileri; görev onayı → görev sahibi; duyuru → bölümün tüm aktif ar.gör/temsilcileri (BCC). İşlemi yapan dahil; başkan/dekan mail almaz. Başarılı gönderim Vercel Logs'ta `E-posta gönderildi`. Ayar yalnız production Vercel projesinde (`GMAIL_USER`, `GMAIL_APP_PASSWORD`); staging mail atmaz.
- Yurtdışı Telafisi (`/management/absence`): dönen kişiye, aralıkta tüm süre bulunanlardan en az puan alanın puanı temsilci onayıyla eklenir.
- Puanı temsilci belirlesin: ar.gör puansız kayıt bildirebilir; Onaylar ekranında temsilci puanı girer/düzeltir ve onaylar.

## Son doğrulama kanıtı

- 2026-10-28: `vitest` 38 dosya / 184 test, `tsc`, `next build` geçti; dört commit Vercel production ve staging'de deploy edildi.
- 2026-10-21: `vitest` 37 dosya / 171 test, `tsc`, `next build`, docs doğrulaması geçti; production'da test görevi maili İTÜ adresine ulaştı.
- `bun run docs:check`: 0 hata.
- `bun run test`: 36 test dosyası, 172 test geçti.
- `bun run typecheck`: geçti.
- `bun run lint`: geçti.
- `bun run build`: Next.js 16.2.10 ile 43 rota üretildi.
- Chrome staging: yedi hesabın girişi, bölüm sınırları ve dekan geçişi geçti.
- Chrome staging: dashboard/tasks 320, 375, 390, 768, 1024 ve 1440 px genişliklerde yatay taşma üretmedi.
- Chrome staging: 2 puanlık görev oluşturma → temsilci onayı → puan yansıması geçti.

## Açık kapılar

- Portal mailleri İTÜ filtresinde Junk'a düşüyor: kullanıcı bazında güvenilir gönderen veya İTÜ BİDB whitelist.
- Telafi aracı, araç öncesi elle eklenen telafileri tanımaz (Tarık 13.07–09.10.2026 için tekrar "ekle" yapılmamalı).
- Temsilcinin kendi bildirdiği görevi onaylaması engellenmiyor; kural kararı bekliyor.
- `SISTEM_DOKUMANTASYONU.md` Bölüm 10 güvenlik açıkları listesi eskimiş (Argon2/session/auth tamamlandı); güncellenmeli.
- Workbook senkron prod'a deploy edildi; kalan: gerçek hesapla UI'da önizleme→commit tam dumanı ve DUİM için ilk senkron.
- Portal senkron ucuna (script'teki gibi) DB-tarafı yedek/rollback eklenmesi değerlendirmesi.
- (Tamamlandı) Kullanılmayan eski `/api/import-excel` uç + flat parser/servis/testleri tamamen kaldırıldı; Prisma `ImportBatch`/`ImportLog` modelleri reset-period audit'i kullandığı için korundu.
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

- Yurtdışı telafisi, puanı temsilcinin belirlemesi ve mail akışları: [`2026-10-28-absence-compensation-and-mail-flows.md`](../logbook/2026/2026-10-28-absence-compensation-and-mail-flows.md)
- Yönetici görev yanıtı ve e-posta bildirimleri: [`2026-10-21-manager-task-response-and-email-notifications.md`](../logbook/2026/2026-10-21-manager-task-response-and-email-notifications.md)
- GMİM workbook senkron ve yeniden-eşitleme: [`2026-07-13-workbook-sync-and-gmim-resync.md`](../logbook/2026/2026-07-13-workbook-sync-and-gmim-resync.md)
- Program closeout/staging kanıtı: [`2026-07-12-portal-program-closeout-and-staging.md`](../logbook/2026/2026-07-12-portal-program-closeout-and-staging.md)
- Dependency audit: [`2026-07-12-dependency-audit.md`](../logbook/2026/2026-07-12-dependency-audit.md)
- Repository/dokümantasyon geçişi: [`2026-07-12-repository-documentation-cleanup.md`](../logbook/2026/2026-07-12-repository-documentation-cleanup.md)
- Staging runbook: [`staging-e2e.md`](../runbooks/staging-e2e.md)
- Onaylı proje hafızası tasarımı: [`2026-07-12-project-memory-and-logbook-design.md`](../archive/completed-work/2026-07-12-project-memory-and-logbook-design.md)
- Tamamlanmış uygulama planı: [`2026-07-12-project-memory-and-logbook.md`](../archive/completed-work/2026-07-12-project-memory-and-logbook.md)
