# 2026-07-13 — GMİM ana takip Excel senkronu ve portal özelliği

## Context

Yetkili, GMİM ana takip Excel'ini (`2. GMIM Araş. Gör. Görevlendirmeler 11.07.2026.xlsx`, 15 sayfa) portaldaki "Veri aktarımı → Önizle" ile yükleyemedi; önizleme sessizce başarısızdı. İnceleme, mevcut importer'ın çok-sayfalı ana takip dosyasını desteklemediğini ve bozuk başlık sütununda 500 verdiğini gösterdi. Sistem puanları bu Excel'in eski bir sürümünden kurulmuştu ve güncelin gerisindeydi.

## Objectives

- Önizleme neden çalışmıyor sorusunu kanıtla.
- GMİM görev/puanlarını güncel Excel ile tam yeniden-eşitle (yalnız GMİM `Task`).
- Bu işlemi tekrar edilebilir kıl: hem script hem de portal özelliği.

## Starting state

- Branch `main`, temiz çalışma ağacı; son commit `1c2b59b`.
- Production `https://itudfportal.vercel.app`, Neon DB; GMİM 738 görev / 1983 totalPoints.
- `scripts/import_excel.py`: eski, tehlikeli (bölüm filtresiz `DELETE`, düz metin `password`), çalıştırılmadı.

## Work completed

- Importer arızası kanıtlandı: gerçek dosya prod önizleme ucunda `HTTP 500 TypeError: ... reading 'includes'`.
- `scripts/sync-gmim-from-excel.mjs` (dry-run varsayılan, `--commit`, otomatik yedek) ile GMİM tam yeniden-eşitleme uygulandı.
- Paylaşılan sunucu modülü, `/api/sync-workbook` ucu ve import ekranına "Ana takip dosyası ile tam senkron" kartı eklendi.
- Mevcut importer'ın seyrek başlık sütununda çökmesi guard ile giderildi.

## Why these choices were made

- Built-in importer tek-sayfa düz tablo için; ana takip dosyası çok-sayfalı ve kişi-başı. Yeni, bölüme özel bir senkron yolu ayrı tutuldu.
- Tam yeniden-eşitleme, sistemin ilk kez de bu Excel'den kurulmuş olmasıyla tutarlı ve öngörülebilir; ek/diff yaklaşımının bulanık eşleştirme riskine yeğlendi (yetkili onayıyla).
- Sayfa→kişi eşleştirmesi normalize substring ile yapıldı; böylece "Berkehan İNAL" sayfası "Ö. Berkehan İnal" kaydına eşleşir ve mantık bölüme geneldir.

## How it was implemented

- `src/features/import-export/server/workbook-sync.ts`: `parseSheetTasks` (başlık tespiti, sayı/tarih/puan kuralı, boş tarihi kronolojik komşuya taşıma), `matchSheetsToAssistants`, `previewWorkbookSync`, `commitWorkbookSync` (transaction: bölüm görevlerini sil → `createMany` → `totalPoints` yeniden hesap; orphan koruması).
- `src/app/api/sync-workbook/route.ts`: `requireRole(['admin','dekan','baskan'])`, `assertDepartmentAccess`, preview `fileHash` + commit'te hash doğrulama (409).
- `src/features/management/import/import-screen.tsx`: uyarılı önizleme tablosu ve `department` etiketli "Senkronize et" düğmesi.
- `src/features/import-export/server/parser.ts`: `Array.from` ile yoğun satır + `indexOf` guard.
- Plan: [`workbook-sync-feature`](../../superpowers/plans/2026-07-13-workbook-sync-feature.md). Script: [`sync-gmim-from-excel.mjs`](../../../scripts/sync-gmim-from-excel.mjs).

## Verification and evidence

- `node node_modules/typescript/bin/tsc --noEmit`: hata yok.
- `npx vitest run`: 37 dosya / 175 test geçti (3 yeni workbook-sync testi dahil).
- `npx next build`: `/api/sync-workbook` dahil derlendi.
- Script commit sonrası canlı API: GMİM totalPoints Excel ile birebir (Begüm 390, Fatih 364, Y.Tarık 311, Merve 283, Samet 317, Sinan 284, Rukiye 237, Cenk 116; toplam 2468 / 787 görev).
- Yerel dev sunucusu (`:3007`) yeni uç önizlemesi: 787 görev / 2468 puan, 5 meta sayfa atlandı, orphan yok — script ile birebir.

## Data, security, and environment impact

- PRODUCTION VERİ YAZIMI YAPILDI: GMİM 738 görev silindi, 787 görev yüklendi, GMİM `totalPoints` yeniden hesaplandı. DUİM, kişiler, roller ve şifreler değişmedi.
- Silme öncesi mevcut GMİM görevleri yerel (repo dışı) yedek JSON'a döküldü.
- Terminale/dokümana secret veya connection değeri yazılmadı; `.env.local` yalnız script/dev tarafından okundu.
- Yeni özellik yalnız seçili bölümün `Task` verisine dokunur ve rol/bölüm ile korunur.

## Commits and deployments

- Kod, script, plan ve doküman değişiklikleri commit/push onayı bekliyor. Push, Vercel otomatik deploy tetikler.
- Production GMİM veri güncellemesi script commit'i ile zaten uygulanmış ve doğrulanmıştır (deploy gerektirmez).

## Decisions created or superseded

- Yeni ADR açılmadı. Eski `scripts/import_excel.py` yaklaşımı (bölüm filtresiz tam wipe + düz metin şifre) fiilen terk edildi; bölüme özel, kimlik/şifre dokunmayan senkron benimsendi.

## Remaining work and explicit blockers

- Yeni özellik prod'a deploy edilmedi; deploy sonrası gerçek hesapla UI önizleme/commit dumanı testi gerekir.
- Portal senkron ucunda (script'in aksine) DB-tarafı yedek yok; gerekirse ImportBatch tabanlı geri-al eklenebilir.
- Cenk KAYA'da Excel görev-satırı toplamı (116) dosyanın TOPLAM özetinden (113) 3 puan fazla; görev satırları esas alındı.

## Instructions for the next session

- GMİM yeniden-eşitleme doğrulandı; tekrar çalıştırma. Yeni güncelleme için Excel'i alıp portal kartından veya script'ten dry-run → onay → commit izle.
- DUİM için aynı akış: sayfa adları DUİM kişileriyle eşleşmeli; orphan uyarısı commit'i bloklar.

## Addenda

- 2026-07-13 (aynı oturum): Özellik prod'a deploy edildi (`/api/sync-workbook` canlı; prod önizleme 787 görev / 2468 puan doğrulandı). Ardından yetkili geri bildirimiyle import ekranındaki eski düz importer kartı UI'dan tamamen kaldırıldı; senkron tek görünür akış oldu. Senkron önizlemesine "sistemde hesabı olmayan kişi sayfası" (unmatchedPersonSheets) uyarısı eklendi. Eski `/api/import-excel` ucu backend'de kullanılmadan bırakıldı. Commit `3546c8f`. Tests 175 ✓, build ✓.
