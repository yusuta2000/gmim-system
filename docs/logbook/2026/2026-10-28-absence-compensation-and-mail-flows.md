# 2026-10-28 — Yurtdışı telafisi, puanı temsilcinin belirlemesi ve mail akışları

## Context

2026-10-21 kaydının devamı. Y.Tarık MUTLU'nun yurtdışı dönüşünde "o sürede en az puan alan ar.görün puanı" elle eklenmişti (Begüm, 30 puan, 13.07–09.10.2026); bunun sitede hesaplanması istendi. Ardından ar.gör WhatsApp grubundaki geri bildirimler (duyurular maile gelmiyor, puan verilince mail gelmiyor, Görev ata / Kayıt bildir karışıyor) ve "net tanımlı olmayan işte puanı temsilci belirlesin" talebi geldi.

## Objectives

- Yurtdışı dönüş telafisini hesaplayan, temsilci onaylı bir araç.
- Duyuru, puan onayı ve onay bekleyen görev için e-posta.
- Ar.görün puansız kayıt bildirip puanı onaylayan temsilciye bırakabilmesi.

## Starting state

- `main` `44f6fb8`, çalışma ağacı temiz (yerel untracked `scripts/seed-duim.mjs`, `package-lock.json` korunuyor).
- Mail altyapısı 2026-10-21'de eklenmişti (`src/lib/email.ts`, yalnız production'da `GMAIL_*`).

## Work completed

- **Yurtdışı Telafisi** (`/management/absence`, `/api/absence-compensation`, `features/tasks/server/absence-compensation.ts`): kişi + gidiş/dönüş tarihi → bölümdeki diğer aktif ar.gör/temsilcilerin aralıktaki onaylı görev puanı toplamları (gözetmenlik dahil, önceki telafi görevleri hariç) → en düşük. Aralık içinde sisteme eklenen ve bu araçla kaydı olup aralığı çakışan (kendisi de yurtdışında olan) kişiler varsayılan olarak dışarıda; temsilci işaretleri elle değiştirebilir. Onay, `source = absence_compensation` olan onaylı görev ekler, notlara `[YURTDISI] YYYY-MM-DD..YYYY-MM-DD` yazar; çakışan aralık ikinci kez eklenemez, önizlemeden sonra puan değiştiyse 409.
- **Mail kuralları:** duyuru → bölümün tüm aktif ar.gör/temsilcileri (yazan dahil, BCC); görev onayı → görev sahibi (kendi onayı dahil); kabul/ret → bölüm temsilcileri (yanıtlayan dahil); onay bekleyen görev → bölüm temsilcileri. Başkan/dekan hiçbir mail almaz. Başarılı gönderimler Vercel Logs'a `E-posta gönderildi: kime · konu` olarak yazılır.
- **Puanı temsilci belirlesin:** görev formunda Kayıt bildir için kutu (puan/kategori kapanır, 0 puanla gider). Onaylar ekranında her görevde düzenlenebilir puan kutusu; 0 puan + kategorisiz kayıtta "Puanı siz belirleyin", puan girilmeden onaylanamaz. `approve-task` isteğe bağlı `points` (0–1000 tam sayı) kabul eder.
- Görev formunda Görev ata / Kayıt bildir açıklamaları.

## Why these choices were made

- Telafi: tam otomatik (yurtdışı kaydı + zamanlanmış iş) yerine "hesapla + temsilci onayı" seçildi; şema değişikliği yok, karar insanda kalır.
- Yurtdışı aralığı ayrı tablo yerine telafi görevinin notundaki işaretten okunur (mevcut `[RET_SEBEBI]` deseni gibi).
- "Puanı belirlenecek" ayrı alan yerine 0 puan + kategorisiz olarak çıkarılır; şema değişikliği gerektirmez.
- Mail alıcılarında işlemi yapanın dahil edilmesi kullanıcı talebi.

## How it was implemented

- Mail gönderimleri transaction dışında; hata isteği bozmaz.
- Yeni menü öğesi `absence` (Plane ikonu), yalnız yöneticilere görünür.

## Verification and evidence

- Her davranış için önce başarısız test yazıldı: `absence-compensation.test.ts` (7), `task-routes.test.ts`, `announcement-notification-routes.test.ts`, `email.test.ts` eklemeleri.
- Son durumda `vitest` 38 dosya / 184 test, `tsc --noEmit`, hedefli `eslint`, `next build` geçti.
- Her commit için Vercel production (`my-project`) ve staging durumları GitHub API'de "Deployment has completed".
- Ekranlar tarayıcıda Claude tarafından görülmedi (yerelde DB bağlantısı yok); canlı kullanım kontrolü kullanıcıya bırakıldı.

## Data, security, and environment impact

- Kod tarafından production veri yazımı yok; yeni araçlar yalnız kullanıcı arayüzünden veri yazar.
- Şema/migration değişikliği yok. Secret değişikliği yok.

## Commits and deployments

- `9ab9e15` feat(points): absence compensation for returning assistants
- `9eaac45` feat(notifications): mail announcements and task approvals
- `493ddfb` feat(approvals): let the reviewing temsilci set task points
- `a7df254` feat(notifications): mail temsilciler when a task awaits approval

## Decisions created or superseded

- Yeni ADR açılmadı. 2026-10-21'deki "işlemi yapana mail gitmez" kuralı kullanıcı talebiyle kaldırıldı.

## Remaining work and explicit blockers

- Telafi aracı, araç öncesi elle eklenen telafileri (ör. Tarık 13.07–09.10.2026) tanımaz; çakışan hesaplarda kişi elle işaretsiz yapılmalı. Bu aralık için "Telafi puanını ekle"ye basılmamalı (çift puan).
- "Aralık içinde eklendi" kontrolü `createdAt`'e bakar; DUİM kadrosu 2026-07'de toplu eklendiği için daha eski aralıklarda elle düzeltme gerekir.
- Temsilci kendi bildirdiği görevi onaylayıp puan girebilir; "kendi görevini onaylayamaz" kuralı önerildi, karar bekliyor.
- Begüm'ün 2026-10-26 kendine atadığı görevin maili ulaşmadı; `itudf1909@gmail.com` Gönderilmiş Postalar kontrolü kullanıcıda.
- Portal mailleri İTÜ filtresinde Junk'a düşebiliyor.

## Instructions for the next session

- Mail sorunu araştırırken önce Vercel Logs'ta `E-posta gönderildi` / `E-posta gönderilemedi` satırlarına bakın.
- Telafi görevlerini notlardaki `[YURTDISI]` işaretini bozmadan düzenleyin; çakışma kontrolü buna dayanır.

## Addenda
