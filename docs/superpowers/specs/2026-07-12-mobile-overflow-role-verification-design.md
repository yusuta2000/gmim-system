# Mobil Taşma ve Rol Doğrulama Tasarımı

## Amaç

Portalın 320–1440 px aralığında yatay kaydırma üretmesini engellemek, ana sayfadaki bozuk sınav bağlantısını düzeltmek ve GMİM/DUİM kapsamını tüm yetkili roller için hem otomatik testlerle hem de canlı Chrome smoke testleriyle doğrulamak.

## Doğrulanmış Sorunlar

Canlı üretim portalı, Fatih NACAR araştırma görevlisi oturumuyla 320 px Chrome görünümünde ölçüldü:

- Kullanılabilir belge genişliği 305 px iken dashboard ana içeriğinin `scrollWidth` değeri 388 px, belgenin toplam genişliği 404 px oldu.
- `Son görev hareketleri` kartı 388 px genişliğe zorlandı. Kartı taşıyan tek kolonlu grid, çocuğun doğal minimum genişliğini küçültemedi.
- Görev filtreleri 239 px kullanılabilir form genişliğinde 311 px doğal minimum genişlik üretti; belgenin toplam genişliği 344 px oldu.
- Arama alanı, seçim kutuları ve tarih alanları grid hücresinin dışına 39–72 px taştı.
- Dashboard üzerindeki `Yaklaşan sınavlar > Aç` bağlantısı `/exams` adresine gidiyor ve üretimde 404 döndürüyor.

## Tasarım Kararları

### 1. Dashboard taşması

Dashboard dış sarmalayıcısı ve iki kolonlu içerik gridinin küçülebilir çocukları `min-w-0` ile sınırlandırılacak. `RecentTasks` ve sağ sütun sarmalayıcısı grid hücresinden daha geniş doğal minimum boyut talep etmeyecek.

Son görev satırları mevcut iki parçalı yapıyı koruyacak:

- Görev açıklaması ve kişi/tarih bilgisi küçülebilen sol sütunda kalacak.
- Puan ve durum sağda sabit kalacak.
- Uzun açıklama ve metadata, kartı genişletmek yerine kullanılabilir alan içinde kısalacak veya kelime sınırında sarılacak.

Mobil için ayrı bir dashboard markup'ı oluşturulmayacak. Global `overflow-x-hidden` kullanılmayacak; bu yöntem gerçek düzen hatalarını gizleyebilir ve içeriği kesebilir.

### 2. Görev filtreleri taşması

Filtre bölümü, form ve bütün doğrudan grid çocukları `min-w-0` ile küçülebilir hale getirilecek. Arama alanı, durum/kategori/kişi seçimleri, tarih alanları ve buton satırı `w-full` sınırına uyacak.

Masaüstü grid düzeni ve mevcut filtre davranışı değişmeyecek. Yönetici rolünde görünen ek kişi filtresi aynı kurallara tabi olacak; böylece kullanıcı hesabında görünmeyen yönetici varyantı da mobilde taşmayacak.

### 3. Sınav bağlantısı

Dashboard sınav hedefi yeni bir `/exams` sayfası oluşturmadan mevcut takvim sınav görünümüne yönlenecek:

```text
/calendar?domain=exams
```

Dekan rolünde `portalHref` mevcut bölüm parametresini ikinci sorgu parametresi olarak ekleyecek:

```text
/calendar?domain=exams&department=GMIM
/calendar?domain=exams&department=DUIM
```

### 4. Otomatik regresyon kapsamı

Component testleri aşağıdaki sözleşmeleri doğrulayacak:

- Dashboard küçülebilen grid ve kart sınıflarını içerir.
- Son görev metinleri kart genişliğini zorlamayan sınıfları içerir.
- Sınav bağlantısı `/calendar?domain=exams` hedefini kullanır.
- Görev filtre formu ve bütün kontrol varyantları mobil genişliğe uyan sınıfları içerir.
- Kullanıcı görünümü ile yönetici görünümündeki ek kişi filtresi aynı responsive sözleşmeyi korur.

Mevcut rol/bölüm birim testleri şu matrisi koruyacak ve eksik yüzeyler için genişletilecek:

