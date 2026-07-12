# İTÜ DF Ar.Gör Portalı — Hibrit UI/UX Yeniden Tasarım Spec'i

**Tarih:** 11 Temmuz 2026  
**Durum:** Tasarım yönü kullanıcı tarafından onaylandı  
**Seçilen yaklaşım:** Hibrit yeniden tasarım  
**Teknik bulgu kaynağı:** `TEKNIK_ANALIZ_RAPORU_2026-07-11.md`

## 1. Amaç

Portalın mevcut ve çalışan iş akışlarını koruyarak bilgi mimarisini, mobil kullanımı, görsel tutarlılığı ve erişilebilirliği yeniden düzenlemek.

Bu çalışma “mevcut ekrana yeni renk vermek” değildir. Aşağıdaki yapısal sorunları çözmeyi hedefler:

- Desktop ve mobilde yatay sekme kalabalığı
- Ana sayfanın kullanıcıya sıradaki işi açıkça göstermemesi
- 95 görev kaydının tek seferde render edilmesi ve görev formunun listenin altında kalması
- Mobil program tablosunun yatay kaydırma gerektirmesi
- Form etiketleri, dokunma alanları ve dialog açıklamalarındaki erişilebilirlik eksikleri
- Çok sayıda hard-coded renk ve tutarsız vurgu
- Her işlem sonrasında geniş kapsamlı yeniden veri yükleme
- Tek bir yaklaşık 2.000 satırlık client component içinde toplanan ekran sorumlulukları

## 2. Tasarım ilkeleri

1. **Görev önce:** Ana ekran, kullanıcının sıradaki eylemini göstermeli.
2. **Tanıdık ama daha düzenli:** Mevcut kavramlar korunmalı; yalnızca gruplama ve sunum iyileştirilmeli.
3. **Mobil birincil:** 375 px sonradan küçültülmüş desktop görünümü değil, kendi navigasyonu ve veri sunumu olan bir hedef olmalı.
4. **Bir ekranda tek ana aksiyon:** Uzun liste, form ve birden çok baskın CTA aynı alanda yarışmamalı.
5. **Renk dekorasyon değil semantik:** Bölüm vurgusu, durumlar ve yıkıcı işlemler dışında renk sayısı sınırlandırılmalı.
6. **Sunucu otoritesi:** UI görünürlüğü yetkilendirme değildir; rol ve bölüm erişimi sunucuda doğrulanmalıdır.
7. **Dikey dilimler:** Büyük yeniden yazım yerine her aşama tek başına yayınlanabilir olmalı.

## 3. Kanıtlanmış mevcut durum

### Canlı mobil inceleme — 375 × 812

- Sayfa seviyesinde genel yatay taşma yok.
- Header eski üç satırlı durumdan düzelmiş; buna karşılık başlık “G.” seviyesine kadar kısalıyor.
- Header ikon butonları 36 × 36 px.
- Mobil tab butonları yaklaşık 34 px yüksekliğinde.
- Tab şeridi 328 px görünür alan içinde 634 px içerik genişliğine sahip; kaydırılabilir olduğuna dair belirgin affordance yok.
- Program tablosu 280 px container içinde 587 px genişliğe sahip.
- Normal kullanıcı görev ekranında 95 görev kaydı aynı sayfada listeleniyor.
- Görev bildirme formu uzun görev listesinin altında yer alıyor.
- Görev formundaki yedi label için `htmlFor` bağlantısı bulunmadı.

### Canlı tablet inceleme — 768 × 1024

- Sayfa seviyesinde genel yatay taşma yok.
- Header ve navigasyon kontrollerinin çoğu 36–38 px yüksekliğinde.
- Form inputları 36 px yüksekliğinde.

### Canlı tarayıcı uyarıları

- Üç `DialogContent` için eksik `Description` veya `aria-describedby` uyarısı gözlendi.

### Kaynak taraması

