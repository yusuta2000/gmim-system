# Staging E2E Ortamı

Bu dosya, GMİM/DUİM rol testleri için kalıcı başlangıç noktasıdır.

## Kaynaklar

- Staging URL: `https://itudfportal-staging.vercel.app`
- Neon project: `neon-violet-forest`
- Neon branch: `e2e-staging` (`br-sweet-base-atqcyg9z`), schema-only, otomatik silme kapalı
- Vercel project: `itudfportal-staging`
- Yerel credential dosyası: `local-e2e-credentials.json` (Git tarafından ignore edilir)
- Yerel reset SQL: `local-e2e-reset.sql` (Git tarafından ignore edilir)
- Hesap üretici: `bun scripts/manage-e2e-accounts.ts`

## Hesap üretimi

```powershell
bun scripts/manage-e2e-accounts.ts
bun scripts/manage-e2e-accounts.ts --generate
bun scripts/manage-e2e-accounts.ts --refresh-sql
bun scripts/manage-e2e-accounts.ts --set-base-url=https://itudfportal-staging.vercel.app
```

İlk komut dry-run yapar. İkinci komut yedi güçlü rastgele parola üretir, Argon2 hashlerini SQL dosyasına koyar ve parolaları yalnız ignored credential dosyasına yazar. Üçüncü komut mevcut parolaları değiştirmeden reset SQL'ini iki sabit E2E baremiyle yeniden üretir. Son komut credential manifestindeki staging adresini günceller ve production adresini reddeder. Mevcut credential dosyalarını yenilemek bilinçli olarak `--force` gerektirir.

## Güvenlik

- Reset SQL production branch'te kesinlikle çalıştırılmaz.
- Credential dosyası içeriği terminale, rapora veya sohbete yazılmaz.
- Chrome testleri parolayı yerel dosyadan belleğe alır ve yalnız staging login formuna gönderir.
- Production ortamında E2E hesabı oluşturulmaz.

## Rol matrisi

- GMİM: user, admin, baskan
- DUİM: user, admin, baskan
- Fakülte: dekan; GMİM ve DUİM görünümü

## 12 Temmuz 2026 doğrulama kaydı

- Yedi hesabın tamamıyla Chrome üzerinden giriş yapıldı.
- `user` hesaplarında yönetim navigasyonu bulunmadığı, `admin` ve `baskan` hesaplarında bulunduğu doğrulandı.
- GMİM kullanıcısının DUİM yönetim adresine erişimi görevler sayfasına yönlendirildi.
- DUİM temsilcisinin GMİM sorgu parametresiyle kendi bölümünden çıkamadığı doğrulandı.
- Dekan hesabı GMİM ve DUİM çalışma alanları arasında başarıyla geçiş yaptı.
- DUİM temsilcisi için ana sayfa ve görevler 320, 375, 390, 768, 1024 ve 1440 px genişliklerde ölçüldü; yatay sayfa taşması ve sınır dışına çıkan eleman bulunmadı.
- GMİM kullanıcısı `E2E Toplantı` baremiyle 2 puanlık görev gönderdi; GMİM temsilcisi görevi onayladı; kullanıcının puan tablosundaki değeri 2 oldu.
- Bu kayıt staging verisidir; production verisi veya hesabı değiştirilmedi.

## Her seansın başlangıcı

1. Bu dosyayı ve `docs/superpowers/logs/2026-07-12-program-status-and-handoff.md` dosyasını oku.
2. `local-e2e-credentials.json` dosyasının varlığını yalnız `Test-Path` ile doğrula; içeriğini çıktıya basma.
3. Staging URL'nin production URL olmadığını doğrula.
4. Veri yazan testleri yalnız staging üzerinde çalıştır.
