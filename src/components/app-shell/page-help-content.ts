// Short how-to text shown to managers from the "?" button, keyed by page path.
export type PageHelp = { title: string; items: string[] }

const PAGE_HELP: Record<string, PageHelp> = {
  '/dashboard': {
    title: 'Ana Sayfa',
    items: [
      'Üstteki kart bölümdeki en acil işi gösterir: onay bekleyen görevler veya gözetmeni eksik sınavlar. Butonu ilgili ekranı açar.',
      'Kutucuklar bölümün toplam görev, onay bekleyen kayıt, gözetmen açığı ve bekleyen daimi görev değişikliği sayılarını verir.',
      'Altta son görev kayıtları ve yaklaşan sınavlar listelenir.',
    ],
  },
  '/points': {
    title: 'Puan Tablosu',
    items: [
      'Bölümdeki araştırma görevlisi ve temsilcilerin puanları; en düşük puanlı kişi yeni görevlendirmede ilk önceliktir.',
      'Bir kişiye tıklayınca onaylı görev sayısı ve kategori dağılımı açılır.',
      'Pasif kullanıcılar sıralamaya dahil edilmez.',
      '"Excel indir" sıralamayı dosya olarak verir.',
    ],
  },
  '/tasks': {
    title: 'Görevler',
    items: [
      '"Görev oluştur" → Görev ata: yapılacak iş; kişi Görevler ekranında kabul edince puan eklenir.',
      '"Görev oluştur" → Kayıt bildir: yapılmış iş; Onaylar ekranında onaylanınca puan eklenir. "Puanı temsilci belirlesin" işaretlenirse puanı onaylayan girer.',
      'Filtrelerle açıklama, durum, kişi, kategori ve tarih aralığına göre arayın.',
      'Çöp kutusu kaydı siler; onaylı puan varsa geri alınır. Gözetmenlik görevi silinirse kişi sınavdan da çıkar.',
      'Size atanan görevi Kabul / Reddet ile yanıtlarsınız.',
    ],
  },
  '/calendar': {
    title: 'Takvim',
    items: [
      '"Sınavlar" ve "Haftalık program" sekmeleri; Ay, Hafta ve Ajanda görünümleri arasında geçebilirsiniz.',
      '"Sınav ekle" ile ders, tarih, saat ve gerekli gözetmen sayısını girin.',
      'Sınava tıklayınca ayrıntı penceresi açılır: gözetmenler ve durumları (Kabul etti / Yanıt bekleniyor) ile reddedenler.',
      'Pencerede kişiyi seçip "Gözetmen ekle" deyin. "Uygun gözetmenleri ata" en düşük puanlı ve programı müsait kişileri otomatik seçer.',
      'Gözetmenlik puanı kişi Görevler ekranında kabul edince eklenir; reddederse sınavdan çıkar ve açık yeniden oluşur.',
      '"Program ekle" ile ar.görlerin ders saatlerini girin; otomatik atama çakışan kişiyi seçmez.',
    ],
  },
  '/announcements': {
    title: 'Duyurular',
    items: [
      '"Yeni duyuru" bölümün tüm aktif araştırma görevlisi ve temsilcilerine bildirim ve e-posta olarak gider.',
      'Duyurulara yorum yapılabilir; yorum gelince duyuruyu yazana bildirim gider.',
    ],
  },
  '/people': {
    title: 'Personel',
    items: [
      '"Yeni araştırma görevlisi" kişiyi bu bölüme ekler; başlangıç puanı bölümün ortalamasıdır.',
      'Kişi kartında: Pasif yap / Aktif yap, Temsilci yap / Temsilciliği kaldır, Parola sıfırla.',
      '"Kaldır" kişiyi ve kayıtlarını kalıcı olarak siler; çoğu durumda "Pasif yap" daha güvenlidir.',
      'Daimi görevler kart üzerinden eklenir veya silinir.',
    ],
  },
  '/management/approvals': {
    title: 'Onaylar',
    items: [
      'Ar.görlerin "Kayıt bildir" ile gönderdiği görevler burada onay bekler.',
      'Puan kutusunda kişinin girdiği puan gelir; gerekirse değiştirin. "Puanı siz belirleyin" yazıyorsa puanı girmeden onaylanamaz.',
      '"Onayla" puanı kişiye ekler ve e-posta gönderir; "Reddet" puan eklemeden kapatır.',
      'Daimi görev değişiklik talepleri de bu ekranda onaylanır.',
    ],
  },
  '/management/import': {
    title: 'Veri Aktarımı',
    items: [
      'Ana takip Excel dosyasını seçip önizleyin; kişi bazında mevcut ve Excel puanlarını karşılaştırın.',
      '"Senkronize et" bölümün tüm görevlerini Excel ile değiştirir. Sayılar doğru değilse onaylamayın.',
    ],
  },
  '/management/categories': {
    title: 'Puan Baremleri',
    items: [
      'Görev türlerinin standart puanları. Görev oluştururken kategori seçilince puan otomatik gelir.',
      'Baremler GMİM ve DUİM için ortaktır; değişiklik iki bölümü de etkiler.',
    ],
  },
  '/management/periods': {
    title: 'Dönem Yönetimi',
    items: [
      'Yeni döneme geçişte puanları taşıyın veya sıfırlayın.',
      'Onay için bölüm adını yazıp şifrenizi girmeniz gerekir. İşlem geri alınamaz.',
    ],
  },
  '/management/absence': {
    title: 'Yurtdışı Telafisi',
    items: [
      'Dönen kişiyi ve gidiş/dönüş tarihlerini seçip "Hesapla" deyin; diğerlerinin o aralıktaki puanları listelenir ve en düşüğü bulunur.',
      'Kendisi de yurtdışında olan veya aralık içinde eklenen kişiler otomatik hariç tutulur; işaretleri elle değiştirebilirsiniz.',
      '"Telafi puanını ekle" puanı onaylı görev olarak ekler. Aynı aralık iki kez eklenemez.',
    ],
  },
}

export function pageHelpFor(pathname: string): PageHelp | null {
  return PAGE_HELP[pathname.replace(/\/+$/, '') || '/'] ?? null
}