- `src/app/page.tsx` yaklaşık 2.000 satır.
- Yaklaşık 402 hard-coded renk sınıfı eşleşmesi bulundu.
- Yalnızca yaklaşık 10 `dark:` sınıfı bulundu; dark mode ağırlıklı olarak semantik token sistemiyle kurulmamış.
- Mevcut veri yükleme akışı çok sayıda endpoint'i birlikte yeniden çağırıyor.

Bu ölçümler, eski `.impeccable` raporlarındaki her bulgunun hâlâ geçerli olduğu anlamına gelmez. Son commit'lerle düzeltilmiş mobil header ve onay dialogu gibi noktalar yeniden açılmayacaktır.

## 4. Kullanıcı rolleri ve ana hedefler

### Araştırma görevlisi

- Kendi puanını ve sırasını anlamak
- Atanan görevi kabul veya reddetmek
- Yaptığı görevi bildirmek
- Kendi görev geçmişini aramak
- Programını ve sınavlarını görmek
- Duyurulara erişmek

### Temsilci

- Bekleyen görevleri ve değişiklikleri hızlıca görmek
- Görev ve gözetmen atamak
- Personel ve puan baremlerini yönetmek
- Import/export ve dönem yönetimini güvenli biçimde yürütmek

### Bölüm başkanı

- Kendi bölümünün iş yükü ve puan dağılımını görmek
- Bölüm kapsamındaki yönetim işlemlerini yapmak

### Dekan

- GMİM ve DUİM arasında açık bağlam göstergesiyle geçiş yapmak
- Fakülte genelini görebilmek
- Yanlış bölümde işlem yapma riskini azaltan güçlü bölüm bağlamına sahip olmak

## 5. Bilgi mimarisi

### Desktop

Kalıcı fakat rol bazlı sol navigasyon:

```text
Çalışma
  Ana Sayfa
  Görevler
  Takvim
  Duyurular

Yönetim — yalnız yetkili roller
  Personel
  Onaylar
  Veri Aktarımı
  Puan Baremleri
  Dönem Yönetimi
```

Sol navigasyon geniş ekranlarda açık, orta ekranlarda daraltılabilir olur. Araştırma görevlisi gereksiz yönetim başlıklarını görmez.

### Mobil

Alt navigasyonda dört hedef:

1. Ana Sayfa
2. Görevler
3. Takvim
4. Daha

`Daha` sheet'i role göre şunları gösterebilir:

- Duyurular
- Personel
- Onaylar
- Veri Aktarımı
- Puan Baremleri
- Dönem Yönetimi
- Şifre ve görünüm ayarları

Kritik bekleyen işler yalnız `Daha` içine saklanmaz. Badge ve ana sayfadaki eylem kartlarıyla görünür kalır.

### URL yapısı

Sekme state'i yerine URL tabanlı sayfalar:

```text
/dashboard
/tasks
/calendar
/announcements
/people
/management/approvals
/management/import
/management/categories
/management/periods
```

Bu yapı geri tuşu, yenileme, deep-link, analitik ve aktif navigasyonu doğal hale getirir.

## 6. Ana sayfa tasarımı

Ana sayfa rol bazlı fakat ortak bir hiyerarşi kullanır:

1. Tarih, kullanıcı adı, bölüm ve rol bağlamı
2. “Bugünün önceliği” alanı
3. Bekleyen eylemler
4. Kısa puan/iş yükü özeti
5. Son hareketler
6. Gerekli olduğunda duyuru veya yaklaşan sınav

### Araştırma görevlisi ana sayfası

- Yanıt bekleyen görev
- Yaklaşan sınav/program
- Kendi puanı ve sırası
- Son görevler
- “Görev bildir” ana aksiyonu

### Yönetici ana sayfası

- Onay bekleyen görevler
- Gözetmen açığı
- Bekleyen daimi görev değişiklikleri
- Bölüm puan dağılımı
- Son import/dönem işlemleri

## 7. Görevler akışı

### Liste

