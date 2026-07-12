# ADR-0001 — Katmanlı proje hafızası

**Status:** Accepted

**Date:** 2026-07-12

## Context

Proje durumu planlar, tarihli loglar, teknik dokümantasyon ve oturum handoff'ları arasında dağılmıştı. Tamamlanmış işler eski plan kutuları nedeniyle açık görünebiliyor; yeni oturumlar güncel durum ile tarihsel kanıtı ayıramıyordu. Kökte README ve merkezi belge indeksi yoktu.

## Decision

İnsanlar ve AI oturumları için katmanlı proje hafızası kullanılacak:

- `README.md` hızlı giriş;
- `docs/INDEX.md` belge yönlendirmesi;
- `docs/status/CURRENT.md` tek güncel durum;
- `docs/logbook/` append-only tarihsel kanıt;
- `docs/decisions/` karar gerekçeleri;
- `docs/runbooks/` tekrarlanabilir operasyonlar;
- `docs/superpowers/specs/` ve `plans/` yalnız tasarım/uygulama niyeti;
- `docs/archive/` superseded tarihsel belgeler.

AI başlangıç ve kapanış protokolü byte-identical `AGENTS.md` ve `CLAUDE.md` içinde zorunlu olacak.

## Alternatives considered

### Tek büyüyen logbook

Başlangıçta basit fakat güncel durum, tarih ve kararlar yeniden birbirine karışır.

### Tam otomatik belge üretimi

Tutarlılık sağlayabilir fakat mevcut proje ölçeği için gereksiz bakım ve yanlış otomatik özet riski yaratır.

## Consequences

Yeni oturumların okuma sırası deterministik olur ve tamamlanmış işlerin yanlışlıkla tekrarı azalır. Her anlamlı oturum kapanışında logbook/status/index disiplini gerekir. Küçük doğrulama aracı yapısal sapmaları engeller; prose otomatik üretilmez.

## Migration impact

Legacy loglar sınıflandırılarak logbook veya archive altına taşınır. Staging rehberi runbook olur. Mevcut specs/plans durum kanıtı olmaktan çıkar. Tracked dokümanlardaki gerçek giriş bilgileri kaldırılır ve dış rotation kapısı kaydedilir.

## Evidence

- [`2026-07-12-project-memory-and-logbook-design.md`](../superpowers/specs/2026-07-12-project-memory-and-logbook-design.md)
- [`2026-07-12-project-memory-and-logbook.md`](../superpowers/plans/2026-07-12-project-memory-and-logbook.md)

