# İTÜ DF Ar.Gör Portalı — Teknik Analiz Raporu

**Tarih:** 11 Temmuz 2026  
**Kapsam:** Kod, API güvenliği, veri bütünlüğü, veritabanı modeli, import, build/deploy ve bakım yapılabilirliği  
**Durum:** Salt-okunur inceleme tamamlandı; uygulama kodu ve canlı veri değiştirilmedi  
**UI/UX kapsamı:** Bu raporun dışında tutuldu. Ayrı canlı UI/UX ve mobil denetimi sonrasında ikinci bir rapor/spec olarak hazırlanacak.

## 1. Yönetici özeti

Portalın temel ürün akışları çalışıyor ve production build alınabiliyor. Buna rağmen yeni özellik geliştirmeden önce kapatılması gereken kritik güvenlik ve veri bütünlüğü borçları var.

En önemli sonuçlar:

1. Üretim veritabanı bağlantı bilgileri public git geçmişine girmiş durumda.
2. Sunucu tarafında gerçek kullanıcı oturumu yok; istemciden gelen kullanıcı ID'leri yetkilendirme amacıyla kullanılıyor.
3. Parolalar düz metin saklanıyor ve tahmin edilebilir varsayılan parola üretilebiliyor.
4. Birçok veri okuma ve yazma API'si kimlik doğrulaması olmadan çağrılabiliyor.
5. Puan ve görev güncellemeleri transaction içinde olmadığı için toplam puanlar görev kayıtlarından ayrışabilir.
6. Dönem yönetimi gerçek bir dönem/arşiv modeli değil; yalnızca toplam puanları değiştiriyor.
7. Excel import ekranı `.xlsx` kabul ediyor görünmesine rağmen sunucu dosyayı metin/CSV gibi işliyor.
8. TypeScript hataları production build sırasında bilinçli olarak atlanıyor; ayrıca yanlış uzantılı bir script tam tip kontrolünü kırıyor.
9. Otomatik test bulunmuyor ve deploy sırasında production veritabanına `prisma db push` çalıştırılıyor.
10. Ana arayüzün bütün iş mantığı yaklaşık 2.000 satırlık tek bir client bileşeninde toplanmış.

Bu maddeler yalnızca teorik kod kalitesi sorunları değildir. Yetkisiz veri erişimi, bölüm sınırının aşılması, tüm puanların sıfırlanması, sahte görev eklenmesi ve puan toplamlarının bozulması gibi gerçek sonuçlara yol açabilir.

## 2. İnceleme yöntemi ve sınırlar

İncelenen ana alanlar:

- `src/app/page.tsx`
- `src/app/api/**/route.ts`
- `prisma/schema.prisma`
- `scripts/`
- `package.json`, `next.config.ts`, `tsconfig.json`
- `SISTEM_DOKUMANTASYONU.md`, `AGENTS.md`, `CLAUDE.md`

Çalıştırılan doğrulamalar:

- `npx eslint src` — başarılı
- `bun x next build` — başarılı, fakat TypeScript doğrulaması atlandı
- `bun x tsc --noEmit` — başarısız; `scripts/import-excel-full.ts` içindeki Python kodu TypeScript olarak yorumlandı
- `bun audit` — 56 bildirim: 26 high, 25 moderate, 5 low

Bu turda yapılmayanlar:

- Canlı veritabanına yazma
- API'lerde saldırı/istismar denemesi
- Toplu veri düzeltme
- Paket güncelleme
- Git pull, commit veya push

Çalışma ağacı başlangıçta temiz değildi:

- `src/app/page.tsx` üzerinde kullanıcıya ait değişiklik vardı.
- `.impeccable/` klasörü untracked durumdaydı.

Bu nedenle ortak repo kuralındaki `git pull origin main` çalıştırılmadı ve mevcut değişikliklere dokunulmadı.

## 3. Bulguların öncelik özeti

