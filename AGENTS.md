# CLAUDE.md — İTÜ DF Ar.Gör Portalı · Güncelleme Kılavuzu

Bu dosya iki kişi içindir:
- **Fatih & Begüm (ve diğer yetkililer):** Dekan hocadan gelen güncelleme taleplerini sisteme nasıl işleyeceğini anlatır.
- **Claude:** Bu klasör Claude Code ile açıldığında, sistemi nasıl güvenle değiştireceğini ve yayına alacağını bu dosyadan öğrenir. **Claude, aşağıdaki "İş akışı" ve "Altın kurallar" bölümlerine uymalıdır.**

Canlı site: **https://itudfportal.vercel.app** · Repo: `github.com/yusuta2000/gmim-system`
Derin teknik detay için: `SISTEM_DOKUMANTASYONU.md` (özellikle Bölüm 14: GMİM/DUİM yapısı).

> 📌 **`CLAUDE.md` ve `AGENTS.md` birebir aynı olmalıdır.** İkisi de aynı kılavuzdur (Claude Code `CLAUDE.md`, diğer AI araçları `AGENTS.md` okur). Birini değiştiren **diğerini de aynı şekilde günceller** — yoksa araçlar farklı talimat görür.

---

## 0. ⭐ En önemli kural: çoğu talep KOD gerektirmez

Dekan hocanın taleplerinin büyük kısmı zaten **siteye giriş yapıp arayüzden** halledilir. Önce buna bak:

| Talep | Nasıl yapılır (arayüz) | Kod gerekir mi? |
|---|---|---|
| Yeni araş. gör. ekle | Personel → "Yeni Araş Gör Ekle" | Hayır |
| Birini pasife al / çıkar | Personel → ilgili kişi → pasif/kaldır | Hayır |
| Görev atama / puan ekleme | Görevler sekmesi → görev oluştur | Hayır |
| Bekleyen görevleri onayla/reddet | Onaylar sekmesi | Hayır |
| Duyuru yap / müsaitlik sor | Duyurular sekmesi | Hayır |
| Sınav ekle + gözetmen ata | Sınavlar sekmesi | Hayır |
| Dönem başı puan sıfırla / taşı | Puan Tablosu → "Dönem Yönetimi" | Hayır |
| Şifre sıfırla (bir kişinin) | Personel → ilgili kişi → şifre sıfırla | Hayır |
| Excel/CSV'den toplu görev yükle | İçe Aktar sekmesi | Hayır (basit CSV) |
| Puanları/sıralamayı Excel indir | Puan Tablosu → indirme butonları | Hayır |

> **Not (yetki):** Bu işlemleri arayüzde yapabilmek için **Temsilci** olmak gerekir. Begüm zaten Temsilci. **Fatih şu an "Ar.Gör" rolünde** — arayüzden yönetim yapabilmesi için Begüm'ün onu Temsilci yapması yeterli (Personel → Fatih → "Temsilci Yap"). Kod ile güncelleme yapmak için ise rol önemli değildir.

---

## 1. Ne zaman Claude (kod) gerekir?

Sadece arayüzde **olmayan** işler için:
- Puan **baremlerini** (kategorileri) ekleme/değiştirme/silme
- **Toplu/karmaşık veri aktarımı** (ör. geçmiş dönem puan dökümü, düzensiz Excel)
- **Arayüz metni/etiket/görsel** değişikliği (başlık, buton yazısı, renk vb.)
- **Yeni özellik** ekleme veya bir hatayı düzeltme
- Doğrudan veritabanında toplu düzeltme

Bunlar için klasörü **Claude Code** ile aç ve ne istediğini **normal Türkçe** ile yaz. Claude gerisini yapar.

---

## 2. Kurulum (bir kereye mahsus)