| Rol | Kendi bölümü | Diğer bölüm | Yönetim navigasyonu | Bölüm değiştirme |
|---|---:|---:|---:|---:|
| `user` | İzinli | Yasak | Gizli | Yok |
| `admin` | İzinli | Yasak | Görünür | Yok |
| `baskan` | İzinli | Yasak | Görünür | Yok |
| `dekan` | İzinli | İzinli | Görünür | GMİM/DUİM |

### 5. Canlı Chrome doğrulaması

Canlı doğrulama, hesap parolası tahmin etmeden ve tarayıcı oturum depolarını okumadan yapılacak. Aynı Chrome profilinde aynı alan adına ait roller eşzamanlı tutulamayacağı için hesaplar sırayla açılacak.

Her rol/bölüm oturumunda salt-okunur smoke testi uygulanacak:

- Ana navigasyondaki çalışma ve yönetim hedeflerinin role uygun görünürlüğü.
- Dashboard, puanlar, görevler, takvim ve duyuruların açılması.
- Yönetici rollerinde personel, onaylar, veri aktarımı, baremler ve dönem yönetimi hedeflerinin açılması.
- `user` rolünde yönetim URL'lerinin görevler sayfasına yönlenmesi.
- `admin` ve `baskan` rollerinde URL'ye diğer bölüm parametresi yazılsa bile oturum bölümünün korunması.
- `dekan` rolünde GMİM/DUİM seçiminin rota ve API görünümüne yansıması.
- 320, 375, 390, 768, 1024 ve 1440 px genişliklerde belge ve ana içerik yatay taşma ölçümü.
- 320 px genişlikte gerçek içerik yüklendikten sonra dashboard son görevleri ve görev filtrelerinin ekran sınırında kalması.

Canlı üretimde görev oluşturma, onaylama, reddetme, silme, rol değiştirme, dönem işlemi veya veri aktarımı yapılmayacak. Veri yazan E2E akışları yalnız anonimleştirilmiş staging ortamında ve ayrıca onaylanmış test hesaplarıyla çalıştırılacak.

## Hesap Erişimi Önkoşulu

Canlı rol smoke testinin tamamlanması için kullanıcı aşağıdakilerden birini sağlayacak:

- Tercihen anonimleştirilmiş staging URL'si ve `user/admin/baskan/dekan` test hesapları.
- Alternatif olarak üretim Chrome sekmesinde GMİM temsilci, DUİM temsilci veya bölüm başkanı ve dekan hesaplarına sırayla kendisi giriş yapacak; Codex her girişten sonra yalnız salt-okunur kontrolleri çalıştıracak.

Parolalar rapora, ekran görüntüsüne, terminal çıktısına veya repoya yazılmayacak.

## Kabul Kriterleri

- 320, 375, 390, 768, 1024 ve 1440 px genişliklerin hiçbirinde `document.documentElement.scrollWidth > clientWidth` olmamalı.
- Dashboard `Son görev hareketleri` kartının sağ kenarı viewport veya `main` içerik sınırını aşmamalı.
- Görev filtre formunun ve bütün görünür kontrollerinin sağ kenarı filtre kartının içerik sınırını aşmamalı.
- Uzun görev açıklaması, kategori, kişi adı ve tarih metni yatay kaydırma oluşturmamalı.
- `Yaklaşan sınavlar > Aç` bağlantısı 404 yerine takvimin sınav görünümünü açmalı.
- Kullanıcı, admin, başkan ve dekan için navigasyon ve bölüm sınırları otomatik testlerde geçmeli.
- Sağlanan her canlı rol oturumu altı viewport smoke testini geçmeli; erişilemeyen roller açıkça `doğrulanamadı` olarak raporlanmalı.
- `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build` ve `git diff --check` başarılı olmalı.

## Kapsam Dışı

- Üretim veritabanına yazma veya migration deploy.
- Üretim kullanıcılarının rolünü test amacıyla değiştirme.
- Yeni `/exams` rotası oluşturma.
- Global yatay taşmayı CSS ile gizleme.
- Core Web Vitals aracı veya tarayıcı otomasyon paketi kurma.
- Commit ve push; bunlar repo kuralına göre ayrı kullanıcı onayı gerektirir.
