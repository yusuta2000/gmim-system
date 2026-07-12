---
target: site tasarımı + mobil (page.tsx)
total_score: 25
p0_count: 1
p1_count: 4
timestamp: 2026-07-11T09-06-16Z
slug: src-app-page-tsx
---
# Tasarım İncelemesi — İTÜ DF Ar.Gör Portalı (src/app/page.tsx)

Method: dual-agent · Canlı test: masaüstü + 375px mobil

## Skorlar
- Tasarım (Nielsen 10): 25/40 — çözülmüş ama pürüzlü
- Teknik (Audit 5 boyut): 8/20 — Zayıf
- Anti-pattern kapısı: FAIL (4× yasaklı border-l-4 yan-şerit)

Audit boyutları: Erişilebilirlik 1/4 · Performans 2/4 · Responsive 2/4 · Theming 1/4 · Anti-pattern 2/4

## Anti-pattern kararı
Kısmen AI-slop. Tam OKLCH token seti + .dark teması tanımlı ama page.tsx hiç kullanmıyor — her renk hard-coded emerald/sky/violet/amber/slate. 7 renk semantik sözleşme olmadan dekoratif. Dekoratif gradientler, büyük-sayı stat kutucukları, yan-şeritler.
Detector: 8 uyarıdan 2'si false-positive (781/919 ternary dal karışması). Tablo shadcn Table içinde overflow-x-auto sarıyor (sayfa taşması yok). Promise.all paralel (waterfall yok).

## İyi olanlar
1. Gerçek domain modellemesi (çift onaylı iş akışı, 269-291)
2. Sınav/program çakışma tespiti (351-354)
3. Adalet birinci sınıf (en-az-puan-önce sıralama, 923/1033)
4. Gerçek landmark'lar, min-w-0+truncate, mobil etiket takası (834)

## Öncelikli sorunlar
[P0] Yıkıcı işlemlerde onay/undo yok — canlı veri. Dönem sıfırlama (881) herkesin puanını tek tıkla 0 yapıyor; görev silme (1294) onaysız. Duyuru silme (561) confirm soruyor — tutarsız.
[P1] Mobil header 3 satıra bölünüyor (722, flex-wrap yok) + 9-sekme yatay kaydırma affordance yok (819).
[P1] Erişilebilirlik: ikon butonlarda aria-label yok (798/751/1074/1294), htmlFor/id eşleşmesi yok, kontrast AA altı (slate-400 ~2.6:1), dokunma hedefi 20px (1648).
[P1] Token bypass + dark mode ölü (0 dark:, toggle yok). Bölüm teması ~8 ternary tekrarı.
[P2] 9 sekme cognitive limit üstü; border-l-4 yan-şerit 4 yerde (1137/1144/1179/1582); native confirm/prompt (466/501/561); 4× breakpoint'siz grid-cols-2 (876/1369/1423/1429); her işlemde 8-uç tam refetch.

## Persona
Casey (mobil): 3-satır header, 32px ikonlar, onaysız silme. Jordan: 9 sekme, öğrenilemez renk, jenerik hata. Sam: div onClick akordeon (915) klavyeyle erişilemez, focus ring yok.

## Küçük notlar
Manuel puan override guardrail yok (1376); v3.1 3 yerde hard-coded; SVG donut hex bypass (985).
