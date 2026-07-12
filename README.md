# İTÜ DF Araştırma Görevlisi Portalı

İTÜ Denizcilik Fakültesi'nin GMİM ve DUİM bölümlerindeki araştırma görevlisi görevlerini, puanlarını, sınav gözetmenliklerini, haftalık programlarını ve duyurularını yöneten portal.

## Ortamlar

- Production: <https://itudfportal.vercel.app>
- İzole rol/E2E staging: <https://itudfportal-staging.vercel.app>

Staging yalnız test hesapları ve test verisi içindir. Production üzerinde test hesabı, test görevi veya deneme verisi oluşturulmaz.

## Teknoloji

Next.js 16, React 19, TypeScript, Prisma 6, PostgreSQL/Neon, Tailwind CSS, shadcn/ui, Vitest ve Bun.

## Yerel başlangıç

```powershell
bun install
bun run dev
```

Gizli değerler yalnız yerel `.env` dosyalarında veya hosting sağlayıcısının secret yönetiminde tutulur. Git'e parola, token, bağlantı adresi ya da gerçek kullanıcı giriş bilgisi yazılmaz.

## Kalite kapıları

```powershell
bun run test
bun run typecheck
bun run lint
bun run build
```

Veritabanı migration veya veri yazma işlemleri bu komutların parçası değildir ve ayrıca yetkilendirilir.

## Dokümantasyon okuma sırası

1. [Dokümantasyon indeksi](docs/INDEX.md)
2. [Güncel proje durumu](docs/status/CURRENT.md)
3. Yapılacak işlemle ilgili runbook
4. Güncel durumdan bağlantı verilen logbook, ADR, spec veya plan

Detaylı teknik sistem açıklaması için [SISTEM_DOKUMANTASYONU.md](SISTEM_DOKUMANTASYONU.md) kullanılır. Bu dosya güncel durum panosu değildir.

## Güvenlik ve Git kuralları

- GMİM ve DUİM verileri, açıkça yetkilendirilmiş dekan görünümü dışında ayrıdır.
- Veri yazan script önce dry-run çalıştırılır.
- Production migration, toplu veri değişikliği, credential rotation ve Git geçmişi değiştirme ayrı onay gerektirir.
- Ortak `main` dalına push öncesinde `git pull origin main` çalıştırılır.
- Force-push kullanılmaz.
- `AGENTS.md` ve `CLAUDE.md` byte düzeyinde aynı tutulur.

