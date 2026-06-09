/**
 * Kanonik yasal metinler (düz metin). Sipariş anında `legal_contract_snapshot` ile arşivlenir;
 * sitedeki hukuki sayfalar bu kaynakla uyumlu tutulur.
 */

export const LEGAL_CONTRACT_VERSION = "v1" as const;

const SELLER = "Zelula";
const SELLER_LEGAL_TITLE = "Özgün Sena Uğur (Zelula – Şahıs Firması)";
const SITE_HREF = "https://www.zeluladesign.com";
const SITE_LABEL = "www.zeluladesign.com";
const SUPPORT_EMAIL = "destek@zeluladesign.com";
const SELLER_ADDRESS = "Beylerbeyi Mah. Arabacılar Sok. No:39/1 Üsküdar / İstanbul";
const SELLER_PHONE = "+90 553 371 00 24";

const RETURN_CARRIER_RULE =
  "Cayma hakkı kapsamında yapılan iadelerde, SATICI tarafından belirtilen anlaşmalı kargo firmasının kullanılması durumunda iade kargo ücreti SATICI tarafından karşılanır.";

/** Mesafeli satış sözleşmesi — sipariş anında arşivlenen metin */
export function getDistanceSalesContractText(): string {
  return `İşbu Mesafeli Satış Sözleşmesi ("Sözleşme"), 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca düzenlenmiştir.

## 1. Taraflar

Satıcı: ${SELLER_LEGAL_TITLE}. Adres: ${SELLER_ADDRESS}. Telefon: ${SELLER_PHONE}. E-posta: ${SUPPORT_EMAIL}. İnternet sitesi: ${SITE_HREF} (${SITE_LABEL}).

Alıcı: Sipariş sırasında iletişim bilgilerini paylaşan ve ödeme yükümlülüğünü üstlenen tüketici.

## 2. Sözleşmenin konusu

Sözleşme'nin konusu, Alıcı'nın Satıcı'ya ait internet sitesi üzerinden elektronik ortamda siparişini verdiği takı ve aksesuar ürünlerinin satışı ile satışa ilişkin olarak tarafların hak ve yükümlülüklerinin belirlenmesidir. Ürünün temel nitelikleri, vergiler dahil toplam fiyatı, ödeme ve teslimat bilgileri sipariş özetinde ve ön bilgilendirme formunda yer alır.

## 3. Cayma hakkı (14 gün)

Alıcı, ürünün kendisine veya gösterdiği adresteki üçüncü kişiye teslim tarihinden itibaren 14 (on dört) gün içinde hiçbir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma hakkı süresi sona ermeden önce, tüketicinin onayı ile hizmetin ifasına başlanması hâlinde cayma hakkı kullanılamaz.

## 4. Cayma hakkının kullanılamayacağı haller (hijyen istisnası)

Mesafeli Sözleşmeler Yönetmeliği uyarınca, sağlık veya hijyen açısından iadesi uygun olmayıp tesliminden sonra ambalajı açılmış mallar yönünden cayma hakkı kullanılamaz.

:::CALLOUT
Hijyen sebebiyle küpe ürünlerinde iade ve değişim kabul edilmemektedir. Ürün kusurlu, ayıplı veya yanlış gönderilmişse yasal haklarınız saklıdır.

${RETURN_CARRIER_RULE}
:::

Ayrıca, tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış olması şartıyla; iadesi sağlık ve hijyen açısından uygun olmayan diğer ürünlerde de cayma hakkı sınırlı olabilir. Cayma hakkının kullanılamadığı durumlar sipariş öncesi açıkça bildirilir.

## 5. İade koşulları

- Ürün, kullanılmamış, yeniden satılabilir durumda ve standart aksesuarlarıyla birlikte iade edilmelidir.
- Orijinal ambalaj ve fatura / irsaliye (varsa) ibrazı talep edilebilir.
- Cayma hakkı kapsamı dışındaki ürünlerde iade kabul edilmeyebilir.

## 6. Geri ödeme

Cayma hakkının usulüne uygun kullanılması halinde, Satıcı cayma bildiriminin kendisine ulaştığı tarihten itibaren en geç 14 gün içinde ödemeyi iade eder. İade, ödemenin yapıldığı araca ve tüketiciyi hiçbir masrafa sokmayacak şekilde yapılır.

## 7. Teslimat

Teslimat süresi, sipariş onayında ve ön bilgilendirme formunda belirtilen süre ile sınırlıdır; stok ve lojistik koşullarına bağlı olarak değişebilir. Azami teslim süresi 30 günü aşmayacak şekilde planlanır; aksi hâlde tüketici iptal ve ücret iadesi talep edebilir. Alıcı'nın talep ettiği teslimat adresine teslimat yapılır.

## 8. Uyuşmazlıklar ve yetkili merciler

İşbu Sözleşme'ye ilişkin uyuşmazlıklarda, Alıcı yerleşim yerinin bulunduğu veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.

## 9. Yürürlük

Alıcı, siparişi onaylayarak işbu Sözleşme'yi elektronik ortamda okuduğunu ve kabul ettiğini beyan eder. Sözleşme, siparişin Satıcı tarafından onaylanmasıyla yürürlüğe girer.`;
}