- İlk yüklemede sınırlı sayıda kayıt
- Server-side sayfalama veya cursor
- Metin arama
- Durum, tarih, kişi ve kategori filtresi
- Filtreler URL query parametrelerinde
- Mobilde kart, desktopta yoğun fakat okunabilir liste/table görünümü

### Görev bildirme/atama

- Mobilde bottom sheet
- Desktopta dialog veya sağ panel
- Uzun listenin altında inline form yok
- Form açıldığında açıklama alanına odak
- Gerçek `label`/`htmlFor` ilişkileri
- Alan altında validasyon mesajı
- İlk hataya otomatik odak
- Submit sırasında tekrar gönderme engeli
- Başarıdan sonra yalnız ilgili query'lerin yenilenmesi

### Puan güvenliği

- Kullanıcının kendi bildirimi her zaman pending
- Yöneticinin atadığı görev assignee yanıtı bekler
- Auto/import kaynakları istemci tarafından seçilemez
- Puan değişiklikleri sunucu transaction'ı tamamlanmadan UI'da kesinleşmiş gösterilmez

## 8. Takvim, sınav ve program

Takvim tek navigasyon hedefi olur fakat iç yapıda iki görünüm korunur:

- Sınavlar
- Haftalık program

Bu iki domain birleştirilmez; yalnızca zaman odaklı aynı üst alanda gruplanır.

### Desktop

- Program tablo olabilir.
- Sınavlar tarih sıralı liste/takvim görünümü kullanabilir.
- Çakışma ve gözetmen durumu satır içinde görünür.

### Mobil

- Program tablosu gün–saat–ders kartlarına dönüşür.
- Sınav kartları ders, tarih, saat, sınıf ve durum bilgisini öncelik sırasıyla gösterir.
- Yatay kaydırma temel etkileşim olmaz.

## 9. Görsel sistem

### Tasarım karakteri

**Sakin, kurumsal, görev odaklı.** Dekoratif gösteriden çok veri okunabilirliği ve güven hissi.

### Önerilen çekirdek palet

- Kurumsal koyu yüzey: `#112B3C`
- GMİM vurgu: `#0F766E`
- DUİM vurgu: `#2563EB`
- Uygulama zemini: `#F6F8FA`
- Kart/yüzey: `#FFFFFF`

Bu değerler İTÜ'nün resmî marka paleti olarak iddia edilmez. Uygulama öncesinde kurumun güncel görsel kimlik kılavuzuyla karşılaştırılmalıdır. Uyuşmazlık varsa semantik token isimleri korunarak değerler değiştirilir.

### Semantik tokenlar

```text
background
surface
surface-muted
text-primary
text-secondary
border
accent-department
success
warning
danger
focus
```

Page/component kodunda doğrudan bölüm renkleri yerine token kullanılır.

### Tipografi

- Tek bir modern sans-serif aile
- Başlık, bölüm başlığı, gövde ve yardımcı metin için sınırlı ölçek
- Puan ve sıra değerlerinde tabular numerals
- Tamamı büyük harf yalnız kısa meta etiketlerinde
- Uzun açıklamalar için en az 1.5 satır yüksekliği

### Bileşen karakteri

- 10–12 px radius
- Gölgeler yerine sınır, zemin ve boşluk
- Bir kartta en fazla bir baskın renk
- Gradient yalnız marka anı veya özel üst yüzeyde; veri kartlarında kullanılmaz
- Badge renk + metin + gerektiğinde ikon içerir
- Birincil buton bölüm accent'i; yıkıcı buton her zaman danger semantiği

### Dark mode

Dark mode ayrı hard-coded class yığınıyla değil aynı semantik tokenların dark değerleriyle çalışır. Light ve dark modda tüm durum renkleri WCAG kontrast kontrolünden geçer.

## 10. Responsive kurallar

Test genişlikleri:

- 320 px
- 375 px
- 390 px
- 768 px
- 1024 px
- 1440 px

Kabul kuralları:

- Sayfa seviyesinde yatay taşma yok.
- Geniş tablo zorunluysa açık scroll affordance ve sabit öncelikli sütunlar bulunur.
- Birincil dokunma hedefleri en az 44 × 44 px.
- Mobilde bir ekranda tek baskın CTA.
- Formlar mobilde tek sütun; bağlı kısa alanlar yalnız yeterli genişlikte iki sütuna çıkar.
- Header bölüm ve kullanıcı bağlamını anlamsız tek harfe düşürmez.
- Bottom navigation safe-area inset'i destekler.
- Klavye açıldığında sheet aksiyonları erişilebilir kalır.

## 11. Yıkıcı işlemler

### Normal yıkıcı işlem

Görev veya duyuru silme:

- Nesnenin adı
- Etki özeti
- Vazgeç ve sil aksiyonları
- Uygunsa kısa süreli undo

### Yüksek riskli işlem

Dönem sıfırlama, toplu veri değişikliği veya kalıcı silme:

- Etkilenecek bölüm ve kayıt sayısı
- İşlemin geri alınabilirlik durumu
- Bölüm adını yazarak doğrulama
- Yeniden kimlik doğrulama
- Sunucu audit kaydı
- Başarılı yedek/dry-run kontrolü

Frontend onayı, sunucu yetkilendirmesinin yerine geçmez.

## 12. Uygulama mimarisi

### Hedef klasörler

```text
src/
  app/
    dashboard/
    tasks/
    calendar/
    announcements/
    people/
    management/
  features/
    auth/
    tasks/
    exams/
    schedule/
    announcements/
    personnel/
    periods/
    import-export/
  components/
    app-shell/
    navigation/
    responsive/
  lib/
    auth/
    authorization/
    validation/
    api/
```

Bu hedef big-bang taşıma anlamına gelmez. Her route/feature davranış eşdeğerliği korunarak tek tek çıkarılır.

### Ortak UI bileşenleri

- `AppShell`
- `DesktopSidebar`
- `MobileBottomNav`
- `RoleAwareNav`
- `PageHeader`
- `ResponsiveDialog`
- `ResponsiveDataView`
- `StatusBadge`
- `EmptyState`
- `ErrorState`
- `OfflineState`
- `LoadingSkeleton`
- `DestructiveActionDialog`

### Veri akışı

- Session, rol ve bölüm sunucudan gelir.
- TanStack Query feature bazlı query key kullanır.
- Mutation sonrası yalnız etkilenen cache alanları invalidate edilir.
- Form schema'ları mümkün olduğunda client/server ortak Zod tanımı kullanır.
- API response'ları açık DTO ile sınırlandırılır.
- Optimistic update yalnız geri alınması kolay ve puan/rol/dönem içermeyen işlemlerde kullanılır.

## 13. Hata ve durum tasarımı

Standart hata kodları:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `CONFLICT`
- `RATE_LIMITED`
- `SERVER_ERROR`

Davranışlar:

- Auth hatası login'e yönlendirir ve güvenli dönüş hedefi tutar.
- Yetki hatası işlemi geri alır ve açık açıklama verir.
- Validasyon hatası alan altında gösterilir ve ilk hataya odaklanır.
- Conflict kullanıcıya güncel veriyi yükleme olanağı verir.
- Rate limit yeniden deneme süresini bildirir.
- Server error güvenli mesaj ve takip kimliği gösterir.

Her ana sayfa için şu durumlar tasarlanır:

- İlk yükleme
- Yeniden doğrulama
- Boş durum
- Kısmi hata
- Tam hata
- Offline
- Başarı

## 14. Erişilebilirlik

- Bütün ikon butonlarda erişilebilir ad
- Bütün inputlarda gerçek label bağlantısı
- Dialog başlık ve açıklama ilişkisi
- Açılışta mantıklı odak; kapanışta tetikleyiciye dönüş
- Focus-visible halkası
- Renk dışında durum metni
- Reduced-motion desteği
- Klavye ile bütün navigasyon ve menüler
- Ekran okuyucuda canlı başarı/hata duyurusu
- WCAG 2.2 AA kontrast hedefi
- Pointer hedeflerinde 44 × 44 px ürün standardı