| ID | Öncelik | Alan | Özet | Durum |
|---|---|---|---|---|
| SEC-01 | P0 | Secret yönetimi | Production DB bağlantı bilgileri git geçmişinde | Doğrulandı |
| SEC-02 | P0 | Kimlik doğrulama | Sunucu oturumu yok; localStorage kullanıcı nesnesi kullanılıyor | Doğrulandı |
| SEC-03 | P0 | Parola güvenliği | Parolalar düz metin | Doğrulandı |
| SEC-04 | P0 | Yetkilendirme | `requesterId`/`reviewerId` gibi istemci kimliklerine güveniliyor | Doğrulandı |
| SEC-05 | P0 | Veri gizliliği | Kişi, görev, sınav ve Excel verileri oturumsuz okunabiliyor | Doğrulandı |
| SEC-06 | P0 | Yıkıcı işlemler | Dönem sıfırlama ve bazı yazma uçları sunucu yetkisi istemiyor | Doğrulandı |
| SEC-07 | P1 | Bölüm izolasyonu | Yönetici yetkisi ile hedef kaydın bölümü tutarlı kontrol edilmiyor | Doğrulandı |
| SEC-08 | P1 | Kötüye kullanım | Login ve AI uçlarında rate limit yok | Doğrulandı |
| DATA-01 | P1 | Puan bütünlüğü | Görev ve puan güncellemeleri transaction değil | Doğrulandı |
| DATA-02 | P1 | Yarış koşulu | Aynı görev eşzamanlı iki kez onaylanabilir | Doğrulandı |
| DATA-03 | P1 | Dönem modeli | Reset/arşiv semantiği gerçek bir dönem kaydı oluşturmuyor | Doğrulandı |
| DATA-04 | P1 | Şema | Enum, index ve birleşik unique kısıtları yetersiz | Doğrulandı |
| DATA-05 | P1 | Silme | Kişi silme çok adımlı, kalıcı ve transaction dışı | Doğrulandı |
| IMP-01 | P1 | Import | `.xlsx` metin/CSV gibi okunuyor | Doğrulandı |
| IMP-02 | P1 | Import | Dry-run, idempotency, rollback ve transaction yok | Doğrulandı |
| ENG-01 | P1 | Type safety | Build TypeScript hatalarını atlıyor | Doğrulandı |
| ENG-02 | P1 | Deploy | Production deploy sırasında `prisma db push` çalışıyor | Doğrulandı |
| ENG-03 | P1 | Test | Otomatik test bulunmuyor | Doğrulandı |
| ENG-04 | P1 | Bağımlılıklar | Audit çıktısında high/moderate açıklar var | Doğrulandı |
| ARCH-01 | P2 | Frontend mimarisi | Ana ekran yaklaşık 2.000 satırlık tek bileşen | Doğrulandı |
| ARCH-02 | P2 | API tasarımı | Merkezi doğrulama/yetki/standart hata katmanı yok | Doğrulandı |
| OPS-01 | P1 | Repo hijyeni | Gerçek Excel, tool output ve yerel veri dosyaları tracked | Doğrulandı |

## 4. Ayrıntılı güvenlik bulguları

### SEC-01 — Production veritabanı kimlik bilgilerinin açığa çıkması

**Kanıt:** Production PostgreSQL bağlantı string'leri parola dahil olmak üzere aşağıdaki tracked dosyalarda bulundu:

- `SISTEM_DOKUMANTASYONU.md`
- `scripts/add_viewer_users.py`
- `scripts/import-excel-full.ts`
- `scripts/import_excel.py`
- `scripts/import_excel_fast.py`

Bağlantı değerleri bu rapora güvenlik nedeniyle kopyalanmamıştır.

**Etki:** Repo public olduğu için yalnızca mevcut dosyalar değil, git geçmişini görebilen herkes doğrudan production DB erişimi deneyebilir.

**Acil işlem:**

1. Neon DB parolasını/rol kimlik bilgisini döndür.
2. Vercel `DATABASE_URL` ve `DIRECT_URL` değişkenlerini güncelle.
3. Eski kimlik bilgisini iptal et; yalnızca dosyadan silmek yeterli değildir.
4. Neon erişim ve sorgu loglarını şüpheli kullanım açısından incele.
5. Secret'ları dosyalardan çıkarıp yalnızca environment variable kullan.
6. Git geçmişi temizliğini ortak repo kullanan iki kişiyle koordineli yap; force push tek taraflı uygulanmamalı.

