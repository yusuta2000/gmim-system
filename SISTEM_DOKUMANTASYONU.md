# GMIM Ar.Gör Yönetim Sistemi — Teknik Dokümantasyon

Bu doküman, sistemi sıfırdan anlayan bir yazılımcının kodu okumadan önce sistemi kurabilmesi, güncelleyebilmesi ve bakımını yapabilmesi için hazırlanmıştır.

---

## 1. Sistem Hakkında

**Amaç:** İTÜ Denizcilik Fakültesi GMI bölümü araştırma görevlilerinin görev dağıtımını, puan takibini, sınav gözetmen atamasını ve haftalık program yönetimini dijitalleştirmek. Daha önce Excel ile yapılan işlemlerin yerini almıştır.

**Canlı Site:** https://itugmimportal.vercel.app  
**Eski Adres (hala çalışır):** https://my-project-ashy-theta.vercel.app  
**GitHub Repo:** https://github.com/yusuta2000/gmim-system

---

## 2. Teknoloji Mimarisi

| Bileşen | Teknoloji | Ücretsiz Plan Limiti |
|---------|-----------|---------------------|
| Frontend | Next.js 16 + React + TypeScript | — |
| UI Kütüphanesi | shadcn/ui + Tailwind CSS | — |
| Backend | Next.js API Routes (Serverless) | — |
| Veritabanı | PostgreSQL (Neon) | 0.5 GB depolama |
| ORM | Prisma 6.19 | — |
| Hosting | Vercel (Hobby plan) | 100 GB/ay bant |
| Kod Deposu | GitHub (public repo) | Sınırsız |
| AI | z-ai-web-dev-sdk (LLM) | — |

**Çalışma mantığı:** Tam serverless mimari. Her API route'u Vercel'de ayrı bir serverless function olarak çalışır. Veritabanı Neon'da barındırılır.

---

## 3. Kullanıcı Rolleri

| Rol | Kod | Erişim | Giriş Bilgileri |
|-----|-----|--------|-----------------|
| Temsilci | `admin` | Tam yönetim + tüm sekmeler | ymutlu@itu.edu.tr / tarik2026 |
| Dekan | `dekan` | Temsilci ile aynı erişim (yönetici) | arslano@itu.edu.tr / dekan2026 |
| Bölüm Başkanı | `baskan` | Temsilci ile aynı erişim (yönetici) | bzincir@itu.edu.tr / burak2026 |
| Araş Gör | `user` | Sınırlı (kendi verileri + duyuru) | cenkkaya@itu.edu.tr / cenk2026 |

**Önemli kurallar:**
- Dekan ve Bölüm Başkanı puan/görev listelerinde görünmez, sadece Personel sekmesinde "Yönetim" bölümünde en üstte yer alır
- `isManager = admin || dekan || baskan` → tüm yönetim yetkileri
- `canEdit = isManager` → düzenleme yapabilen roller
- `canSeeAll = isManager` → tüm kullanıcıların verilerini görebilen roller
- Ar.Gör sadece kendi görev geçmişini, kendi profilini ve kendi haftalık programını görür

---

## 4. Veritabanı Şeması (Prisma)

Şema dosyası: `prisma/schema.prisma`

### Modeller:

**ResearchAssistant** — Kullanıcılar
- id, name, email (unique), phone, faculty, department
- totalPoints (int), order (int), isActive (bool), role (string), password (string?)
- İlişkiler: tasks, permanentDuties, pendingDutyChanges, examAssignments, weeklySchedule, notifications, announcements, announcementComments

**Task** — Görevler
- id, number (int), description, hoursWorked, date, points (int)
- status: `pending` | `assigned` | `approved` | `rejected`
- source: `external` | `temsilci_assigned` | `auto_assigned` | `import`
- assignedBy, notes, assistantId, categoryId

**Görev Durumu Akışı:**
```
Ar.Gör bildirimi → pending → (temsilci onayı) → approved (puan eklenir)
Temsilci ataması → assigned → (ar.gör kabul) → approved (puan eklenir)
                                → (ar.gör red) → rejected (puan eklenmez)
Otomatik/içe aktarma → approved (direkt)
```

**PointCategory** — Puan baremleri (id, name, points, description, isActive)

**PermanentDuty** — Daimi görevler (id, name, description, order, assistantId)

