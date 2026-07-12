# Staging E2E Hesapları Tasarımı

## Amaç

GMİM ve DUİM portalını `user`, `admin`, `baskan` ve fakülte geneli `dekan` rolleriyle tekrar tekrar test edebilmek; bunu üretim personeli, puanları, görevleri ve bildirimlerini kirletmeden yapmak.

## Mimari

- Neon production projesinde ayrı bir `e2e-staging` branch oluşturulur.
- Branch oluşturulduktan sonra kişisel ve operasyonel tablolar temizlenir; puan baremleri gibi kişisel olmayan referans verileri korunur.
- Yedi hesap oluşturulur: GMİM ve DUİM için üçer `user/admin/baskan`, iki bölümü de gören tek `dekan`.
- Aynı GitHub reposundan ayrı `itudfportal-staging` Vercel projesi deploy edilir ve yalnız staging Neon branch'ine bağlanır.
- Hesap parolaları Git'e girmez. `local-e2e-credentials.json` ve uygulanacak SQL `local-*` kuralıyla ignore edilir.
- Repo, hesap manifestini üreten dry-run varsayılanlı scripti ve kullanım kılavuzunu saklar.

## Hesap matrisi

| Kimlik | Rol | Bölüm |
|---|---|---|
| `e2e-user-gmim` | `user` | GMIM |
| `e2e-admin-gmim` | `admin` | GMIM |
| `e2e-baskan-gmim` | `baskan` | GMIM |
| `e2e-user-duim` | `user` | DUIM |
| `e2e-admin-duim` | `admin` | DUIM |
| `e2e-baskan-duim` | `baskan` | DUIM |
| `e2e-dekan` | `dekan` | GMIM varsayılanı; GMIM ve DUIM erişimi |

## Güvenlik ve veri sınırları

- Production bağlantısı veya production Vercel environment değişkeni değiştirilmez.
- Staging branch temizleme SQL'i yalnız branch adı ve hedef proje görsel olarak doğrulandıktan sonra uygulanır.
- Script parolaları terminale yazmaz ve mevcut credential dosyasını `--force` olmadan ezmez.
- Test hesapları gerçek e-posta adresi kullanmaz; `.test` alan adı üzerinden e-posta gönderimi oluşmaz.
- Staging üzerinde veri yazan E2E senaryoları serbesttir; production üzerinde test hesabı veya test görevi oluşturulmaz.

## Kabul kriterleri

- Staging URL production URL'den farklıdır ve staging Neon branch'ine bağlıdır.
- Yedi hesabın tamamı kendi parolasıyla giriş yapabilir.
- `user` yönetim rotalarına erişemez.
- `admin` ve `baskan` yalnız kendi bölümünü görür.
- `dekan` GMİM ve DUİM arasında geçiş yapabilir.
- Gelecek seanslar `docs/testing/STAGING_E2E.md` üzerinden ortamı ve yerel credential yolunu bulabilir.