## 15. Performans hedefleri

- 95 görev ilk render'da tamamı DOM'a eklenmez.
- Görev listesi sayfalı veya cursor tabanlı olur.
- Bir mutation sekiz endpoint'in tamamını yeniden çağırmaz.
- Büyük feature ekranları route bazında yüklenir.
- Kullanılmayan editor/chart bağımlılıkları ana bundle'a girmez.
- Görseller için gereksiz yüksek çözünürlük kullanılmaz.
- Skeleton gerçek yerleşime yakın olup layout shift üretmez.

Kesin Core Web Vitals bütçesi, production ölçümü alındıktan sonra performans planında belirlenecektir; bu spec ölçülmemiş sayı uydurmaz.

## 16. Test stratejisi

### Unit

- Navigasyon görünürlük matrisi
- Status badge eşlemeleri
- Form schema'ları
- Tarih ve puan formatlama

### Integration

- Session ve role/department erişimi
- Görev mutation + cache invalidation
- GMİM/DUİM bağlam geçişi
- Conflict ve rate-limit cevapları

### Component

- Responsive dialog/sheet
- Klavye ve odak yönetimi
- Form hata davranışı
- Empty/loading/error durumları

### E2E

- Araştırma görevlisi: login → görev bildir → pending gör
- Araştırma görevlisi: atanan görevi kabul/reddet
- Temsilci: görev onayla → puan güncellemesini gör
- Yönetici: sınav/gözetmen akışı
- Dekan: bölüm değiştir ve bağlamı doğrula
- Yıkıcı işlem: doğrulama olmadan tamamlanamama

### Görsel ve erişilebilirlik

- 320/375/390/768/1024/1440 screenshot karşılaştırmaları
- Axe taraması
- Yalnız klavye smoke test
- Light/dark ve GMİM/DUİM token kombinasyonları

## 17. Uygulama sırası

UI çalışması teknik güvenlik planının önüne geçmez.

1. Session ve authorization temelinin tamamlanması
2. Tasarım tokenları ve AppShell
3. URL tabanlı navigasyon
4. Dashboard dikey dilimi
5. Görevler dikey dilimi
6. Takvim/sınav/program dikey dilimi
7. Duyurular ve personel
8. Yönetim araçları
9. Dark mode ve görsel tutarlılık turu
10. Erişilebilirlik, responsive ve performans kapanış turu

Her dilim lint, typecheck, test, build ve hedef viewport kontrolünden geçmeden sonraki dilime başlanmaz.

## 18. Dış göz / adversarial inceleme

### İtiraz 1 — Küçük sistem için sidebar fazla ağır olabilir

**Risk:** Araştırma görevlisi yalnız birkaç alan kullanırken desktop sidebar gereksiz kurumsal yazılım hissi yaratabilir.

**Karar:** Sidebar rol bazlı ve kısa tutulur. Normal kullanıcı dört ana hedef görür; yönetim grubu hiç render edilmez. 1024 px civarında daraltılabilir. Böylece sekme kalabalığı çözülürken gereksiz menü üretilmez.

### İtiraz 2 — Sınav ve programı “Takvim” altında birleştirmek kavramları karıştırabilir

**Risk:** Kullanıcı sınav ataması ile haftalık ders programını aynı veri türü sanabilir.

**Karar:** Yalnız üst navigasyon birleşir. Sayfa içinde açık “Sınavlar” ve “Haftalık Program” alt görünümleri korunur; veri modelleri ve aksiyonlar birleşmez.

### İtiraz 3 — Mobil `Daha` önemli özellikleri saklayabilir

**Risk:** Duyurular veya bekleyen yönetici işlemleri keşfedilemeyebilir.