**PendingDutyChange** — Daimi görev değişiklik talepleri
- changeType: `add` | `edit` | `delete`
- status: `pending` | `approved` | `rejected`
- Ar.Gör değişiklik talep eder → temsilci onaylar → kalıcı görev değişir

**Exam** — Sınavlar (courseCode, courseName, instructor, date, day, timeSlot, requiredSupervisors)

**ExamSupervisor** — Sınav gözetmen ataması (examId, assistantId)

**WeeklySchedule** — Haftalık program (dayOfWeek 1-7, timeSlot, description, assistantId)

**Announcement** — Duyurular (title, content, authorId, createdAt)
**AnnouncementComment** — Duyuru yorumları (announcementId, authorId, content)

**Notification** — Bildirimler (title, message, type, isRead, assistantId)

**ImportLog** — İçe aktarma kayıtları

---

## 5. Tüm API Endpoint'leri

### Kimlik Doğrulama
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/login` | Giriş (email + password → user objesi) |
| PUT | `/api/change-password` | Kendi şifresini değiştir (assistantId, currentPassword, newPassword) |
| PUT | `/api/reset-password` | Temsilci şifre sıfırlar (assistantId, newPassword, requesterId) |

### Kullanıcı Yönetimi
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/assistants` | Tüm araş görleri listeler (ilişkilerle) |
| POST | `/api/add-assistant` | Yeni ar.gör ekle (yeni kullanıcıya ortalama puan atanır) |
| DELETE | `/api/remove-assistant?id=X&requesterId=Y` | Ar.gör kaldır (admin/dekan/baskan) |
| PUT | `/api/toggle-active` | Aktif/pasif yap (assistantId, isActive) |
| PUT | `/api/toggle-role` | Temsilci yap/kaldır (assistantId, requesterId) — dekan/baskan korumalı |

### Görev Yönetimi
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/tasks` | Tüm görevleri listele |
| POST | `/api/tasks` | Görev oluştur (status kaynak'a göre belirlenir) |
| DELETE | `/api/delete-task?id=X&requesterId=Y` | Görev sil (puan düşürür) |
| PUT | `/api/respond-task` | Ar.gör görevi kabul/red et (taskId, action, responderId) |
| PUT | `/api/approve-task` | Temsilci onay/red (taskId, action, reviewerId) |

### Daimi Görevler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/pending-duty` | Bekleyen değişiklik talepleri |
| POST | `/api/pending-duty` | Değişiklik talebi (ar.gör) veya direkt değişiklik (manager) |
| PUT | `/api/pending-duty` | Talep onay/red (changeId, action, reviewerId) |

### Sınavlar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/exams` | Tüm sınavları listele |
| POST | `/api/exams` | Yeni sınav ekle |
| POST | `/api/supervisor-assign` | Otomatik gözetmen ata (en az puanlı + çakışma kontrolü) |

### Haftalık Program
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/weekly-schedule` | Tüm program |
| POST | `/api/weekly-schedule` | Program ekle (çakışma kontrolü) |
| DELETE | `/api/weekly-schedule?id=X` | Program sil |

### Duyurular
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/announcements` | Tüm duyurular + yorumlar |
| POST | `/api/announcements` | Yeni duyuru (manager only) |
| PUT | `/api/announcements` | Yorum ekle (announcementId, content, authorId) |
| DELETE | `/api/announcements?id=X&requesterId=Y` | Duyuru sil (manager only) |

### Diğer
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/categories` | Puan baremleri |
| GET/PUT | `/api/notifications` | Bildirim listele / okundu işaretle |
| POST | `/api/ai-classify` | AI ile görev kategorileme |
| GET | `/api/export-excel?type=tasks\|ranking\|exams` | Excel indir |
| POST | `/api/import-excel` | CSV içe aktarma |
| POST | `/api/reset-period` | Dönem puan sıfırla/taşı (manager only) |

---

## 6. Environment Variables (Vercel'de tanımlı)

Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_Ycj6pC5wAJlb@ep-divine-dream-atgi8kfb-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_Ycj6pC5wAJlb@ep-divine-dream-atgi8kfb.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
ZAI_API_KEY=[z-ai-web-dev-sdk API anahtarı]
```

**Not:** `DATABASE_URL` pooler bağlantısı (uygulama için), `DIRECT_URL` direkt bağlantı (migration için).

---

## 7. Deployment Adımları

