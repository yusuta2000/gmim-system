# Staging rol ve E2E testi

## Purpose

GMİM/DUİM portalını `user`, `admin`, `baskan` ve fakülte geneli `dekan` rolleriyle production verisini kirletmeden tekrar test etmek.

## Prerequisites

- Staging URL: `https://itudfportal-staging.vercel.app`
- Ayrı Vercel projesi: `itudfportal-staging`
- Ayrı schema-only Neon branch: `e2e-staging`; otomatik silme kapalı
- Ignored yerel dosya: `local-e2e-credentials.json`
- Ignored reset SQL: `local-e2e-reset.sql`
- Hesap aracı: `bun scripts/manage-e2e-accounts.ts`

Credential veya reset SQL içeriğini terminale, rapora, sohbete ya da commit'e yazma.

## Target environment

1. Credential manifestindeki `baseUrl` değerini içeriği yazdırmadan kodla oku.
2. Origin'in tam olarak `https://itudfportal-staging.vercel.app` olduğunu doğrula.
3. Neon Console'da hedef branch adının `e2e-staging` olduğunu görsel olarak doğrula.
4. Production URL veya production branch görülürse işlemi durdur.

## Dry run

```powershell
bun scripts/manage-e2e-accounts.ts
```

Beklenen: yedi kimlik/rol/bölüm planı görünür; dosya veya veritabanı değişmez; parola yazdırılmaz.

Hesap matrisi:

- GMİM: `user`, `admin`, `baskan`
- DUİM: `user`, `admin`, `baskan`
- Fakülte: `dekan`; başlangıç GMİM, GMİM/DUİM geçişi

## Execution

İlk yerel üretim:

```powershell
bun scripts/manage-e2e-accounts.ts --generate
bun scripts/manage-e2e-accounts.ts --set-base-url=https://itudfportal-staging.vercel.app
```

Mevcut parolaları değiştirmeden SQL yenileme:

```powershell
bun scripts/manage-e2e-accounts.ts --refresh-sql
```

Mevcut credential dosyalarını değiştirmek yalnız bilinçli `--force` kullanımıyla mümkündür. Reset SQL yalnız doğrulanmış `e2e-staging` branch'inde Neon SQL Editor üzerinden uygulanır.

## Verification

1. Yedi hesabın tamamıyla sırayla giriş yap.
2. `user` hesaplarında yönetim navigasyonu bulunmadığını doğrula.
3. `admin` ve `baskan` hesaplarında yönetim navigasyonunu ve yalnız kendi bölümünü doğrula.
4. GMİM kullanıcısının DUİM yönetim adresine erişemediğini; DUİM yöneticisinin GMİM query parametresiyle bölüm değiştiremediğini doğrula.
5. Dekanın GMİM ve DUİM arasında geçebildiğini doğrula.
6. Dashboard ve tasks rotalarını 320, 375, 390, 768, 1024 ve 1440 px genişliklerde yatay taşma açısından ölç.
7. Staging kullanıcısıyla test görevi gönder, aynı bölüm yöneticisiyle onayla ve puan yansımasını kontrol et.
8. Test sonunda staging oturumundan çık ve geçici Chrome/otomasyon sekmelerini kapat.

2026-07-12 temel sonucu: yedi giriş, rol/bölüm sınırları, altı viewport ve 2 puanlık görev onay akışı geçti. Kanıt: [`2026-07-12-portal-program-closeout-and-staging.md`](../logbook/2026/2026-07-12-portal-program-closeout-and-staging.md).

## Rollback

- Test verisini başlangıç durumuna döndürmek için mevcut credential parolalarını koruyarak `--refresh-sql` üret ve yalnız `e2e-staging` branch'ine uygula.
- Staging deployment hatalıysa son doğrulanmış Git commitine Vercel üzerinden rollback yap; production projesini değiştirme.
- Staging branch silinirse production verisinden kopya alma; schema-only yeni branch ve reset SQL ile yeniden kur.

## Secret handling

- `local-e2e-credentials.json` ve `local-e2e-reset.sql` Git tarafından ignore edilir.
- Parola, Argon2 hash, Neon bağlantı adresi, session token ve Vercel environment değeri yazdırılmaz.
- Gerçek e-posta yerine `.test` kimlikleri kullanılır.

## Stop conditions

- Hedef URL production ise.
- Neon branch adı görsel olarak `e2e-staging` doğrulanamıyorsa.
- Yerel credential/reset dosyası tracked görünüyorsa.
- Reset beklenenden farklı tablo veya hesap sayısı üretiyorsa.
- Bir rol kendi yetki/bölüm sınırını aşıyorsa.
- Kullanıcı tarafından oluşturulmuş bilinmeyen staging verisi silinecekse.

