---
target: canlı doğrulanmış tasarım+mobil (normal+admin)
total_score: 25
p0_count: 1
p1_count: 5
timestamp: 2026-07-11T09-17-44Z
slug: src-app-page-tsx
---
# Tasarım İncelemesi (Doğrulanmış) — İTÜ DF Ar.Gör Portalı

Yöntem: dual-agent kod incelemesi + canlı authenticated tarayıcı testi (375px mobil + masaüstü, iki rol: nacar16 normal / ymutlu Temsilci). Skill'ler: impeccable + fable-mode + ui-ux-pro-max.

## Skorlar
- Tasarım (Nielsen 10): 25/40 — çözülmüş ama pürüzlü
- Teknik (Audit 5 boyut): 8/20 — Zayıf
- Anti-pattern kapısı: FAIL (4× yasaklı border-l-4 yan-şerit, canlıda doğrulandı)

## Canlıda gözlemle DOĞRULANAN bulgular
- Header "GMİM/Ar.Gör/Yönetim" 375px'te 3 satıra bölünüyor — normal + admin, her ekran (satır 722, flex-wrap yok). ui-ux: truncation-strategy, content-priority.
- 9 sekme (admin) / 7 sekme (normal) yatay kaydırma; sağa kaydırınca aktif sekme ekran dışına çıkıyor (satır 819). ui-ux: nav-state-active, overflow-menu, adaptive-navigation.
- Haftalık program tablosu mobilde "Ders" sütununu tümüyle kesiyor, "Saat" kırpık, kart içi yatay scroll (satır 1451). ui-ux: horizontal-scroll, data-table.
- Yasaklı border-l-4 yan-şeritler canlı görünür (Personel yönetim kartları: Özcan violet, Burak mavi). Anti-pattern mutlak yasak.
- "Dönem Yönetimi" (tüm puanları sıfırlama girişi) indirme butonlarıyla aynı sırada, görsel ayrılmamış. ui-ux: destructive-emphasis, destructive-nav-separation.
- "İçe Aktar" butonu açık turuncu üstünde beyaz metin ~2.7:1 kontrast. ui-ux: color-accessible-pairs.
- Sıralama akordeonu <div onClick> (915), klavye/ekran-okuyucu erişilemez. ui-ux: keyboard-nav.

## İyi olanlar (doğrulandı)
- Login ekranı mobilde temiz (tek sütun, net etiketler, tam-genişlik buton).
- Personel = kart listesi (tablo değil), mobilde tek sütun iyi.
- Veri Aktar formu temiz + CSV rehberi.
- Boş durumlar (Duyurular megafon + rehber metin) örnek nitelikte.
- Domain: çift onaylı iş akışı (269-291), adalet-öncelikli sıralama (923/1033), çakışma tespiti (351-354).

## Çürütülen hipotez (dürüstlük)
- "Sıralama çubukları orantısız" YANLIŞ — kod (927) value=(totalPoints/maxPoints)*100 düzgün orantılı. Ekran-görüntüsü yanılgısı; bulgudan çıkarıldı.

## Öncelik sırası (mobil ağırlıklı)
1. [P0] Onaysız yıkıcı işlemler canlı veride: dönem sıfırlama (tüm puanlar→0) + görev silme (1294) onay/undo yok; duyuru silme (561) confirm soruyor — tutarsız. ui-ux: confirmation-dialogs, undo-support.
2. [P1] Mobil header 3-satır kırılması (722). Fix: flex-wrap + başlık truncate + alt-başlık hidden sm:block.
3. [P1] 9-sekme navigasyonu yatay kayıyor, aktif sekme kayboluyor (819). Fix: mobilde alt tab-bar/overflow menü + aktif sekmeye scrollIntoView.
4. [P1] Erişilebilirlik: aria-label yok (798/751/1074/1294), htmlFor/id yok, kontrast AA altı (slate-400 ~2.6:1), dokunma hedefi 20px (1648)/32px header.
5. [P1] Token bypass + dark mode ölü (0 dark:, toggle yok) — de-slop kök nedeni.
6. [P2] border-l-4 yan-şerit 4 yerde (1137/1144/1179/1582); grid-cols-2 breakpoint'siz formlar (876/1369/1423/1429); native confirm/prompt (466/501/561); program tablosu sütun kırpma.

## Persona
Casey (mobil): 3-satır header, 32px ikonlar, onaysız silme. Jordan: 9 sekme, öğrenilemez renk semantiği, jenerik hata. Sam: div-onClick akordeon klavyeyle erişilemez, focus ring yok.

## Yapılmayan
Hiçbir yıkıcı işlem (sıfırlama/silme/onay) tetiklenmedi; sadece görünüm incelendi. Kod değiştirilmedi.