### Gerekli Hesaplar
1. **GitHub** hesabı (kod deposu)
2. **Vercel** hesabı (hosting) — GitHub ile bağlanır
3. **Neon** hesabı (PostgreSQL veritabanı)

### Güncelleme Yapma Adımları

**Yöntem 1: Vercel Dashboard'dan (Kod bilgisi olmadan)**
1. GitHub'da `yusuta2000/gmim-system` reposuna git
2. `src/app/page.tsx` dosyasını aç ve "Edit" (kalem ikonu) ile düzenle
3. Değişiklikleri kaydet (commit)
4. Vercel otomatik deploy başlatır (1-2 dakika)

**Yöntem 2: Lokal geliştirme (Yazılımcı için)**
```bash
# 1. Repoyu klonla
git clone https://github.com/yusuta2000/gmim-system.git
cd gmim-system

# 2. Bağımlılıkları yükle
bun install  # veya npm install

# 3. .env dosyası oluştur (lokal test için)
echo 'DATABASE_URL=postgresql://neondb_owner:npg_Ycj6pC5wAJlb@ep-divine-dream-atgi8kfb-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require' > .env
echo 'DIRECT_URL=postgresql://neondb_owner:npg_Ycj6pC5wAJlb@ep-divine-dream-atgi8kfb.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require' >> .env

# 4. Prisma client oluştur
npx prisma generate

# 5. Lokal dev server
bun run dev  # http://localhost:3000

# 6. Değişiklikleri push'la (Vercel otomatik deploy eder)
git add -A
git commit -m "Açıklama"
git push origin main
```

**Yöntem 3: Vercel CLI ile manuel deploy**
```bash
npx vercel --prod --token="VERCEL_TOKEN" --yes
```

### Prisma Şema Değişikliği
Eğer `prisma/schema.prisma` dosyasını değiştirirsen:
```bash
npx prisma db push  # Veritabanını şemaya senkronize et
npx prisma generate  # Prisma Client'ı yeniden oluştur
```
Build sırasında `prisma db push` otomatik çalışır (package.json'da `build` script'inde).

---

## 8. Dosya Yapısı

```
gmim-system/
├── prisma/
│   └── schema.prisma          # Veritabanı şeması
├── src/
│   ├── app/
│   │   ├── page.tsx           # Ana UI (tek sayfa, ~1600 satır)
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global stiller
│   │   └── api/               # 24 API route
│   │       ├── login/route.ts
│   │       ├── tasks/route.ts
│   │       ├── announcements/route.ts
│   │       └── ... (tüm API'ler)
│   ├── components/ui/          # shadcn/ui bileşenleri
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   └── utils.ts
│   └── hooks/
├── scripts/                   # Yardımcı scriptler
│   ├── import_excel_fast.py   # Excel'den DB'ye veri aktarımı
│   └── add_viewer_users.py    # Dekan/Baskan ekleme
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── eslint.config.mjs
```

---

## 9. Sistem Akışları

### Görev Atama Akışı (Temsilci → Ar.Gör)
1. Temsilci Görevler sekmesinden form doldurur
2. `POST /api/tasks` → source: `temsilci_assigned` → status: `assigned`
3. Ar.Gör'e bildirim gider ("Yeni Görev Atandı - Yanıt Bekleniyor")
4. Ar.Gör Görevler sekmesinde **Kabul** veya **Red** butonlarını görür
5. `PUT /api/respond-task` → accept: status `approved` + puan eklenir | reject: status `rejected`
6. Temsilciye bildirim gider

### Görev Bildirme Akışı (Ar.Gör → Temsilci)
1. Ar.Gör görev bildirir → source: `external` → status: `pending`
2. Temsilciye "Onay Bekleyen Görev" bildirimi
3. Temsilci Onaylar sekmesinde onaylar/reddeder
4. Onaylanırsa puan eklenir

### Yeni Ar.Gör Puan Hesaplama
- Yeni ar.gör eklendiğinde, mevcut aktif ar.görlerin (admin+user) puanlarının aritmetik ortalaması hesaplanır
- Bu ortalama yeni kullanıcının başlangıç puanı olur
- Amaç: Yeni gelen kişinin 0 puanla başlamasının yarattığı haksızlığı önlemek