/** Ön bilgilendirme formu — sipariş anında arşivlenen metin */
export function getPreContractInfoText(): string {
  return `İşbu Ön Bilgilendirme Formu, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, sipariş öncesinde tüketicinin bilgilendirilmesi amacıyla hazırlanmıştır.

## 1. Satıcı bilgileri

Satıcı: ${SELLER_LEGAL_TITLE}. Adres: ${SELLER_ADDRESS}. Telefon: ${SELLER_PHONE}. E-posta: ${SUPPORT_EMAIL}. Web sitesi: ${SITE_HREF} (${SITE_LABEL}).

## 2. Ürün bilgileri

Siparişe konu ürünlerin temel özellikleri (tür, miktar, marka/model, renk, malzeme vb.), vergiler dahil birim fiyatı ve varsa tüm ek masraflar sipariş özeti ve sepet ekranında gösterilir. Ürün bilgileri sipariş anında sisteme işlenen verilere dayanır.

## 3. Toplam fiyat

Ödenecek toplam tutar; ürün bedelleri, varsa indirimler, kampanyalar, kargo ücreti ve yasal vergilerin toplamıdır ve ödeme adımından önce açıkça gösterilir.

## 4. Teslimat

Teslimat süresi, siparişin onaylanmasından itibaren stok durumuna ve kargo süreçlerine bağlı olarak değişebilir. Tüketiciye taahhüt edilen teslim süresi aşılmaması esastır; gecikme halinde tüketici sözleşmeden cayma hakkını kullanabilir. Azami teslim süresi 30 günü aşmayacak şekilde planlanır; aksi hâlde tüketici iptal ve ücret iadesi talep edebilir.

## 5. Cayma hakkı

Tüketici, ürünün tesliminden itibaren 14 gün içinde hiçbir gerekçe göstermeksizin cayma hakkını kullanabilir. Hijyen sebebiyle küpe ürünlerinde iade ve değişim kabul edilmemektedir. Ürün kusurlu, ayıplı veya yanlış gönderilmişse yasal haklarınız saklıdır. Ambalajı açılmış, iadesi sağlık ve hijyen açısından uygun olmayan diğer mallar için istisnalar geçerlidir.

## 6. İade kargo masrafı

- ${RETURN_CARRIER_RULE}
- Aksi halde (SATICI anlaşmalı iade taşıması sağlamıyorsa) iade gönderim bedeli Alıcı'ya aittir.

## 7. Ödeme ve güvenlik

Ödeme, güvenli ödeme altyapısı üzerinden gerçekleştirilir. Kart bilgileri Satıcı tarafından saklanmaz; ödeme sağlayıcı kuralları geçerlidir.

## 8. Şikâyet ve başvuru

Tüketici, talep ve şikâyetlerini Satıcı iletişim kanalları üzerinden iletebilir; uyuşmazlıklarda Tüketici Hakem Heyeti ve Tüketici Mahkemeleri başvurulabilir. İletişim: ${SUPPORT_EMAIL}`;
}

/** İade ve değişim politikası — sipariş anında arşivlenen metin */
export function getReturnPolicyText(): string {
  return `:::LEAD
Zelula olarak ürünlerinden memnun kalmanı istiyoruz. Aşağıdaki bilgiler süreci netleştirir; sorunda her zaman destek ekibimize yazabilirsin (${SUPPORT_EMAIL}).
:::

:::CALLOUT
- Hijyen sebebiyle küpe ürünlerinde iade ve değişim kabul edilmemektedir.
- Ürün kusurlu, ayıplı veya yanlış gönderilmişse yasal haklarınız saklıdır.
- ${RETURN_CARRIER_RULE}
:::

## 14 gün iade hakkı

Yasal cayma hakkı kapsamında, siparişinin sana veya gösterdiğin adrese ulaştığı tarihten itibaren 14 gün içinde iade talebinde bulunabilirsin. Süre, ürünün eline geçtiği günden itibaren işler.

## Hangi ürünler iade edilemez?

- Küpeler: Hijyen sebebiyle küpe ürünlerinde iade ve değişim kabul edilmemektedir; bu ürünleri seçerken ölçü ve model bilgilerini dikkatle kontrol etmeni rica ederiz.
- Kullanılmış, hasar görmüş veya yeniden satılamayacak ürünler.
- Ambalajı açılmış ve iadesi sağlık/hijyen açısından uygun olmayan ürünler (mevzuat kapsamı).

## İade nasıl yapılır? (Adım adım)

1. Bize ulaş: Sipariş numaran ile ${SUPPORT_EMAIL} veya WhatsApp / Instagram üzerinden yaz.
2. Onay al: Ekibimiz iade koşullarını kontrol eder ve sana iade adresi veya anlaşmalı kargo bilgisini iletir.
3. Paketle: Ürünü orijinal ambalajına uygun şekilde, hasar görmeyecek biçimde paketle; faturanı unutma.
4. Gönder: Onaylanan yöntemle kargoya ver; takip numarasını paylaş.
5. İnceleme: Ürün depoya ulaştıktan sonra kontrol edilir; uygunsa iade süreci başlatılır.

## Geri ödeme süresi

İaden onaylandıktan sonra ödeme, yasal süre çerçevesinde genellikle 14 gün içinde, ödemeyi yaptığın yönteme iade edilir. Banka işlem süreleri kurumuna göre 1–3 iş günü daha sürebilir.

## Değişim

Stok ve ürün uygunluğuna göre değişim taleplerini değerlendiriyoruz. Değişim için önce bizimle iletişime geçmen yeterli; uygun alternatif varsa hızlıca yönlendiririz.

Kampanyalı ve indirimli ürünlerde iade koşulları değişiklik gösterebilir.

Ayrıntılı hukuki düzenlemeler için site üzerindeki Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu'na başvurabilirsin (${SITE_HREF}).`;
}