Kod ile güncelleme yapacak kişi için:
1. **Claude Code**'u kur (Anthropic'in resmi uygulaması/CLI'ı).
2. Repoyu bilgisayara indir: `git clone https://github.com/yusuta2000/gmim-system.git`
3. Klasörü Claude Code ile aç. Claude bu `CLAUDE.md`'yi otomatik okur.
4. **Yayına alma (deploy) yetkisi:** Değişikliğin siteye yansıması için `git push` gerekir. Bunun için ya repo sahibi (yusuta2000) seni GitHub'da **collaborator** eklemeli, ya da basit metin değişikliklerini **GitHub web arayüzünden** (dosyayı aç → kalem ikonu → Commit) yapabilirsin — bu da otomatik deploy tetikler.

> Sadece dosyayı düz **Claude (claude.ai sohbet)** ile açarsan Claude sana yol gösterir ama **dosyalarını değiştiremez/deploy edemez**. Gerçek güncelleme için **Claude Code + repo** gerekir.

### ⚠️ İki kişiyle çalışıyoruz — git akışı (pull / push / clone)

Bu repo **ortak**: Fatih (`avaarree-create`) ve repo sahibi (`yusuta2000`) **aynı `main` dalına** push yapıyor. Aynı anda ikimiz de yazarsak commit'ler çakışır. Bu yüzden:

1. **Her işe başlamadan önce `git pull origin main`.** Arkadaşının en son değişikliklerini almadan kod yazma — yoksa push reddedilir ve merge conflict çıkar.
2. **Push'tan hemen önce tekrar `git pull`.** Sıra: `git pull origin main` → derle (`npx next build`) → `git push origin main`. Push arası kısa tut.
3. **Push reddedilirse (`rejected / non-fast-forward`) panikleme:** `git pull origin main` yap, Claude conflict'leri çözer, tekrar push et. **Asla `git push --force` kullanma** — arkadaşının commit'lerini siler.
4. **Aynı anda ikiniz de büyük değişiklik yapmayın.** Kod değişikliğine başlamadan kısa bir "ben şu an X'e bakıyorum" mesajı çakışmayı önler.
5. **Clone bir kere yapılır.** Repo bilgisayarında zaten varsa tekrar `git clone` **yapma** — sadece `git pull` ile güncelle. Yeni baştan clone gerekiyorsa eski klasördeki commit'lenmemiş değişikliklerin gittiğini unutma.
6. **Commit'lenmemiş işini bırakıp gitme.** Gün sonunda ya commit+push et ya da `git stash`'le; yarım işi başkasının pull'u üstüne bindirmesin.

> **Claude için:** Bu repoda push yapmadan önce daima `git pull origin main` çalıştır. Push `rejected` dönerse `--force` **kullanma**; pull edip conflict çöz, yeniden push et. Kullanıcının global kuralı gereği **her `git` commit/push öncesi onay al**.

---

## 3. İş akışı — Claude bir değişikliği nasıl yapar

Claude, kodda bir değişiklik istendiğinde şu sırayı izler:
1. **Anla:** İlgili dosyayı bul (`src/app/page.tsx` = arayüz, `src/app/api/...` = sunucu, `prisma/schema.prisma` = veritabanı yapısı).
2. **Değiştir:** Mümkün olan en küçük, güvenli değişikliği yap.
3. **Doğrula:** `npx next build` ile derlenip derlenmediğini kontrol et.
4. **Yayına al:** `git add -A && git commit -m "açıklama" && git push origin main`.
5. **Onayla:** Vercel 1–2 dakikada otomatik deploy eder. `https://itudfportal.vercel.app` üzerinden kontrol et.

> Veritabanı verisi (puan/kişi) değiştiren işlerde Claude **önce salt-okunur/dry-run ile** ne olacağını gösterir, sayıları doğrular, sonra uygular. Bkz. `scripts/seed-duim.mjs` (`--commit` olmadan çalıştırılırsa hiçbir şey yazmaz).

---

## 4. Hazır reçeteler — Claude'a aynen böyle söyleyebilirsin