### Duyuru ve Müsaitlik Sorgulama
1. Temsilci duyuru oluşturur (örn: "İki hafta sonraki MÜDEK için müsaitlik durumunuzu yazın")
2. Tüm ar.görlere bildirim gider
3. Ar.görler duyuruya yorum yapar (müsaitlik durumları)
4. Temsilci yorumları okuyup uygun kişilere görev atar

---

## 10. Güvenlik Analizi ve Açıklar

### KRİTİK GÜVENLİK AÇIKLARI (Acil Düzeltilmeli)

#### Açık 1: Şifreler Düz Metin (Plain Text) Saklanıyor
**Durum:** `password` alanı veritabanında hash'lenmeden saklanıyor. Login API'si `assistant.password !== password` ile direkt karşılaştırma yapıyor.
**Risk:** Veritabanı sızıntısında tüm şifreler okunabilir.
**Çözüm:** bcrypt veya argon2 ile hash'leme yapılmalı.

#### Açık 2: API'lerde Sunucu Tarafı Kimlik Doğrulama Yok
**Durum:** Çoğu API route'u (`/api/tasks`, `/api/assistants`, `/api/exams`, `/api/export-excel` vb.) kullanıcının giriş yapmış olduğunu DOĞRULAMIYOR. Frontend `currentUser`'a göre UI gizliyor ama API'ler doğrudan çağrılabilir.
**Risk:** Sistemin URL'ini bilen biri `https://itugmimportal.vercel.app/api/assistants` çağırıp tüm kullanıcı verilerini (e-posta, puan, telefon) görebilir. `POST /api/tasks` ile sahte görev ekleyebilir.
**Çözüm:** Her API'ye session token / JWT doğrulama eklenmeli. Cookie tabanlı oturum kullanılmalı.

#### Açık 3: localStorage Tabanlı Oturum
**Durum:** Kullanıcı bilgisi `localStorage`'da saklanıyor. Bu client-side'da manipulation edilebilir.
**Risk:** Kullanıcı localStorage'ı değiştirerek rolünü `admin` yapabilir (frontend'de). Ancak API'ler yine de `requesterId`'yi client'tan alıyor, bu da sahte yetkilendirme yapılabilir.
**Çözüm:** HttpOnly cookie + server-side session kullanılmalı.

#### Açık 4: Veritabanı Şifresi GitHub'da Gömülü
**Durum:** `scripts/` klasöründeki Python/TS dosyalarında Neon DB bağlantı string'i (şifre dahil) hardcoded olarak duruyor.
**Risk:** Repo public olduğu için herkes DB'ye direkt erişebilir.
**Çözüm:** Bu dosyalardan şifreler temizlenmeli, environment variable olarak kullanılmalı. Ayrıca Neon şifresi rotate edilmeli.

#### Açık 5: requesterId Client'tan Geliyor
**Durum:** Yetki kontrolü için API'ler `requesterId` parametresini client'tan alıyor (`body.requesterId`). Frontend `currentUser.id` gönderiyor ama bu manipulation edilebilir.
**Risk:** Kullanıcı kendi ID'sini değiştirip başka birinin ID'sini gönderebilir, admin gibi işlem yapabilir.
**Çözüm:** Server-side session'dan kullanıcı ID'si okunmalı, client'tan alınmamalı.

### ORTA SEVİYE AÇIKLAR

#### Açık 6: Rate Limiting Yok
API'lere sınırsız istek atılabilir. Brute force ile şifre kırılabilir.

#### Açık 7: CORS Açık
Tüm API'ler her origin'den çağrılabilir.

#### Açık 8: Input Validation Yetersiz
Bazı API'ler gelen veriyi yeterince doğrulamıyor. SQL injection riski düşük (Prisma kullanılıyor) ama NoSQL injection / logic bug riski var.

### ŞU AN KİM VERİLERİ GÖREBİLİR?

**Evet, şu an verileriniz dışarıdan erişilebilir.** Sistemin URL'sini bilen herkes şu API'leri çağırabilir:

```
https://itugmimportal.vercel.app/api/assistants    → Tüm kullanıcıların adı, e-postası, telefonu, puanı
https://itugmimportal.vercel.app/api/tasks         → Tüm görevler (kim ne yapmış, puanı)
https://itugmimportal.vercel.app/api/exams         → Tüm sınavlar
https://itugmimportal.vercel.app/api/categories    → Puan baremleri
https://itugmimportal.vercel.app/api/announcements → Duyurular ve yorumlar
https://itugmimportal.vercel.app/api/export-excel?type=tasks → Görevleri Excel olarak indir
https://itugmimportal.vercel.app/api/export-excel?type=ranking → Puan tablosunu Excel olarak indir
```

