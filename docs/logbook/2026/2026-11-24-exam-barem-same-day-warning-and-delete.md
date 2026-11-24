# 2026-11-24 — Gözetmenlik baremi seçimi, aynı gün uyarısı, sınav silme ve Raporlar sayfası

## Context

Sinan COŞKUN (GMİM temsilcisi) üç sorun bildirdi: Takvim'den gözetmen atanınca barem fark etmeksizin 4 puan yazılıyor; aynı sınav hem Görevler'den hem Takvim'den girilince iki kez puan oluşuyor; Takvim'den eklenen sınav silinemiyor. Kodda üçü de doğrulandı (`supervision.ts` sıralamasız `findFirst({ name contains 'Gözetmenlik' })`, çift giriş kontrolü yok, `/api/exams`'ta `DELETE` yok).

## Objectives

- Gözetmenlik puanı sınavın gün/saatine uygun barem kategorisinden gelsin; temsilci birden çok seçenek görüp seçebilsin.
- Aynı gün ikinci/üçüncü sınav atamasında uyarı; aynı ders aynı gün tekrarında çift puan uyarısı.
- Takvim'den sınav silinebilsin; kimsenin kazanılmış puanı düşmesin.
- Geçmiş kayıtlar için salt okunur rapor; düzeltmeyi temsilci elle yapar.

## Starting state

- `main` `76f09a5`, `origin/main` ile eşit. Untracked `scripts/seed-duim.mjs`, `package-lock.json` korunuyor.

## Work completed

- `src/features/calendar/barem.ts` (db'siz saf yardımcılar): `examBaremOptions` sınavla ilgili ("sınav"/"gözetmen" geçen) aktif kategorileri öneri sırasıyla döner. Hafta sonu → "hafta sonu" kategorisi; hafta içi mesai sonrası (başlangıç ≥ 17:00) → "uzun" geçen kategori (kullanıcı kararı: mesai sonrası = hafta içi uzun saatlik sınav), yoksa hafta içi/1 sınav kategorisi; "2 sınav" kategorileri listede ama öneri değil.
- `supervision.ts`: `addSupervisor` artık seçilen kategoriyle görev açar; `resolveExamCategory` (seçim yoksa en uygun öneri, ilk eşleşme değil); `sameDayExamDuties` kişinin o günkü reddedilmemiş sınav/gözetmenlik görevlerini ve aynı ders olup olmadığını bulur.
- `/api/exam-supervisors`: `categoryId` (geçersizse 400) ve `confirm`. Aynı gün görev varsa `confirm` olmadan 409 `CONFIRM_REQUIRED` ("bu günün N. sınavı" / aynı ders çift puan mesajı).
- `/api/supervisor-assign`: `categoryId`; aynı ders veya saat çakışan sınavı olan kişiyi otomatik seçmez; başka sınavı olanları mesajda belirtir.
- `/api/exams`: GET her sınava mevcut gözetmenlik görevlerinin `categoryId`'sini ekler (sonraki atama aynı baremi varsayar). Yeni `DELETE ?id=`: yönetici + bölüm kontrolü; `assigned` bağlı görevler silinir ve kişiye bildirim; `approved` görevler ve puanları korunur; `ExamSupervisor` ve sınav silinir.
- Takvim ekranı: gözetmen atama alanında "Puan baremi" seçimi (önerilenler işaretli), aynı gün onay penceresi ("Yine de ata"), "Sınavı sil" butonu ve korunacak/silinecek görev sayılı onay penceresi. Yardım metni güncellendi.
- `scripts/report-exam-supervision.mjs`: salt okunur Markdown rapor (olası çift kayıt, aynı gün çoklu sınav, barem önerisinden farklı puanlı takvim görevleri).

## Why these choices were made

- Barem sınav tablosuna sütun olarak eklenmedi: prod migration ve DB erişimi gerektirirdi. Seçim atama anında yapılır, görevin `categoryId`'sinde saklanır, sonraki atamalarda varsayılan olur.
- Barem önerisi kategori adlarındaki anahtar kelimelerle yapılır; prod kategori adları bu oturumda görülemedi, temsilci her zaman değiştirebilir.
- Aynı gün iki sınav normal kabul edildi (kullanıcı): engel değil onay. Aynı ders aynı gün güçlü uyarı.
- Sınav silmede kabul edilmiş puanlar korunur; puan düşürmek bilinçli olarak Görevler'den görev silmekle yapılır.
- Geçmiş verilere otomatik dokunulmadı (kullanıcı kararı).

## How it was implemented

- Testler: `src/features/calendar/barem.test.ts` (5), `exam-schedule-routes.test.ts` +8 (seçilen barem puanı, hafta sonu önerisi, geçersiz barem, aynı gün onayı, aynı ders uyarısı, otomatik atamada atlama, silmede bekleyen/kabul ayrımı, silme yetkisi).

## Verification and evidence

- `vitest` 40 dosya / 206 test, `tsc --noEmit`, hedefli `eslint`, `next build` geçti.
- Rapor betiği `node --check` ve `barem.ts` importu Node 26 ile doğrulandı; prod'a karşı çalıştırılmadı (`.env.local` yok).
- Arayüz tarayıcıda görülmedi.

## Data, security, and environment impact

- Şema/secret değişikliği yok; production veri yazımı yok.
- Davranış: yeni gözetmenliklerde puan seçilen baremden; sınav silinebilir.

## Commits and deployments

- `600d80d` feat(calendar): barem choice for supervision, same-day warning, exam delete
- `0116224` feat(reports): manager reports page with changelog and supervision check list
- Kullanıcı onayıyla `main`e push edildi; production'da `/api/reports/exam-supervision` oturumsuz istekte 404 → 401 döndü (deploy canlı). Arayüz gerçek hesapla tarayıcıda denenmedi.
- `scripts/report-exam-supervision.mjs` commit edilmedi (portal sayfasıyla aynı işi yapıyor; silinip silinmeyeceği kullanıcıda).

## Decisions created or superseded

- Yeni ADR yok. "Mesai sonrası hafta içi sınav = hafta içi uzun saatlik sınav baremi" kullanıcı kararı.

## Remaining work and explicit blockers

- Prod barem listesinde "hafta içi uzun saatlik sınav" kategorisi yoksa Barem ekranından eklenmeli (kod gerekmez); yoksa mesai sonrası sınavlarda hafta içi kategorisi önerilir.
- Rapor prod'da çalıştırılıp Sinan'a verilecek; düzeltmeleri Sinan Görevler ekranından elle yapacak.
- ATA sınavı (3–4 Aralık, 18:00) için mevcut bekleyen görevler eski kuralla 4 puanlı açılmış olabilir; raporda görünür.

## Instructions for the next session

- Barem öneri kuralları tek yerde: `src/features/calendar/barem.ts`; rapor betiği de bunu kullanır.

## Addenda

### Prod barem adları ve Raporlar sayfası (aynı gün)

- Kullanıcı prod "Puan Baremleri" ekranını paylaştı: sınav kalemleri "Maslak haftaiçi/haftasonu 1 sınav", "Tuzla haftaiçi 1 sınav" (1), "(havuz dersleri)" (2), "(mesai dışı)" (2), "Tuzla haftaiçi (Yeterlik sınavı)" (4), "Tuzla haftasonu 1 sınav" (2) ve "(havuz dersleri)" (3). Görülen kısımda "Gözetmenlik" adlı kalem yok; eski kod bulamayınca sabit 4 yazıyordu, yani geçmişte baremden fazla puan yazılmış olabilir.
- `barem.ts` öneri kuralları bu adlara göre yeniden yazıldı (kullanıcı kararları): yer varsayılan Tuzla, sınıf/not/ders adında "Maslak" varsa Maslak; mesai dışı = hafta içi 08:30 öncesi veya 17:00 ve sonrası başlangıç (önceki "uzun saatlik" kararının yerini aldı; "uzun" kelimesi hâlâ mesai dışı sayılır); havuz = MAT/FIZ/KIM/TUR kodları veya matematik/fizik/kimya/Türkçe adları; "yeterlik" → Yeterlik kalemi.
- Yeni Raporlar sayfası `/management/reports` (yöneticiler: admin/başkan/dekan, iki bölüm): "Değişiklikler" sekmesi `src/features/reports/changelog.ts`'den; "Gözetmenlik kontrol listesi" `/api/reports/exam-supervision` (salt okunur, bölüm kontrolü) ve `buildExamSupervisionReport`. Kontrol listesi portalda olduğu için `.env.local` engeli kalktı.
- CLAUDE.md ≡ AGENTS.md Kapanış adımına changelog kaydı kuralı eklendi.
- `scripts/report-exam-supervision.mjs` artık portal sayfasıyla aynı işi yapıyor (kendi gruplama kodu var); kaldırılıp kaldırılmayacağı kullanıcıya soruldu.
- Doğrulama: `vitest` 42 dosya / 213 test, `tsc --noEmit`, hedefli `eslint` geçti; build sonucu aşağıda.

### Havuz dersine ATA ve sade dil (aynı gün)

- Kullanıcı kararı: Atatürk İlkeleri (ATA) da havuz dersi; `barem.ts` havuz listesine eklendi. Mesai dışı başlayan havuz sınavında iki kalem (havuz / mesai dışı, ikisi de 2 puan) önerilen olarak işaretlenir.
- Kullanıcı kararı: Raporlar metinleri günlük dille, kod/teknik terim olmadan. Değişiklik günlüğü yeniden yazıldı; kontrol listesinden görev numarası kaldırıldı, ders kodu yerine ders adı gösteriliyor. CLAUDE.md ≡ AGENTS.md changelog kuralına sade dil şartı eklendi.
- Doğrulama: `vitest` 214 test, `tsc --noEmit`, hedefli `eslint`, doküman kontrolü geçti.