**Karar:** Bekleyen kritik işler ana sayfada ve bottom-nav badge'lerinde görünür. `Daha` yalnız düşük frekanslı hedeflerin yeridir; acil eylemler oraya gömülmez.

### İtiraz 4 — Güvenlik dönüşümü ve redesign aynı anda regresyon yaratabilir

**Risk:** Auth, route ve UI birlikte değişirse hatanın kaynağı bulunamaz.

**Karar:** Önce session/authorization davranışı mevcut UI ile doğrulanır. AppShell ve route dönüşümü bundan sonra ayrı dikey dilimlerle yapılır. Büyük tek PR oluşturulmaz.

### İtiraz 5 — Önerilen renkler resmî İTÜ kimliğiyle uyuşmayabilir

**Risk:** Teknik olarak güzel ama kurumsal açıdan yanlış palet oluşabilir.

**Karar:** Paletteki hex değerleri proposal'dır. Uygulama öncesi güncel kurum kılavuzu doğrulanır. Tasarım semantik token kullandığı için renk değişimi mimariyi bozmaz.

### İtiraz 6 — Dark mode bu ölçekte gereksiz kapsam yaratabilir

**Risk:** Her durumun iki temada test edilmesi uygulama maliyetini artırır.

**Karar:** Dark mode mevcut üründe bulunduğu için korunur, fakat feature geliştirmesinden önce değil token altyapısıyla birlikte ele alınır. Kısmi ve kırık tema yayınlanmaz.

### İtiraz 7 — URL route dönüşümü kullanıcı alışkanlığını bozabilir

**Risk:** Mevcut aktif sekme/localStorage davranışı kaybolabilir.

**Karar:** Eski giriş hedefi `/dashboard`'a yönlenir. Rol bazlı varsayılan açılış korunur. Geri tuşu ve deep-link yeni kazanım olarak test edilir.

### İtiraz 8 — Tasarımın kapsamı tek uygulama planı için fazla büyük

**Risk:** Güvenlik, data, UI ve refactor aynı backlog içinde kontrolsüz büyür.

**Karar:** Bu spec yalnız UI/UX hedef durumunu tanımlar. Güvenlik ve veri bütünlüğü `TEKNIK_ANALIZ_RAPORU_2026-07-11.md` üzerinden ayrı planlanır. Uygulama planı AppShell, Dashboard, Tasks, Calendar ve Management şeklinde ayrı teslim dilimlerine bölünür.

## 19. Kapsam dışı

- Bu spec production veritabanı migration tasarımını ayrıntılandırmaz.
- Yeni bir mobil native uygulama önermez.
- Üniversitenin resmî marka kılavuzunu değiştirmez.
- Bütün ekranları tek seferde yeniden yazmayı önermez.
- Yeni özellik olarak mesajlaşma, dosya depolama veya gelişmiş analitik eklemez.
- Auth güvenlik açıklarını UI gizleme yoluyla çözmeye çalışmaz.

## 20. Başarı ölçütü

Çalışma tamamlandığında:

- Normal kullanıcı ana görevlerine desktop ve mobilde görünür navigasyonla erişir.
- 375 px'de header, navigasyon, görev listesi, program ve formlar yatay taşma olmadan kullanılabilir.
- Uzun görev listesi sayfalıdır ve görev formu ayrı akıştadır.
- Program mobilde kart, desktopta tablo görünümündedir.
- Bütün ana kontroller klavye ve ekran okuyucuyla kullanılabilir.
- Role/department görünürlüğü session tabanlı veriyle uyumludur.
- Renkler semantik token sisteminden gelir.
- Bir mutation yalnız ilgili veriyi yeniden doğrular.
- Her dikey dilim bağımsız test ve rollback sınırına sahiptir.

---

Bu spec, kullanıcı tarafından onaylanan hibrit tasarım yönünü tanımlar. Uygulamaya geçmeden önce ayrıntılı uygulama planına dönüştürülmeli ve commit sınırları ayrıca belirlenmelidir.
