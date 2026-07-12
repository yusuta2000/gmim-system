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
| [`logbook/TEMPLATE.md`](logbook/TEMPLATE.md) | Oturum kayıt şablonu | Hazırlanıyor | Anlamlı oturum kapanışında |
| [`decisions/TEMPLATE.md`](decisions/TEMPLATE.md) | ADR şablonu | Hazırlanıyor | Kalıcı teknik/operasyonel karar alınırken |
| [`runbooks/TEMPLATE.md`](runbooks/TEMPLATE.md) | Operasyon şablonu | Hazırlanıyor | Tekrarlanabilir işlem belgelenirken |
| [`STAGING_E2E.md`](testing/STAGING_E2E.md) | İzole rol test ortamı | Taşınacak | Staging rol testi öncesi |
| [`project memory design`](superpowers/specs/2026-07-12-project-memory-and-logbook-design.md) | Bu belge sisteminin onaylı tasarımı | Uygulandıktan sonra arşivlenecek | Tasarım gerekçesi gerektiğinde |
| [`project memory plan`](superpowers/plans/2026-07-12-project-memory-and-logbook.md) | Bu geçişin uygulama planı | Uygulanıyor | Geçiş tamamlanana kadar |
| [`rate-limit contract`](superpowers/specs/2026-07-12-rate-limit-release-contract.md) | Login/AI rate-limit kabul sözleşmesi | Aktif, bloke | Dayanıklı limiter tasarlanırken |

## Belge yaşam döngüsü

- `status/`: Değiştirilebilir tek güncel gerçek.
- `logbook/`: Anlamlı oturum başına append-only tarihsel kayıt.
- `decisions/`: Aktif veya superseded karar kayıtları.
- `runbooks/`: Dry-run, uygulama, doğrulama, rollback ve stop koşulları olan işlemler.
- `superpowers/specs/` ve `superpowers/plans/`: Tasarım ve uygulama niyeti; durum kanıtı değildir.
- `archive/`: Geçerliliğini kaybetmiş fakat tarihsel değeri bulunan belgeler.