**Kabul kriteri:** Eski bağlantı bilgisiyle bağlantı kurulamaz; tracked dosyalarda ve güncel git ağacında production secret bulunmaz.

### SEC-02 — Gerçek oturum bulunmaması

**Kanıt:** `src/app/page.tsx` kullanıcı nesnesini `gmim_current_user` anahtarıyla localStorage'dan yükleyip tekrar localStorage'a yazıyor. Login API'si başarılı girişten sonra oturum cookie'si veya token üretmiyor.

**Etki:** Tarayıcıdaki rol ve kullanıcı bilgisi güvenilir kimlik kanıtı değildir. Kullanıcı arayüzde yönetici gibi görünebilir; daha önemlisi API isteklerinde başka kullanıcı kimliği gönderebilir.

**Önerilen hedef:**

- HttpOnly, Secure, SameSite cookie
- Sunucu tarafında iptal edilebilir session
- Session'dan elde edilen `userId`, `role` ve `department`
- Client gövdesinden yetki amacıyla `requesterId` alınmaması
- Çıkışta session iptali
- Parola değişikliği ve rol değişikliğinde mevcut session'ların iptali

### SEC-03 — Düz metin ve tahmin edilebilir parolalar

**Kanıt:**

- `src/app/api/login/route.ts`: doğrudan `assistant.password !== password`
- `src/app/api/change-password/route.ts`: mevcut parola doğrudan karşılaştırılıyor
- `src/app/api/reset-password/route.ts`: yeni parola doğrudan DB'ye yazılıyor
- `src/app/api/add-assistant/route.ts`: boş bırakılırsa e-posta parçası + yıl biçiminde varsayılan parola üretiliyor

**Etki:** DB sızıntısında bütün kullanıcı parolaları okunabilir. Varsayılan parolalar hesap bilgisi bilinen kişiler için tahmin edilebilir.

**Önerilen geçiş:**

1. `passwordHash` ve `mustChangePassword` alanlarını ekle.
2. Mevcut parolaları tek seferlik, dry-run destekli script ile Argon2id veya bcrypt hash'e dönüştür.
3. Plaintext alanı geçiş tamamlandıktan sonra kaldır.
4. Yeni hesaplarda rastgele geçici parola üret veya yönetici kontrollü aktivasyon bağlantısı kullan.
5. İlk girişte parola değiştirmeyi zorunlu kıl.

### SEC-04 — İstemciden gelen kullanıcı ID'siyle yetkilendirme

Etkilenen örnek uçlar:

- `toggle-role`: `requesterId`
- `remove-assistant`: `requesterId`
- `reset-password`: `requesterId`
- `delete-task`: opsiyonel `requesterId`
- `approve-task`: `reviewerId`
- `respond-task`: `responderId`
- `announcements`: `authorId`/`requesterId`
- `pending-duty`: `submittedBy`, `reviewerId`, `isDirectAdmin`

`pending-duty` için yalnızca `isDirectAdmin: true` gönderilmesi doğrudan görev değişikliği yolunu açıyor. `approve-task` ise `reviewerId` kullanıyor fakat bu kişinin yönetici olduğunu doğrulamıyor.

**Kabul kriteri:** Yetki veren kimlik bilgileri request body/query içinden okunmaz; bütün kararlar doğrulanmış server session'ından alınır.

### SEC-05 — Oturumsuz veri okuma ve export

Aşağıdaki GET uçlarında doğrulanmış session kontrolü bulunmuyor:

- `/api/assistants`
- `/api/tasks`
- `/api/exams`
- `/api/weekly-schedule`
- `/api/announcements`
- `/api/approve-task`
- `/api/pending-duty`
- `/api/notifications`
- `/api/export-excel`

`assistants` cevabından parola çıkarılıyor; ancak ad, e-posta, telefon, rol, puan ve görev ilişkileri gibi bilgiler hâlâ erişilebilir. Excel export da görev, e-posta, puan ve program bilgisi üretebiliyor.

**Kabul kriteri:** Tüm kurumsal veriler login ister; kullanıcı yalnızca rolü ve bölümü kapsamında gerekli alanları görür.

### SEC-06 — Korumasız yıkıcı/yazma işlemleri

Önemli örnekler:

- `POST /api/reset-period`: session veya rol kontrolü yok; bölüm verilmezse tüm kullanıcı toplamlarını sıfırlayabilir.
- `POST /api/categories`: yetki kontrolü yok.
- `POST /api/exams`: yetki kontrolü yok.
- `POST` ve `DELETE /api/weekly-schedule`: doğrulanmış kullanıcı kontrolü yok.
- `POST /api/supervisor-assign`: yönetici kontrolü yok.
- `POST /api/import-excel`: yönetici kontrolü yok.
- `POST /api/notifications`: herhangi bir kullanıcı adına bildirim üretilebilir.
- `POST /api/tasks`: `source: import` veya `auto_assigned` gönderilerek doğrudan approved görev üretilebilir.

**Öneri:** Merkezi role/department yetki matrisi hazırlanmalı ve her route handler bu ortak katmanı kullanmalı.

### SEC-07 — Bölüm izolasyonunun eksik uygulanması

Bazı GET sorguları `?department=` ile filtreleniyor. Bu filtre, kimliği doğrulanmış kullanıcının bölümüyle sunucu tarafında bağlanmıyor; parametre istemci tarafından seçilebiliyor.

Yönetici kontrolü yapan bazı uçlar da yalnızca rolü kontrol ediyor. GMİM yöneticisinin DUİM kaydını hedeflemesini engelleyen ortak bir kontrol yok. Dekan için fakülte geneli erişim istisnası korunmalı; admin ve başkan yalnızca kendi bölümlerinde işlem yapmalı.

### SEC-08 — Rate limiting ve kötüye kullanım koruması

Login ve AI sınıflandırma uçlarında rate limit görülmedi. Bu durum parola denemesi, maliyet tüketimi ve servis engelleme riskini artırır.

Minimum hedef:

- Login: IP + hesap anahtarlı kısa pencere limiti ve artan gecikme
- AI: authenticated kullanıcı başına kota
- Import/export: yönetici başına eşzamanlı işlem sınırı
- Büyük request body ve dosya boyutu sınırı
- Başarısız login için kullanıcı adı keşfini zorlaştıran tek tip cevap

## 5. Veri bütünlüğü bulguları

### DATA-01 — Görev ve toplam puanın transaction dışında güncellenmesi

`tasks`, `approve-task`, `respond-task` ve `delete-task` içinde görev durumu ile `ResearchAssistant.totalPoints` ayrı sorgularla değiştiriliyor.

Örnek hata senaryosu:

1. Görev approved yapılır.
2. Puan increment sorgusu başarısız olur.
3. Görev approved görünür fakat toplam puan değişmez.

Tersi durumda puan değişip görev işlemi tamamlanmayabilir. Bütün ilişkili değişiklikler `db.$transaction` içine alınmalı.

### DATA-02 — Çift onay ve yarış koşulu

`approve-task` önce görevin `pending` olduğunu okuyor, sonra ayrı bir update yapıyor. İki eşzamanlı istek aynı pending durumu görerek iki kez puan ekleyebilir.

Çözüm seçenekleri:

- Koşullu `updateMany` ile yalnızca `status=pending` iken güncelle ve etkilenen satır sayısını kontrol et.
- Transaction isolation/optimistic version alanı kullan.
- Aynı mutation için idempotency key tut.

### DATA-03 — Gerçek dönem/arşiv modelinin olmaması

`reset-period` açıklamasında arşivden söz edilse de şemada dönem modeli yok. Reset yalnızca `totalPoints=0` yapıyor. Archive yolu ise istemciden gelen arbitrary puanları kullanıcı bazında yazıyor.

Önerilen model:

- `AcademicPeriod`: ad, başlangıç/bitiş, department, durum
- `Task.periodId`
- Dönem açılış bakiyesi/carry-over kaydı
- Kapanmış dönemde değişiklik yasağı veya özel yetkili düzeltme
- Dönem kapanış özeti ve audit kaydı

### DATA-04 — Enum, index ve unique kısıtları

Şemada rol, bölüm, görev status/source ve değişiklik türleri serbest `String` olarak tutuluyor. Yazım hatası veya beklenmeyen değer uygulama mantığını bozabilir.

Önerilen kısıtlar:

- `Department`, `Role`, `TaskStatus`, `TaskSource`, `DutyChangeType`, `DutyChangeStatus` enum'ları
- `ExamSupervisor` için `@@unique([examId, assistantId])`
- Görev sırası için dönem modelinden sonra `@@unique([assistantId, periodId, number])`
- Sık filtrelenen `department`, `status`, `assistantId`, `date`, `createdAt` alanlarına uygun index'ler
- Zaman çizelgesi için gerekli birleşik index'ler

### DATA-05 — Kalıcı kişi silme

`remove-assistant` ilişkili kayıtları altı ayrı `deleteMany` ile silip en son kullanıcıyı siliyor. Transaction yok; ara adımda hata kalıcı yarım silme bırakabilir. Ayrıca geçmiş görevlerin yok edilmesi kurumsal izlenebilirliği zedeler.

Öneri:

- Varsayılan işlem pasife alma/soft delete olsun.
- `deletedAt`, `deletedBy`, `deletionReason` alanları değerlendirilsin.
- Gerçek kalıcı silme yalnızca ayrı, yüksek yetkili ve yedek kontrollü bakım akışı olsun.

## 6. Import bulguları

### IMP-01 — `.xlsx` dosyasının gerçek Excel olarak ayrıştırılmaması

`import-excel` dosyayı `Buffer` ardından UTF-8 text'e çeviriyor ve satırları virgül/noktalı virgül/tab ile bölüyor. Binary `.xlsx` bu yöntemle güvenilir şekilde okunamaz.

Ek sorunlar:

- Gerçek CSV quoting kuralları uygulanmıyor.
- Tırnak içindeki virgül veya satır sonu bozulabilir.
- Tarih formatları locale bağlı ve belirsiz.
- İsimler `includes` ile fuzzy eşleştiriliyor; benzer isim yanlış kişiye bağlanabilir.
- Eşleşmeyen satırlar sessizce atlanabiliyor.

### IMP-02 — Dry-run, idempotency ve rollback eksikliği

Import satır satır canlı DB'ye yazıyor. Bir satırda hata olursa önceki satırlar kalabilir. Aynı dosyanın yeniden yüklenmesi duplicate görev ve puan üretebilir.

Hedef iş akışı:

1. Dosyayı yükle ve hash hesapla.
2. Format/kolon eşlemesini belirle.
3. Satırları doğrula; hata, uyarı ve kesin eşleşme olarak sınıflandır.
4. Kullanıcıya dry-run önizlemesi göster.
5. Açık kullanıcı onayından sonra tek transaction ile uygula.
6. `ImportBatch` ve satır kaynak kimliği kaydet.
7. Aynı hash için tekrar yüklemeyi engelle veya bilinçli tekrar seçeneği sun.
8. Batch bazında geri alma imkânı sağla.

## 7. Build, deploy ve bağımlılık bulguları

### ENG-01 — TypeScript doğrulamasının atlanması

`next.config.ts` içinde `typescript.ignoreBuildErrors: true` bulunuyor. Bu nedenle production build TypeScript hataları olsa da başarılı olabilir.

Tam `tsc` kontrolü ayrıca `scripts/import-excel-full.ts` nedeniyle kırılıyor. Dosya `.ts` uzantılı fakat içeriği Python ve doğrudan production DB bağlantısı ile toplu silme komutları içeriyor.

Hedef:

- Yanlış uzantılı script'i güvenli biçimde kaldır veya doğru dile/konuma taşı.
- Script'leri ayrı `tsconfig.scripts.json` ile yönet.
- `ignoreBuildErrors` kaldır.
- CI'da lint + typecheck + test + build zorunlu olsun.

### ENG-02 — Deploy sırasında `prisma db push`

`package.json` build script'i `prisma generate && prisma db push && next build` çalıştırıyor. Böylece her Vercel deploy'u production şemasını migration geçmişi olmadan eşitlemeye çalışıyor.

Hedef:

- Prisma migration dosyalarını version control'de tut.
- Production'da kontrollü `prisma migrate deploy` kullan.
- Şema değişikliği ile uygulama deploy'unu geri alınabilir sırada çalıştır.
- Destructive migration için ayrı onay ve yedek kapısı oluştur.