- **Barem ekle:** *"Puan baremlerine 'X görevi' diye 3 puanlık bir kategori ekle."*
- **Barem değiştir:** *"'Gözetmenlik (1 sınav)' baremini 4'ten 5 puana çıkar."*
- **Toplu puan/görev aktar:** *"Elimde şu Excel/CSV var (yolu: ...). GMİM ar.görlerinin geçmiş görevlerini sisteme aktar."* → Claude `scripts/` altındaki import şablonlarını kullanır, önce dry-run gösterir.
- **Arayüz metni:** *"Giriş ekranındaki alt yazıyı şu şekilde değiştir."*
- **Şifre sıfırlama (toplu):** *"Şu kişilerin şifresini sıfırla."*
- **Yeni bir kişiyi doğru bölüme ekle:** Arayüzden ekleniyorsa otomatik; kod tarafında Claude `department` alanını doğru (`GMIM`/`DUIM`) ayarlar.

---

## 5. Sistem gerçekleri (Claude'un bilmesi gerekenler)

- **Stack:** Next.js 16 + TypeScript + Prisma + PostgreSQL (Neon) + Vercel. Arayüz tek dosya: `src/app/page.tsx`. Sunucu uçları: `src/app/api/*/route.ts`.
- **Bölüm bazlı:** Tek DB, `department` alanı ile ayrım: `GMIM` / `DUIM`. Tüm GET uçları `?department=` ile filtreler; create uçları gövdede `department` alır. Detay: `SISTEM_DOKUMANTASYONU.md` Bölüm 14.
- **Roller:** `admin`=Temsilci, `baskan`=Bölüm Başkanı (ikisi bölüme özel), `dekan`=fakülte geneli (iki bölümü de görür), `user`=Ar.Gör. Özcan Arslan tek dekan hesabıdır; DUİM'de "Dekan & Bölüm Bşk." görünür.
- **Deploy:** `git push origin main` → Vercel otomatik build (`prisma generate && next build`). Şema değişikliği için önce gözden geçirilmiş migration gerekir; `prisma migrate deploy` ayrı ve açık onaylı bir adımdır.
- **Prod veritabanı:** Bağlantı bilgisi `SISTEM_DOKUMANTASYONU.md` Bölüm 6'da. Script'ler `DATABASE_URL`/`DIRECT_URL` env değişkenleriyle çalışır. **Bu canlı, gerçek veridir — dikkatli ol.**

---

## 6. 🚨 Altın kurallar (Claude ve kullanıcılar için)

1. **Yanlış bölüme dokunma.** GMİM talebi için sadece `GMIM` verisini değiştir; DUİM'e karışma (ve tersi).
2. **Veri yazan işlemde önce dry-run / önizleme.** Sayıları doğrulamadan `--commit` yapma.
3. **Deploy öncesi `next build` ile derlenmeyi kontrol et.** Derlenmiyorsa push etme (kırık build siteyi bozmaz ama yeni değişiklik yayınlanmaz).
4. **Küçük, geri alınabilir adımlar.** Her mantıklı değişiklik ayrı commit; açıklama yaz.
5. **Şüphedeysen sor.** Geri dönüşü zor bir işlemden (toplu silme, tüm puanları sıfırlama, şema değişikliği) önce kullanıcıya onaylat.
6. **Güvenlik notu:** Repo şu an public ve şifreler düz metin. Sisteme kişisel/gizli yeni bir sır ekleme. (Kapsamlı güvenlik sertleştirmesi planlı bir sonraki iş.)
7. **Ortak repo — push öncesi `git pull`.** İki kişi aynı `main` dalında; push etmeden önce daima `git pull origin main`. `--force` yasak. Ayrıntı: Bölüm 2 "İki kişiyle çalışıyoruz".

---

## 7. Takıldığında
- Derin teknik detay ve API listesi: `SISTEM_DOKUMANTASYONU.md`.
- Sistemin sahibi: yusuta2000 (repo sahibi). Yayın/erişim sorunlarını ona ilet.
- Bir şeyi bozmaktan korkuyorsan: önce Claude'a *"bu değişikliği yapmadan önce ne olacağını açıkla, henüz uygulama"* de.