/** Gizlilik politikası / KVKK temel bilgilendirme — sipariş anında arşivlenen metin */
export function getPrivacyPolicyText(): string {
  return `Zelula ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") çerçevesinde kişisel verilerinizi korumayı taahhüt ederiz. Bu metin, temel bilgilendirme amacı taşır; ayrıntılı aydınlatma yükümlülükleri sipariş ve üyelik süreçlerinde de sunulabilir.

## 1. Veri sorumlusu

Kişisel verileriniz, ürün ve hizmet sunumu kapsamında veri sorumlusu sıfatıyla ${SELLER_LEGAL_TITLE} tarafından işlenebilir. Başvuru ve talepleriniz için ${SUPPORT_EMAIL} adresini kullanabilirsiniz.

## 2. İşlenen veri kategorileri (örnek)

- Kimlik ve iletişim: ad-soyad, e-posta, telefon, teslimat/fatura adresi
- İşlem güvenliği: sipariş kayıtları, ödeme işlemi için gerekli teknik veriler
- Müşteri işlemleri: sepet, sipariş geçmişi, tercihler (varsa)
- İletişim: destek talepleri, mesaj içerikleri

## 3. İşleme amaçları

Verileriniz; siparişin oluşturulması ve teslimatı, ödemenin alınması, müşteri desteği, yasal yükümlülüklerin yerine getirilmesi, hizmet kalitesinin artırılması ve güvenliğin sağlanması amaçlarıyla işlenir.

## 4. Ödeme güvenliği

Kart bilgileriniz ${SELLER} sunucularında saklanmaz. Ödeme işlemleri, PCI-DSS standartlarına uygun ödeme hizmeti sağlayıcıları üzerinden gerçekleştirilir.

## 5. Üçüncü kişilerle paylaşım

Kişisel verileriniz, yasal zorunluluklar (mahkeme, düzenleyici merci talepleri) dışında üçüncü kişilerle paylaşılmaz; operasyonel gereklilik halinde yalnızca kargo firması, ödeme kuruluşu ve benzeri hizmet sağlayıcılarla, hizmetin ifası için sınırlı ve gerekli ölçüde paylaşılabilir.

## 6. Çerezler (Cookies)

Çerezler, ziyaret ettiğin sitede tarayıcıya kaydedilen küçük metin dosyalarıdır. Zelula olarak çerezleri şeffaf biçimde sınıflandırır ve tercihlerine saygı duyarız.

Zorunlu çerezler: Oturumun, güvenliğin, sepetin ve temel site işlevlerinin çalışması için gereklidir; bunlar olmadan alışveriş deneyimi mümkün olmayabilir.

Analitik çerezler: Ziyaret sayıları, sayfa görüntülemeleri ve dönüşüm gibi istatistikleri anonim veya kimliği azaltılmış biçimde ölçmek için kullanılabilir (ör. Google Analytics). Bu çerezleri kabul etmediğin sürece ilgili ölçüm araçları devreye alınmaz.

Pazarlama çerezleri: İlgi alanına uygun içerik veya kampanya performansı için kullanılabilir; ayrı onayına bağlıdır.

Kontrol hakkın: Çerez tercihlerini site üzerindeki çerez bildirimi veya alt bilgideki "Çerez Ayarları" bağlantısı üzerinden dilediğin zaman güncelleyebilirsin. Ayrıca tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsin; bazı seçeneklerin kapatılması sitenin bölümlerinde kısıtlamaya yol açabilir.

## 7. Haklarınız (KVKK md. 11 kapsamında özet)

- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse bilgi talep etme
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
- Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme
- Eksik veya yanlış işlenmişse düzeltilmesini isteme
- KVKK'da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme
- Aktarılan üçüncü kişilere yukarıdaki işlemlerin bildirilmesini isteme
- Otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
- Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme

## 8. Saklama süresi

Veriler, ilgili mevzuatta öngörülen süreler ve meşru menfaatler doğrultusunda saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir.

Sipariş ve sözleşme metinleri web sitesinde yer alır: ${SITE_HREF}/mesafeli-satis-sozlesmesi ve ${SITE_HREF}/on-bilgilendirme-formu.`;
}