### ENG-03 — Otomatik test eksikliği

Repo içinde gerçek test/spec dosyası bulunmadı. En kritik test matrisi:

- Login ve session lifecycle
- Her rol için izin/verme reddetme
- GMİM/DUİM izolasyonu
- Dekan fakülte-geneli istisnası
- Görev onayı/idempotency/puan invariants
- Dönem kapatma ve carry-over
- Import dry-run, duplicate ve rollback
- Yıkıcı işlemlerde re-auth/confirmation

### ENG-04 — Bağımlılık açıkları

`bun audit` 56 bildirim verdi. Bunların tümünün uygulamada erişilebilir olduğu varsayılmamalı; direct runtime bağımlılıkları ve gerçek kod yolları tek tek değerlendirilmelidir.

Öncelikli inceleme:

- Next.js high bildirimleri
- `xlsx` high bildirimleri
- Doğrudan kullanılan `next-intl`, `uuid` sürümleri
- Kullanılmayan geniş UI/editor bağımlılıklarının kaldırılması

Körlemesine `bun update --latest` yapılmamalı. Her bağımlılık grubu ayrı commit ve build/test doğrulamasıyla güncellenmeli.

## 8. Mimari ve bakım yapılabilirliği

### ARCH-01 — Tek dosyada çok fazla sorumluluk

`src/app/page.tsx` yaklaşık 2.000 satır ve aşağıdaki sorumlulukları aynı client component içinde taşıyor:

- Login ve local session
- Bölüm seçimi
- Tema
- Bütün API fetch'leri
- Görevler ve onaylar
- Sınavlar ve gözetmen atama
- Haftalık program
- Duyurular ve yorumlar
- Bildirimler
- Personel ve roller
- Dönem yönetimi
- Import/export
- Çok sayıda dialog ve form state'i

Bu durum güvenlik düzeltmelerini de zorlaştırır; çünkü veri alma, yetki görünürlüğü ve mutation mantığı birbirine karışmıştır.

Önerilen hedef sınırlar:

- `features/auth`
- `features/tasks`
- `features/exams`
- `features/schedule`
- `features/announcements`
- `features/personnel`
- `features/periods`
- `features/import-export`
- Ortak `lib/auth`, `lib/authorization`, `lib/validation`, `lib/api-client`

Bu parçalama tek başına yapılmamalı; güvenlik fazında dokunulan akışlarla birlikte küçük, geri alınabilir dilimler halinde ilerlemeli.

### ARCH-02 — Merkezi API sözleşmesi olmaması

Route'lar request body'lerini çoğunlukla doğrudan destructure ediyor. Ortak Zod schema, standart hata cevabı ve ortak authorization helper bulunmuyor.

Hedef:

- Her mutation için Zod request schema
- Normalize edilmiş tarih, enum ve sayı doğrulaması
- Merkezi `requireSession`, `requireRole`, `assertDepartmentAccess`
- Tek tip hata kodları: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `CONFLICT`
- Client'ta bu hata kodlarına uygun Türkçe mesajlar

## 9. Repo ve operasyon hijyeni

Tracked içerikler arasında gerçek Excel dosyaları, yüklenen ekran görüntüleri, tool çıktıları, yerel DB ve üretilmiş dokümanlar bulunuyor.

Riskler:

- Kişisel/kurumsal veri sızıntısı
- Repo boyutunun büyümesi
- Eski tool çıktılarındaki secret'ların unutulması
- Hangi dosyanın source-of-truth olduğunun belirsizleşmesi

Öneri:

- `upload/`, `tool-results/`, yerel DB ve analiz çıktıları için saklama politikası belirle.
- Gerekli olmayanları git'ten çıkar ve `.gitignore` kapsamını genişlet.
- Gerçek veri yerine anonimleştirilmiş fixture kullan.
- Production script'lerini `--dry-run` varsayılanı, `--commit` zorunluluğu ve bölüm guard'ı ile standartlaştır.
- Her veri yazan script başında hedef DB hostu ve etkilenecek kayıt sayısını göster.

## 10. Önerilen teknik uygulama sırası

Bu sıra bağımlılık sırasıdır; bütün fazların tek büyük PR/commit yapılması önerilmez.

