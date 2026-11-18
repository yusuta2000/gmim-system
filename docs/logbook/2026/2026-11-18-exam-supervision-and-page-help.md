# 2026-11-18 — Sınav ayrıntıları, kabul tabanlı gözetmenlik ve yönetici yardımı

## Context

Sinan COŞKUN ana sayfadaki "Gözetmen ataması eksik → Sınavları aç" butonunun 404 verdiğini bildirdi. İnceleme sırasında Takvim'de sınav ayrıntısının yalnız Ajanda görünümünde olduğu, MAT sınavı için elle "Görev ata" ile verilen gözetmenlik görevlerinin sınava bağlı olmadığı (sınav 0/4 görünüyor) ve otomatik gözetmen atamasının puanı kabul beklemeden eklediği görüldü. Yöneticiler için ekran bazlı kullanım yardımı da istendi.

## Objectives

- "Sınavları aç" 404'ünü gidermek.
- Takvimde sınava tıklayınca gözetmenleri ve yanıt durumlarını göstermek.
- Gözetmenlik puanını yalnız kişi kabul edince eklemek; reddedince sınavdan çıkarmak.
- Temsilcinin belirli kişiyi gözetmen ekleyebilmesi.
- Yöneticilere her ekranda "?" kullanım yardımı.

## Starting state

- `main` `ee6e52c`, çalışma ağacı temiz (yerel untracked `scripts/seed-duim.mjs`, `package-lock.json` korunuyor).
- Gözetmen bağlamanın tek yolu `/api/supervisor-assign`; görev `approved` ve puan anında ekleniyordu.

## Work completed

- `d643458`: dashboard öncelik kartı `/exams` (var olmayan sayfa) yerine `/calendar?domain=exams` açıyor. Diğer tüm iç linkler tarandı; kırık başka link yok.
- `7b0b218`:
  - `features/calendar/server/supervision.ts`: gözetmen ekleme = `ExamSupervisor` + `assigned` görev (notta `[SINAV] <examId>`), puan eklenmez, bildirim + mail.
  - `/api/supervisor-assign` bunu kullanır ve o sınavı reddetmiş kişileri seçmez. Yeni `/api/exam-supervisors` elle ekleme ucu (yönetici, aynı bölüm, aktif ar.gör/temsilci).
  - `/api/exams` her gözetmene `status` (`pending`/`accepted`) ve sınava `declined` listesi ekler; işaretsiz eski gözetmenlikler `accepted` sayılır.
  - İşaretli görev reddedilir veya silinirse `ExamSupervisor` kaydı silinir. `splitTaskNotes` işareti kullanıcıdan gizler.
  - Takvim: Ay/Hafta görünümünde sınavlar tıklanabilir, ayrıntı penceresi; durum rozetleri, reddedenler, "Gözetmen ekle".
- `118414d`: yöneticilerin üst çubuğunda "?" butonu; metinler `components/app-shell/page-help-content.ts`, test her yönetici menü sayfasının metni olduğunu denetler.

## Why these choices were made

- Gözetmen durumu için şema değişikliği yerine görev notundaki işaret seçildi (`[YURTDISI]` deseniyle aynı); migration/staging provası gerekmez.
- Mevcut sınav ve gözetmen verisine kullanıcı talebiyle dokunulmadı; MAT gibi eski kayıtlar arayüzden düzeltilecek.
- Yardım butonu sağ alt yerine üst çubukta: mobil alt menüyle çakışmaz.

## How it was implemented

- Her davranış için önce başarısız test yazıldı (`dashboard/route.test.ts`, `exam-schedule-routes.test.ts`, `task-routes.test.ts`, `task-notes.test.ts`, `page-help.test.ts`).

## Verification and evidence

- Son durumda `vitest` 39 dosya / 193 test, `tsc --noEmit`, hedefli `eslint`, `next build` geçti.
- Üç commit için Vercel production (`my-project`) ve staging GitHub API'de "Deployment has completed".
- Kullanıcı "Sınavları aç"ın Takvim'i açtığını doğruladı. Ayrıntı penceresi, kabul akışı ve yardım butonu Claude tarafından tarayıcıda görülmedi.

## Data, security, and environment impact

- Kod tarafından production veri yazımı yok; şema/secret değişikliği yok.
- Davranış değişikliği: yeni gözetmenliklerde puan kabulde eklenir.

## Commits and deployments

- `d643458` fix(dashboard): open exams in the calendar instead of a missing /exams page
- `7b0b218` feat(calendar): exam details and supervision that waits for acceptance
- `118414d` feat(ui): per-page "?" help for managers

## Decisions created or superseded

- Yeni ADR açılmadı. "Gözetmenlik puanı atamada eklenir" davranışı "kabulde eklenir" ile değişti.

## Remaining work and explicit blockers

- MAT sınavı: elle açılmış gözetmenlik görevleri temsilci tarafından silinip kişiler "Gözetmen ekle" ile yeniden eklenecek (kullanıcı kararı; kod yapmaz).
- Elle "Görev ata" ile açılan gözetmenlik görevleri sınava bağlanmaz; gözetmenlik yalnız Takvim'den atanmalı.
- Temsilcinin kendi bildirdiği görevi onaylaması hâlâ engellenmiyor.

## Instructions for the next session

- Gözetmenlik görevlerinin notundaki `[SINAV] <examId>` işaretini bozmayın; durum, ret ve silme bununla çalışır.
- Yeni yönetim sayfası eklerken `page-help-content.ts`'ye metin ekleyin; aksi halde `page-help.test.ts` başarısız olur.

## Addenda
