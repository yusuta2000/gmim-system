// Yöneticilere gösterilen değişiklik günlüğü (Raporlar → Değişiklikler).
// Her kullanıcıya görünen değişiklikte EN ÜSTE yeni bir kayıt eklenir (bkz. CLAUDE.md / AGENTS.md).
// Metinler yöneticinin anlayacağı günlük dille yazılır: dosya adı, kod, teknik terim yok.

export type ChangelogEntry = {
  id: string
  date: string // YYYY-MM-DD
  type: 'major' | 'minor'
  title: string
  summary: string
  added: string[]
  fixed: { before: string; after: string }[]
  howTo: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-11-24-exam-barem',
    date: '2026-11-24',
    type: 'major',
    title: 'Gözetmenlik puanları artık doğru baremden veriliyor',
    summary: 'Takvim\'den gözetmen atarken hangi puan baremiyle atama yapılacağını görüp seçebiliyorsunuz. Aynı kişiye aynı gün sınav verirken sistem uyarıyor, takvimdeki sınavlar silinebiliyor. Eski kayıtları kontrol etmek için bu sayfaya bir kontrol listesi eklendi.',
    added: [
      'Takvim\'de bir sınava tıklayınca "Puan baremi" seçimi çıkıyor. Sınavlarla ilgili tüm barem kalemleri puanlarıyla listeleniyor ve sınava en uygun olan "(önerilen)" yazısıyla seçili geliyor. İsterseniz başka bir kalem seçebilirsiniz.',
      'Sistemin önerisi şöyle belirleniyor: Cumartesi ve Pazar günleri haftasonu baremi; hafta içi sabah 08:30\'dan önce veya akşam 17:00\'den sonra başlayan sınavlar "mesai dışı" baremi; matematik, fizik, kimya, Türkçe ve Atatürk İlkeleri sınavları "havuz dersleri" baremi; yeterlik sınavları "Yeterlik sınavı" baremi. Sınavın yeri olarak Maslak yazılmışsa Maslak baremleri, yazılmamışsa Tuzla baremleri öneriliyor.',
      'Bir kişiye aynı gün ikinci bir sınav verirken "Bu, kişinin bugünkü 2. sınavı olacak, yine de atansın mı?" diye soruluyor. Aynı sınav aynı kişiye ikinci kez veriliyorsa ayrıca "iki kez puan alabilir" uyarısı çıkıyor.',
      '"Uygun gözetmenleri ata" düğmesi, o gün aynı sınavda ya da aynı saatte başka bir sınavda görevi olan kişiyi seçmiyor.',
      'Takvim\'deki sınavlar "Sınavı sil" düğmesiyle silinebiliyor.',
      'Yöneticiler için bu Raporlar sayfası eklendi: yapılan değişiklikler ve gözetmenlik kontrol listesi.',
    ],
    fixed: [
      {
        before: 'Takvim\'den atanan her gözetmenliğe, sınav ne olursa olsun 4 puan yazılıyordu. Örneğin 1 puanlık "Tuzla haftaiçi 1 sınav" görevine de 4 puan yazılıyordu.',
        after: 'Puan, atama sırasında seçilen baremden geliyor.',
      },
      {
        before: 'Aynı sınav hem Görevler ekranından hem Takvim\'den girilince kişi iki kez puan alabiliyordu ve sistem bunu fark etmiyordu.',
        after: 'Aynı gün sınav atanırken sistem uyarıyor; aynı sınav tekrar girilirse ayrıca "iki kez puan" uyarısı çıkıyor.',
      },
      {
        before: 'Takvim\'e eklenen bir sınav silinemiyordu.',
        after: '"Sınavı sil" ile silinebiliyor. Henüz kabul edilmemiş gözetmenlik görevleri de siliniyor (bunlara zaten puan verilmemişti). Kabul edilmiş görevler ve puanları olduğu gibi kalıyor.',
      },
    ],
    howTo: [
      'Takvim\'de sınava tıklayın, "Puan baremi"nin doğru olduğunu kontrol edin, sonra kişiyi seçip "Gözetmen ekle" deyin ya da "Uygun gözetmenleri ata" düğmesini kullanın.',
      '"Bugünkü 2. sınavı" uyarısı çıkarsa yazan görevi okuyun. Başka bir sınavsa "Yine de ata" deyin; aynı sınavsa vazgeçin.',
      'Bir sınavı silmek için sınava tıklayıp "Sınavı sil" deyin. Kabul edilmiş bir görevin puanı da geri alınmalıysa o görevi Görevler ekranından ayrıca silin.',
      'Eski kayıtları kontrol etmek için Raporlar sayfasında "Gözetmenlik kontrol listesi"ni açın. Bu liste hiçbir kaydı değiştirmez. Fazla olan görevleri Görevler ekranından silebilir, eksik ya da fazla puanları elle düzeltebilirsiniz.',
    ],
  },
]