### Faz 0 — Olayı sınırlandırma

1. Production DB kimlik bilgisini döndür.
2. Vercel environment değişkenlerini güncelle.
3. Erişim loglarını kontrol et.
4. Secret içeren tracked dosyaları temizle.
5. Ortak repo kullanıcılarıyla git geçmişi temizleme planını koordine et.

### Faz 1 — Kimlik doğrulama ve yetkilendirme

1. Session veri modeli ve HttpOnly cookie.
2. Parola hash migration'ı.
3. Merkezi auth/role/department helper'ları.
4. Bütün API uçları için açık yetki matrisi.
5. Oturumsuz veri okumayı kapatma.
6. Login ve AI rate limit.
7. Session/rol/bölüm integration testleri.

### Faz 2 — Veri bütünlüğü

1. Görev/puan transaction'ları.
2. Çift onay/idempotency koruması.
3. Enum, index ve unique constraint migration'ları.
4. Soft-delete yaklaşımı.
5. Reconciliation script'i: görevlerden beklenen puan ile kayıtlı toplamı karşılaştıran dry-run raporu.

### Faz 3 — Dönem modeli

1. `AcademicPeriod` tasarımı.
2. Mevcut görevlerin döneme eşlenmesi için dry-run migration.
3. Kapanış/carry-over kuralları.
4. Kapanmış dönem değişiklik politikası.
5. Dönem raporu ve audit kaydı.

### Faz 4 — Güvenli import

1. Gerçek XLSX/CSV parser.
2. Satır doğrulama ve kesin kişi eşleme.
3. Dry-run önizleme.
4. Transaction, batch kimliği ve duplicate kontrolü.
5. Batch rollback.

### Faz 5 — Mühendislik kalite kapıları

1. Yanlış script uzantılarını düzelt.
2. TypeScript build bypass'ını kaldır.
3. Test altyapısı ve CI.
4. Migration tabanlı deploy.
5. Bağımlılıkları risk bazlı güncelle ve kullanılmayanları kaldır.

### Faz 6 — Frontend modülerleştirme

Bu faz UI/UX denetimi ve onaylı tasarım yönüyle birlikte ayrıntılandırılacak. Güvenlik düzeltmesi sırasında dokunulmayan alanlarda toplu refactor yapılmamalı.

## 11. Uygulama ilkeleri

- Her veri yazan bakım işlemi önce dry-run çalışmalı.
- GMİM ve DUİM sınırları her test katmanında açıkça doğrulanmalı.
- Her mantıklı düzeltme küçük ve geri alınabilir commit olmalı.
- Commit ve push öncesi kullanıcı onayı alınmalı.
- Push öncesi `git pull origin main` çalıştırılmalı; force push kullanılmamalı.
- Şema değişikliğinden önce production yedeği ve rollback yöntemi yazılmalı.
- Güvenlik nedeniyle API response'larında Prisma nesneleri doğrudan dönülmemeli; açık DTO kullanılmalı.
- UI'da bir kontrolün gizlenmesi yetkilendirme sayılmamalı.

## 12. Tamamlanmış ve bekleyen analiz

### Tamamlandı

- API ve auth modeli taraması
- Prisma şema taraması
- Import ve production script taraması
- Build, lint, typecheck ve dependency audit
- Temel mimari değerlendirme
- Bulguların risk ve bağımlılık sırasına konması

### Sonraki ayrı çalışma

- Canlı masaüstü UI/UX denetimi
- 375 px mobil ve 768 px tablet denetimi
- Yönetici ve normal kullanıcı yolculuklarının karşılaştırılması
- Erişilebilirlik ve klavye kullanımı
- Görsel hiyerarşi, bilgi mimarisi ve navigasyon
- Uzun listeler, tablolar ve formlar
- Dark mode ve tasarım token sistemi
- Yükleme, boş, hata ve başarı durumları
- UI performansı ve gereksiz yeniden veri yükleme
- Onaylı tasarım yönüne göre ayrı design spec ve uygulama planı

---

Bu belge mevcut durumun kanıt kaydıdır. Uygulama öncesinde her faz ayrıca tasarlanmalı, kabul kriterleri netleştirilmeli ve kullanıcı onayı alınmalıdır.
