# Dokümantasyon İndeksi

Bu dosya proje belgelerinin tek yönlendirme merkezidir. Bir belge burada aktif olarak kayıtlı değilse güncel proje gerçeği kabul edilmez.

## Zorunlu okuma sırası

1. [`README.md`](../README.md) — ürün ve güvenlik özeti.
2. [`docs/status/CURRENT.md`](status/CURRENT.md) — doğrulanmış güncel durum ve açık kapılar.
3. İstenen işlemle ilgili runbook.
4. `CURRENT.md` veya runbook tarafından bağlanan logbook, ADR, spec ya da plan.

Eski bir planın açık kutusu tamamlanmış işin yeniden yapılması için gerekçe değildir. Kod, test, Git geçmişi ve doğrudan ortam doğrulaması daha yüksek kanıttır.

## Aktif belgeler

| Belge | Amaç | Durum | Ne zaman okunur |
|---|---|---|---|
| [`README.md`](../README.md) | Projeye hızlı giriş | Aktif | Her yeni insan veya AI oturumu |
| [`CURRENT.md`](status/CURRENT.md) | Tek güncel durum panosu | Aktif | Her çalışma başlangıcı ve kapanışı |
| [`SISTEM_DOKUMANTASYONU.md`](../SISTEM_DOKUMANTASYONU.md) | Ayrıntılı teknik/işletim açıklaması | Aktif, ayrıştırılacak legacy belge | Sistem davranışı veya kurulum ayrıntısı gerektiğinde |
| [`architecture/README.md`](architecture/README.md) | Mimari belgelerin yönlendiricisi | Aktif | Kod alanı veya veri akışı incelenirken |
| [`logbook/TEMPLATE.md`](logbook/TEMPLATE.md) | Oturum kayıt şablonu | Aktif | Anlamlı oturum kapanışında |
| [`ADR-0001`](decisions/ADR-0001-project-memory-system.md) | Katmanlı proje hafızası kararı | Accepted | Belge sisteminin gerekçesi gerektiğinde |
| [`decisions/TEMPLATE.md`](decisions/TEMPLATE.md) | ADR şablonu | Aktif | Kalıcı teknik/operasyonel karar alınırken |
| [`runbooks/TEMPLATE.md`](runbooks/TEMPLATE.md) | Operasyon şablonu | Aktif | Tekrarlanabilir işlem belgelenirken |
| [`staging-e2e.md`](runbooks/staging-e2e.md) | İzole rol testi ve reset operasyonu | Aktif | Her staging rol/veri testi öncesi |
| [`portal closeout logbook`](logbook/2026/2026-07-12-portal-program-closeout-and-staging.md) | P00–P08, mobil ve staging tarihsel kanıtı | Append-only | Tamamlanan program işleri araştırılırken |
| [`dependency audit logbook`](logbook/2026/2026-07-12-dependency-audit.md) | Paket temizliği ve kalan risk sınıflandırması | Append-only | Dependency yükseltmesi/audit öncesi |
| [`repository cleanup logbook`](logbook/2026/2026-07-12-repository-documentation-cleanup.md) | Doküman/secret/artifact geçiş kanıtı | Append-only | Bu geçiş ve kök sınıflandırması araştırılırken |
| [`workbook sync logbook`](logbook/2026/2026-07-13-workbook-sync-and-gmim-resync.md) | GMİM Excel yeniden-eşitleme ve portal senkron özelliği kanıtı | Append-only | Excel→puan senkronu veya production veri yazımı araştırılırken |
| [`workbook sync plan`](superpowers/plans/2026-07-13-workbook-sync-feature.md) | Ana takip senkron özelliği uygulama planı | Aktif | Senkron özelliği değiştirilirken |
| [`project memory design`](archive/completed-work/2026-07-12-project-memory-and-logbook-design.md) | Bu belge sisteminin onaylı tasarımı | Arşiv | Tasarım gerekçesi gerektiğinde |
| [`project memory plan`](archive/completed-work/2026-07-12-project-memory-and-logbook.md) | Tamamlanmış uygulama planı | Arşiv | Geçiş adımları araştırılırken |
| [`rate-limit contract`](superpowers/specs/2026-07-12-rate-limit-release-contract.md) | Login/AI rate-limit kabul sözleşmesi | Aktif, bloke | Dayanıklı limiter tasarlanırken |
| [`validate-project-docs.ts`](../scripts/validate-project-docs.ts) | Belge/secret/link invariant kontrolü | Aktif | Her anlamlı dokümantasyon değişikliği kapanışında |
| [`legacy logs`](archive/legacy-logs/ARCHIVE.md) | Eski biçimli tarihsel kayıtlar | Arşiv | Eski faz kanıtı gerektiğinde |
| [`completed work`](archive/completed-work/ARCHIVE.md) | Uygulanmış specs/plans | Arşiv | Tarihsel tasarım/plan gerektiğinde |
| [`legacy plans`](archive/legacy-plans/ARCHIVE.md) | Önceki untracked güvenlik/portal planları | Arşiv | Eski plan gerekçesi gerektiğinde |
| [`legacy analysis`](archive/legacy-analysis/ARCHIVE.md) | Teknik/UI analiz ve brainstorm çıktıları | Arşiv | Eski araştırma kanıtı gerektiğinde |

## Belge yaşam döngüsü

- `status/`: Değiştirilebilir tek güncel gerçek.
- `logbook/`: Anlamlı oturum başına append-only tarihsel kayıt.
- `decisions/`: Aktif veya superseded karar kayıtları.
- `runbooks/`: Dry-run, uygulama, doğrulama, rollback ve stop koşulları olan işlemler.
- `superpowers/specs/` ve `superpowers/plans/`: Tasarım ve uygulama niyeti; durum kanıtı değildir.
- `archive/`: Geçerliliğini kaybetmiş fakat tarihsel değeri bulunan belgeler.

## Doğrulama

```powershell
bun run docs:check
```

Komut rehber eşitliği, canonical dosyalar, index kayıtları, logbook başlıkları, archive metadata, Markdown bağlantıları, ignored local secret dosyaları ve yasak tracked credential/connection kalıplarını denetler. Hata değerini değil yalnız güvenli dosya/rule bilgisini gösterir.
