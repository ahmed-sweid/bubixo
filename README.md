# Bubixo — Ücretsiz İngilizce Öğrenme

Bubixo, Türkçe konuşan başlangıç düzeyindeki öğrencilerin İngilizceyi dersler, kelime çalışmaları, gramer, cümle kurma, hikâyeler ve sesli pratiklerle öğrenmesine yardımcı olan web tabanlı bir öğrenme deneyimidir.

Ürün; A1–A2 seviyesine yönelik içerikleri, kişisel ilerleme takibini ve mobil cihazlarda kurulabilir bir Progressive Web App (PWA) deneyimini tek bir arayüzde bir araya getirir.

- **Canlı site:** https://www.bubixo.com/ingilizce/
- **Proje deposu:** https://github.com/ahmed-sweid/bubixo
- **Arayüz dili:** Türkçe
- **Hedef seviye:** Başlangıç (A1–A2)
- **Lisans:** Depoda ayrıca bir lisans dosyası belirtilmedikçe kullanım ve yeniden dağıtım hakları için depo sahibinden izin alınmalıdır.

## İçindekiler

- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Öğrenme deneyimi](#öğrenme-deneyimi)
- [Teknoloji ve mimari](#teknoloji-ve-mimari)
- [Depo yapısı](#depo-yapısı)
- [Yerel olarak çalıştırma](#yerel-olarak-çalıştırma)
- [İçerik geliştirme](#içerik-geliştirme)
- [PWA ve çevrimdışı davranış](#pwa-ve-çevrimdışı-davranış)
- [İlerleme ve gizlilik](#ilerleme-ve-gizlilik)
- [Kontrol ve test](#kontrol-ve-test)
- [Tasarım ilkeleri](#tasarım-ilkeleri)
- [Bilinen sınırlar](#bilinen-sınırlar)
- [Veri ve içerik kaynakları](#veri-ve-içerik-kaynakları)
- [Ürün fikri ve vizyonu](#ürün-fikri-ve-vizyonu)
- [Katkıda bulunma](#katkıda-bulunma)

## Öne çıkan özellikler

- **Yapılandırılmış öğrenme yolu:** A1'den A2'ye doğru ilerlemeyi destekleyen dersler ve öğrenme paneli.
- **Kelime sözlüğü:** Seviyelere göre kelime arama, anlamları görüntüleme ve sesli çalışma.
- **Aralıklı tekrar:** Kelime durumlarını ve tekrar zamanlarını izleyen öğrenme sistemi.
- **Gramer:** İngilizce gramer ve cümle yapısı konularını açıklamalar ve alıştırmalarla çalışma.
- **Cümle kurma:** Verilen kelimeleri doğru sıraya yerleştirme ve cevap sonrasında kural açıklamasını görme.
- **Sesli hikâyeler:** İngilizce metinleri Türkçe karşılıklarıyla takip etme ve hikâyeleri dinleme.
- **Kelime oyunları:** Tematik kelimelerle kısa pekiştirme etkinlikleri.
- **Dinleme ve telaffuz pratiği:** Sesleri dinleme, tekrar etme ve desteklenen tarayıcılarda mikrofon tabanlı tanıma özellikleri.
- **Günlük içerik:** Her gün bir İngilizce cümle gibi kısa öğrenme içerikleri.
- **Seviye testi:** Başlangıç noktasını seçmeye yardımcı olan kısa değerlendirme.
- **PWA desteği:** Desteklenen tarayıcılarda ana ekrana ekleme, güncelleme bildirimi ve önbellek üzerinden sınırlı çevrimdışı kullanım.

Özelliklerin kullanılabilirliği tarayıcıya, ağ bağlantısına ve ilgili içeriğin mevcut olmasına bağlı olabilir. Konuşma pratiği arayüzü, tek başına tam kapsamlı bir yapay zekâ konuşma veya telaffuz değerlendirme sisteminin tamamlandığı anlamına gelmez.

## Öğrenme deneyimi

Uygulamanın ana gezinmesi dört bölüme ayrılır:

| Bölüm | Amaç |
| --- | --- |
| **Öğren** | Öğrenme yolunu, ilerlemeyi ve sıradaki etkinliği bulmak |
| **Kelimeler** | Sözlükte arama yapmak ve kelime tekrarlarını yönetmek |
| **Pratik** | Gramer, cümle kurma, hikâyeler, dinleme ve oyunlarla pekiştirmek |
| **Keşfet** | Günlük ve tamamlayıcı öğrenme içeriklerini incelemek |

Ana ekran ve öğrenme yolu, kullanıcıyı bir sonraki anlamlı adıma yönlendirmeyi amaçlar. Kelime, gramer, hikâye ve pratik içerikleri farklı özellikler olarak bulunsa da ürün yaklaşımı bunları birbirini destekleyen bir öğrenme deneyiminde birleştirmektir.

## Teknoloji ve mimari

Bubixo'nun ana deneyimi, istemci tarafında çalışan hafif bir web uygulamasıdır:

- **HTML** — sayfa iskeleti ve erişilebilir işaretleme.
- **CSS** — ana arayüz ve öğrenme yolu stilleri.
- **Vanilla JavaScript** — gezinme, içerik oluşturma, etkileşimler ve ilerleme mantığı.
- **PWA teknolojileri** — Web App Manifest ve Service Worker üzerinden kurulum/önbellek davranışı.
- **localStorage** — tarayıcı içindeki yerel öğrenme ilerlemesi.
- **Ses varlıkları** — önceden hazırlanmış ses dosyaları ve metinle eşleştirilmiş ses indeksi.
- **Tarayıcı konuşma API'leri** — uygun tarayıcılarda metni seslendirme ve destekleniyorsa mikrofonla tanıma.

Ana uygulama için zorunlu bir paket yöneticisi veya derleme adımı tanımlanmamıştır. Uygulama, HTML, CSS ve JavaScript dosyalarının doğrudan sunulmasıyla çalışır.

### Ana dosyalar

| Dosya | Sorumluluk |
| --- | --- |
| `index.html` | Ana sayfa, meta veriler, ana bölümler ve script yükleme sırası |
| `app.js` | Ana uygulama davranışları, gezinme, dersler, sözlük, hikâyeler, oyunlar ve yerel durum |
| `yol.js` | Öğrenme paneli, A1–A2 öğrenme yolu, ilerleme ve kelime tekrar katmanı |
| `kurs.css` | Ana uygulama ve etkileşimlerin stilleri |
| `yol.css` | Öğrenme yolu ve panel stilleri |
| `data.js` | Temel ders içerikleri |
| `data2.js` | Gramer ve kelime sözlüğü verileri |
| `data5.js` | Sesli hikâye içerikleri |
| `data6.js` | Cümle kurma alıştırmaları |
| `data7.js` | Kelime oyunu içerikleri |
| `ses.js` | Metin ile önceden hazırlanmış ses dosyaları arasındaki eşleştirme ve oynatma |
| `ses-icerik.js` | Ses içerik manifesti; otomatik üretilen dosya olarak işaretlenmiştir |
| `ceviri.js` | İsteğe bağlı çeviri paneli entegrasyonu |
| `pwa.js` | Service Worker kaydı, güncelleme/çevrimdışı bilgilendirmeleri ve kurulum deneyimi |
| `sw.js` | Uygulama kabuğu ve sesler için önbellek politikası |
| `stat.js` | Kod içinde tanımlanan anonim kullanım olayları için ölçüm katmanı |
| `manifest.json` | PWA adı, kapsamı, tema ve ikon tanımları |
| `DESIGN-webflow.md` | Görsel tasarım sistemi ve arayüz ilkeleri |

Depoda ayrıca `audio/`, `assets/` ve ayrı özelliklere yönelik alt sayfa klasörleri bulunur. Alt sayfalar ve ses kaynakları değiştirilirken mevcut URL yapısı ve ses manifestleri korunmalıdır.

## Yerel olarak çalıştırma

### Gereksinimler

- Güncel bir masaüstü tarayıcısı.
- Python 3 veya eşdeğer basit bir statik HTTP sunucusu.
- Git (deponun klonlanması ve değişikliklerin yönetilmesi için).

Node.js veya bir paket yöneticisi, mevcut statik uygulamayı görüntülemek için zorunlu değildir.

### 1. Depoyu klonlayın

```bash
git clone https://github.com/ahmed-sweid/bubixo.git
cd bubixo
```

### 2. Geliştirme dalına geçin

Dört sekmeli gezinme ve güncel UX çalışmasını içeren dalı incelemek istiyorsanız:

```bash
git switch ux/four-tab-navigation
```

Bu dal adı GitHub deposunda mevcut olduğu sürece kullanılabilir. Başka bir dal üzerinde çalışıyorsanız önce mevcut dal ve çalışma ağacınızı kontrol edin.

### 3. Statik HTTP sunucusunu başlatın

Depo kök dizininde:

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda şu adresi açın:

http://localhost:8000/

Sunucuyu durdurmak için terminalde `Ctrl+C` kullanın.

> **Not:** Üretim yapılandırması uygulamayı `/ingilizce/` yolu altında çalışacak şekilde tanımlar. Yerel önizlemede ana arayüzü açabilseniz bile PWA kurulumu, Service Worker kapsamı ve kökten başlayan bazı mutlak URL'ler üretim ortamıyla aynı davranmayabilir. PWA ve alt sayfaları doğrularken uygulamayı üretimdeki URL yapısıyla aynı olacak şekilde sunun.

### 4. Tarayıcı geliştirici araçlarını kullanın

Geliştirme sırasında tarayıcı konsolunu ve Network panelini kontrol edin:

- JavaScript hataları var mı?
- CSS, veri veya ses dosyalarından biri 404 dönüyor mu?
- Mikrofon izni ve ses oynatma tarayıcı tarafından engelleniyor mu?
- İlerleme sayfa yenilendikten sonra korunuyor mu?
- Mobil genişlikte yatay taşma veya erişilemeyen kontroller var mı?

## İçerik geliştirme

İçerik verileri çoğunlukla JavaScript dosyalarında tanımlanır. İçerik değişikliği yaparken yalnızca metnin görünümünü değil, verinin uygulama tarafından beklenen yapıya uyduğunu da kontrol edin.

### Temel kurallar

1. **Mevcut veri şemasını koruyun.** Yeni bir alan eklemeden önce aynı dosyadaki mevcut kayıtları ve bunları kullanan fonksiyonları inceleyin.
2. **İngilizce metni sesle eşleştirin.** Ses manifestinde tam metin eşleşmesine dayanan kayıtlar bulunabilir. Noktalama, boşluk veya kesme işareti değişikliği ses eşleştirmesini etkileyebilir.
3. **Seviyeyi gözetin.** A1–A2 içeriğinde gereksiz zor kelimelerden ve açıklanmamış gramer yapılarından kaçının.
4. **Çevirileri bağlama göre kontrol edin.** Türkçe karşılığın doğal ve ilgili İngilizce cümleye uygun olduğundan emin olun.
5. **Örnekleri doğrulayın.** Yeni bir cümle eklerken dilbilgisi, noktalama ve anlam doğruluğunu kontrol edin.
6. **Üretilen dosyaları elle değiştirmeyin.** Dosya başlığında otomatik üretildiği yazıyorsa kaynak ve üretim sürecini inceleyin; doğrudan yapılan değişiklikler sonraki üretimde kaybolabilir.
7. **Gerçek ilerleme durumunu koruyun.** Tamamlanma yüzdesi veya öğrenildi bilgisi gerçek kullanıcı verisine dayanmalı; sabit ya da sahte ilerleme gösterilmemelidir.

### Ses içerikleri

Ses dosyaları ve indeksleri, uygulamanın ses oynatma mantığıyla birlikte çalışır. Ses dosyalarını yeniden adlandırmadan, taşımadan veya metinleri topluca değiştirmeden önce `ses.js`, `ses-icerik.js` ve `audio/` içindeki ilgili indeksleri inceleyin.

Bazı ses kaynakları üretimde harici bir sunucudan sunulabilir. Bu nedenle yerel önizlemede sesin bulunmaması, tek başına uygulama kodunun hatalı olduğunu kanıtlamaz; Network panelinden isteğin URL'sini ve sonucunu kontrol edin.

## PWA ve çevrimdışı davranış

PWA yapılandırması `manifest.json`, `pwa.js` ve `sw.js` üzerinden yürütülür.

Service Worker kodu, uygulama kabuğu ve veri dosyaları için ağ/önbellek stratejisi uygular; ses dosyaları ise ayrı bir önbellek mantığına sahiptir. Kodda hikâye seslerini kullanıcı isteğiyle topluca indirmeye yönelik bir akış da bulunur. Bu, bütün seslerin ilk açılışta otomatik indirildiği veya uygulamanın her özelliğinin tamamen çevrimdışı çalıştığı anlamına gelmez.

PWA ile ilgili değişikliklerden sonra şunları test edin:

- İlk kurulum ve ana ekrana ekleme.
- Güncelleme bildirimi ve yeni sürümün yüklenmesi.
- Çevrimiçi açılıştan sonra bağlantının kesilmesi.
- Önbellekte bulunan ve bulunmayan ses dosyaları.
- Çevrimdışıyken ilerleme kaydetme ve sayfayı yeniden açma.
- Yeni dağıtım sonrasında eski önbelleğin doğru şekilde yenilenmesi.

Önbellek sürümünü artırmak gerektiğinde `pwa.js`, `index.html` ve `sw.js` içindeki sürüm/kayıt davranışlarını birlikte inceleyin. Sürüm değişikliğini test etmeden üretime göndermeyin.

## İlerleme ve gizlilik

### Yerel ilerleme

Ana uygulama, öğrenme durumunu tarayıcının `localStorage` alanında `bx-eng` anahtarı altında tutar.

Bunun pratik sonuçları:

- İlerleme aynı cihaz ve aynı tarayıcıda yeniden kullanılabilir.
- Otomatik hesap veya cihazlar arası senkronizasyon olduğu varsayılmamalıdır.
- Tarayıcı verilerinin silinmesi, özel gezinme kullanımı veya depolama kısıtları ilerlemeyi etkileyebilir.
- Yeni durum alanları eklenirken eski kullanıcı kayıtlarıyla uyumluluk göz önünde bulundurulmalıdır.

### Harici servisler

Kodda isteğe bağlı çeviri ve kullanım ölçümü katmanları bulunur. Bu istekler çevrimdışı durumda çalışmayabilir. Harici servisler veya analitik davranışı değiştirildiğinde gönderilen veri, amaç, saklama ve gizlilik açıklamaları ayrıca doğrulanmalıdır. Bu README, sunucu tarafı veri saklama veya dağıtım ayarları için bağımsız bir güvenlik denetiminin yerine geçmez.

## Kontrol ve test

Proje için kapsamlı otomatik tarayıcı testi veya derleme adımı tanımlı olduğu varsayılmamalıdır. Değişiklik göndermeden önce en azından aşağıdaki kontrolleri uygulayın.

### JavaScript sözdizimi

Node.js kuruluysa depo kökünde:

```bash
node --check app.js
node --check yol.js
node --check pwa.js
node --check sw.js
node --check ceviri.js
node --check ses.js
node --check stat.js
```

Bu komutlar yalnızca sözdizimi kontrolüdür; uygulamanın tarayıcıda doğru çalıştığını kanıtlamaz.

### JSON ve referanslar

```bash
python3 -m json.tool manifest.json
```

Ayrıca `index.html` içindeki yerel `src` ve `href` referanslarını, manifest ikonlarını ve Service Worker önbellek listesini kontrol edin.

### Manuel regresyon kontrol listesi

- [ ] Öğren, Kelimeler, Pratik ve Keşfet sekmeleri açılıyor.
- [ ] Alt sayfalardan geri dönme ve tarayıcı geri/ileri davranışı tutarlı.
- [ ] Ders ve öğrenme yolu ilerlemesi kaydediliyor.
- [ ] Sayfa yenilendikten sonra ilerleme doğru yükleniyor.
- [ ] Sözlük araması, seviye filtresi ve kelime tekrarı çalışıyor.
- [ ] Ses düğmeleri doğru metni oynatıyor; ses hızı kontrolü varsa doğru çalışıyor.
- [ ] Hikâye, gramer, cümle kurma ve oyun akışları tamamlanabiliyor.
- [ ] Mikrofon özelliği desteklenen tarayıcıda izin verilince çalışıyor; desteklenmeyen durumda arayüz bozulmuyor.
- [ ] Çevrimdışı durum ve PWA güncelleme akışı kontrol edildi.
- [ ] Mobil ve masaüstü ekranlarında taşma, okunamayan metin veya erişilemeyen kontroller yok.
- [ ] Tarayıcı konsolunda kritik hata bulunmuyor.

## Tasarım ilkeleri

Arayüz geliştirmelerinde `DESIGN-webflow.md` dosyasını temel alın.

- Sade, okunabilir ve profesyonel görsel dil.
- Beyaz yüzeyler, koyu metin ve ölçülü vurgu renkleri.
- İnce sınırlar ve kontrollü görsel hiyerarşi.
- Gereksiz gölgeler, süslemeler ve kalabalık kart düzenlerinden kaçınma.
- Mobil kullanım ve erişilebilirlik için yeterli dokunma alanları.
- Ana gezinmede anlaşılır metin etiketleri.
- Durumları yalnızca renkle anlatmama.
- Mevcut düzeni değiştiren büyük refaktörler yerine küçük, test edilebilir değişiklikler.

Tasarım değişikliklerinde hedef yalnızca daha yeni görünen bir arayüz değil; kullanıcının ne yapacağını daha kolay anlaması ve öğrenme akışını kaybetmemesidir.

## Ürün fikri ve vizyonu

Bubixo'nun henüz geliştirilecek uygulama fikrini, hedef kullanıcılarını, öğrenme yaklaşımını, ana bölümlerini, ilk sürüm kapsamını ve ürün yol haritasını açıklayan konsept belgesi: [Bubixo — Ürün Fikri ve Uygulama Vizyonu](docs/BUBIXO-URUN-FIKRI-VE-VIZYONU.md). Bu belge ürün vizyonunu tanımlar; tamamlanmış mobil uygulama veya doğrulanmış öğrenme sonuçları iddiası taşımaz.

## Veri ve içerik kaynakları

Derslerin, sözlüğün, gramerin, hikâyelerin, oyun verilerinin, ses dosyalarının, çeviri servisinin ve yerel kullanıcı verilerinin nereden geldiğini açıklayan ayrıntılı inceleme: [Bubixo — Veri ve İçerik Kaynakları](docs/BUBIXO-VERI-VE-ICERIK-KAYNAKLARI.md). Belge, depoda doğrulanabilen kaynaklarla henüz kaynağı doğrulanamayan içerikleri birbirinden ayırır.

## Flutter'a veri aktarımı

Mevcut Bubixo eğitim verilerini Flutter uygulamasında yeniden kullanmak için önerilen yaklaşım ve adım adım geçiş planı: [Bubixo → Flutter: Veri Aktarımı ve Entegrasyon Planı](docs/BUBIXO-FLUTTER-VERI-AKTARIM-PLANI.md). Belge; yerel JavaScript içeriklerini JSON asset'lerine dönüştürmeyi, ses ve çeviri servislerini ayrı ele almayı, ilerlemeyi yerel depolamaya taşımayı ve doğrulama aşamalarını açıklar. Bu bir plan dokümanıdır; Flutter uygulamasının veya veri dönüşümünün tamamlandığı iddiası değildir.

## Bilinen sınırlar

- İlerleme varsayılan olarak yerel tarayıcı depolamasına dayanır; hesap tabanlı senkronizasyon belgelenmiş bir özellik değildir.
- Çevrimdışı davranış önbelleğe alınan dosyalara ve ağ gerektiren servislere bağlıdır.
- Mikrofon ve konuşma tanıma desteği tarayıcıya ve izinlere bağlıdır.
- Kodda bir “AI ile konuşma pratiği” arayüzünün bulunması, tam bir AI sohbet sisteminin tamamlandığını tek başına göstermez.
- JavaScript ve CSS dosyaları önemli miktarda davranış ve stil içerir; büyük refaktörler regresyon testiyle aşamalı yapılmalıdır.
- Depo lisansı ayrıca tanımlanmadıkça kodun veya içeriğin yeniden dağıtılabileceği varsayılmamalıdır.

## Katkıda bulunma

Değişiklikleri küçük, açıklanabilir ve kolayca test edilebilir tutun.

1. Çalışma dalını kontrol edin ve güncel olduğundan emin olun.
2. Tek bir davranış veya ilgili değişiklik grubu üzerinde çalışın.
3. İlgili veri şemasını, tasarım yönergesini ve mevcut akışları inceleyin.
4. Sözdizimi ve manuel regresyon kontrollerini çalıştırın.
5. Değişiklik kapsamını açıkça anlatan bir commit mesajı yazın.
6. Görsel davranış değiştiyse önce/sonra ekran görüntüsü veya test notu ekleyin.
7. Üretim dalına birleştirmeden önce değişiklikleri gözden geçirin.

### Commit mesajı örnekleri

```text
docs: improve project README
fix: preserve learning progress after navigation
feat: connect saved words with example sentences
style: refine mobile learning screen
```

---

## Proje hedefi

Bubixo'nun hedefi yalnızca İngilizce içeriği göstermek değil; öğrencinin bir sonraki adımı bulmasını, kelimeleri bağlam içinde görmesini, öğrendiklerini tekrar etmesini ve düzenli çalışma alışkanlığı geliştirmesini desteklemektir.

Geliştirme kararlarında yeni özellik sayısından çok **öğrenme deneyiminin açıklığı, içerik doğruluğu, güvenilir ilerleme ve erişilebilirlik** öncelikli tutulmalıdır.