**Şifreler de düz metin** olduğu için, veritabanı şifresi (GitHub'da gömülü) ile DB'ye bağlanan biri tüm şifreleri görebilir.

### GÜVENLİK İÇİN ACİL EYLEM PLANI

Eğer veri gizliliği kritikse, şu adımlar ATİLENMELİDİR:

1. **Neon DB şifresini rotate et** (Neon dashboard → Reset password)
2. **scripts/ klasöründeki şifreleri temizle** (environment variable kullan)
3. **API'lere authentication middleware ekle** (Next.js middleware.ts)
4. **Şifreleri bcrypt ile hash'le** (login + change-password + add-assistant + reset-password)
5. **Session token sistemi kur** (JWT + HttpOnly cookie)
6. **Repo'yu private yap** (GitHub → Settings → Change visibility)

Eğer veri gizliliği çok kritik değilse (üniversite içi, düşük risk), mevcut sistem çalışır durumda kalabilir ama yukarıdaki açıkların farkında olunmalı.

---

## 11. Bakım ve Sorun Giderme

### Veritabanı Uyku Modu
Neon free plan'da 7 gün sorgu gelmezse DB uyku moduna geçer. İlk istek 2-3 saniye gecikmeli olur. Günlük en az bir kişi giriş yaparsa sorun olmaz.

### Yeni Kullanıcı Ekleme
Personel sekmesinden "Yeni Araş Gör Ekle" butonu ile. Şifre boş bırakılırsa otomatik `epostaÖnek + 2026` oluşturulur.

### Dönem Başı Puan Sıfırlama
Puan Tablosu → Dönem Yönetimi → "Sıfırla" (herkes 0) veya "Puanları Taşı" (birikim devam).

### Excel'e Veri Aktarma
Puan Tablosu → "Görevleri İndir" / "Puanları İndir" / "Sınavları İndir" butonları.

### Build Hatası
Eğer Vercel build başarısız olursa:
1. `prisma generate` çalışıyor mu kontrol et
2. Environment variables doğru mu kontrol et
3. `npx prisma db push` ile şema senkronize et

---

## 12. Hesap ve Erişim Bilgileri

### GitHub
- Repo: https://github.com/yusuta2000/gmim-system
- Sahip: yusuta2000
- Erişim için: GitHub hesabına sahip olmanız veya yusuta2000'den erişim talep etmeniz gerekir

### Vercel
- Project: my-project (yusuta2000s-projects)
- Production URL: https://itugmimportal.vercel.app
- Dashboard: https://vercel.com/yusuta2000s-projects/my-project
- Environment Variables: Dashboard → Settings → Environment Variables

### Neon (PostgreSQL)
- Project: neondb
- Host: ep-divine-dream-atgi8kfb-pooler.c-9.us-east-1.aws.neon.tech
- Database: neondb
- User: neondb_owner
- Dashboard: https://console.neon.tech
- Bağlantı: Neon dashboard'dan bağlantı string'ini alın

---

## 13. Sık Sorulan Sorular

**S: Sistem ne kadar süre çalışır?**  
C: Süresiz. Tüm bileşenler (Vercel, Neon, GitHub) free plan'da ve süresiz. Tek limit: Neon 0.5GB (şu an ~10MB kullanılıyor), Vercel 100GB/ay bant (10 kullanıcı için yeter).

**S: Verilerim kaybolur mu?**  
C: Neon veritabanı otomatik yedeklenir (free planda 7 gün point-in-time recovery). GitHub'da kod yedeği var. Excel export ile de manuel yedek alınabilir.

**S: Başka bir geliştirici nasıl devam eder?**  
C: Bu dokümanı okusun → repoyu klonlasın → `.env` dosyasını oluştursun → `bun install` → `bun run dev`. Tüm bağlantı bilgileri yukarıda.

**S: Sistemi başka bir fakülteye uyarlayabilir miyim?**  
C: Evet. `faculty` ve `department` alanları zaten var. Baremleri, rolleri ve isimleri değiştirerek adapte edebilirsiniz.

---

*Bu doküman Haziran 2026 itibariyle sistem durumunu yansıtmaktadır. Sistem güncellendikçe bu doküman da güncellenmelidir.*
