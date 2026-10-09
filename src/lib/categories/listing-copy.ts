/**
 * Kategori / vitrin SEO metinleri.
 * Yaprak kategoriler: `categories.seo_*` (admin). Boşsa aşağıdaki şablon.
 * Hub, erkek ve çok satanlar: bu dosyadaki CODE_LISTING_COPY (DB satırı yok).
 *
 * seo_title / titleSegment tam `<title>` değildir. Layout şablonu sonuna
 * " | Zelula" ekler. Alana "| Zelula" yazılırsa kırpılır.
 */

export type ListingCopy = {
  /** `<title>` parçası. Şablon: `${titleSegment} | Zelula` */
  titleSegment?: string;
  description?: string;
  /** H1 altı kısa metin */
  intro?: string;
  /** Ürün gridinin altındaki uzun metin. Paragraflar boş satırla ayrılır. */
  body?: string;
};

export const CODE_LISTING_COPY: Record<string, ListingCopy> = {
  takilar: {
    titleSegment: "Takı Modelleri — Kolye, Küpe, Bileklik ve Yüzük",
    description:
      "Kolye, küpe, bileklik, yüzük, halhal ve takı setlerini tek sayfada keşfet. Zelula'nın çelik, zirkon ve doğal taş tasarımlarını incele.",
    intro:
      "Kolye, küpe, bileklik, yüzük, halhal ve setlerden oluşan Zelula takı koleksiyonunu tek sayfada keşfet. Çelik ve zirkon detaylı modellerden el yapımı ve doğal taş tasarımlara farklı stiller bir arada.",
    body: "Zelula koleksiyonunda günlük stile kolayca uyum sağlayan çelik ve zirkon detaylı tasarımların yanında doğal taş, boncuk ve farklı materyallerin kullanıldığı el yapımı parçalar da bulunur. Minimal zincirlerden dikkat çekici küpelere, yüzüklerden yaz kombinlerini tamamlayan halhallara kadar farklı kategoriler arasından kendi stiline uygun parçaları keşfedebilirsin. Doğal taş ve el yapımı ürünlerde kullanılan materyallerin renk, damar ve desenlerinde küçük farklılıklar bulunması her parçaya kendine özgü bir görünüm kazandırır. Altın ve gümüş tonlarını ayrı ayrı kullanabileceğin gibi farklı takıları katmanlayarak kendi kombinini de oluşturabilirsin. Günlük kullanımdan hediyelik seçeneklere kadar Zelula'nın güncel takı koleksiyonunu bu sayfadan inceleyebilirsin.",
  },
  aksesuar: {
    titleSegment: "Aksesuar Modelleri — Broş ve Tamamlayıcı Parçalar",
    description:
      "Broş ve farklı tamamlayıcı aksesuar modellerini keşfet. Günlük stile karakter katan ve hediye seçimine uygun Zelula aksesuarları.",
    intro:
      "Takıların dışında stiline küçük dokunuşlar ekleyen Zelula aksesuarlarını keşfet. Broşlardan sezonluk tamamlayıcı parçalara farklı seçenekler bu kategoride bir araya geliyor.",
    body: "Aksesuarlar küçük detaylarla günlük stile farklı bir karakter kazandırmanın kolay yollarından biridir. Figürlü ve taşlı broşları ceket, gömlek, şal veya çanta üzerinde kullanabilir; farklı tamamlayıcı parçalarla kombinine kişisel bir dokunuş ekleyebilirsin. Ölçü gerektirmeyen aksesuarlar hediye seçiminde de pratik seçenekler sunar. Daha dikkat çekici tasarımları sade kıyafetlerin üzerinde öne çıkarabilir veya minimal parçaları günlük stiline dahil edebilirsin. Koleksiyonda yer alan ürünler ve stoklar dönemsel olarak değişebileceği için kategoriye yeni tasarımlar eklendikçe farklı seçeneklerle karşılaşabilirsin. Hediye edeceğin kişinin stilinden emin değilsen Zelula dijital hediye kartını da alternatif olarak değerlendirebilirsin.",
  },
  erkek: {
    titleSegment: "Erkek Takı Modelleri — Çelik Bileklik ve Yüzük",
    description:
      "Erkek bileklik ve yüzük modellerini keşfet. Zincir, halat, bant ve farklı formlardaki Zelula erkek takılarıyla stilini tamamla.",
    intro:
      "Zincir ve halat detaylı bilekliklerden güçlü formlu yüzüklere uzanan Zelula erkek takı koleksiyonunu keşfet. Günlük stile kolayca uyum sağlayan sade ve karakterli tasarımlar bir arada.",
    body: "Erkek takılarında tasarımın kalınlığı, yüzey dokusu ve ölçü parçanın genel görünümünü belirler. Kalın zincir ve halat detaylı bileklikler bilekte daha güçlü bir etki yaratırken sade modeller saatle veya farklı bilekliklerle birlikte kullanılabilir. Yüzüklerde geniş bantlar daha belirgin bir görünüm oluştururken daha minimal formlar günlük kombinlere kolayca uyum sağlar. Bileklik seçerken bilek çevreni ölçerek ürün sayfasındaki uzunluk bilgileriyle karşılaştırmak, yüzük seçiminde ise iyi oturan bir yüzüğün iç çapından yararlanmak doğru ölçüyü bulmayı kolaylaştırır. Paslanmaz çelik kullanılan modeller dayanıklı yapıları sayesinde günlük kullanım için pratik bir seçenek sunar. Zelula erkek koleksiyonundaki farklı form ve yüzey seçenekleri arasından kendi stiline uygun parçayı seçebilirsin.",
  },
  "erkek-bileklik": {
    titleSegment: "Erkek Bileklik — Çelik Zincir ve Halat Modeller",
    description:
      "Zincir, halat ve farklı formlardaki erkek bileklik modellerini keşfet. Günlük stile uygun Zelula çelik erkek bilekliklerini incele.",
    intro:
      "Halat, zincir ve farklı gövde formlarındaki Zelula erkek bilekliklerini keşfet. Tek başına veya saatle birlikte kullanılabilecek sade ve güçlü tasarımlar bir arada.",
    body: "Erkek bilekliklerinde doğru ölçü, parçanın bilekteki görünümünü ve kullanım rahatlığını doğrudan etkiler. Bilek çevreni çok sıkmadan ölçerek ürün sayfasındaki bileklik uzunluğuyla karşılaştırabilirsin. Daha kalın gövdeli modeller bilekte daha belirgin dururken ince zincirler saat ve diğer bilekliklerle birlikte kullanıldığında dengeli bir görünüm oluşturabilir. Halat ve zincir formlar tek başına da güçlü bir stil detayıdır. Yüzey dokusu ve metal tonu ise bilekliğin karakterini değiştirir; daha sade yüzeyler günlük stile kolayca uyum sağlarken detaylı modeller kombinin odağı olabilir. Spor, ağır iş veya sert yüzeylerle yoğun temas sırasında bilekliği çıkarmak çizilme ve darbe riskini azaltır. Ürün ölçüsü ve varsa ayarlanabilirlik bilgisi için ilgili ürün sayfasındaki detayları kontrol etmeni öneririz.",
  },
  "erkek-yuzuk": {
    titleSegment: "Erkek Yüzük — Çelik Signet ve Bant Model",
    description:
      "Bant, signet ve farklı detaylara sahip erkek yüzük modellerini keşfet. Zelula erkek koleksiyonunda stiline uygun tasarımı bul.",
    intro:
      "Bant, signet ve farklı yüzey detaylarına sahip Zelula erkek yüzüklerini keşfet. Günlük stile karakter katan sade, güçlü ve modern formlar bir arada.",
    body: "Erkek yüzüklerinde tasarım kadar doğru ölçü de önemlidir. Sana iyi oturan bir yüzüğün iç çapını milimetre cinsinden ölçerek ürün sayfasındaki ölçülerle karşılaştırmak pratik bir yöntemdir. Geniş bantlı yüzükler aynı ölçüde daha sıkı hissedebileceğinden modelin bant genişliğini ve ölçü bilgisini kontrol etmek seçim yapmayı kolaylaştırır. Signet ve kalın gövdeli modeller tek başına güçlü bir görünüm oluştururken daha sade bant yüzükler farklı takılarla rahatlıkla kombinlenebilir. Paslanmaz çelik kullanılan modeller günlük kullanım için dayanıklı bir alternatif sunar ancak sert yüzeylerle temas zaman içerisinde kullanım izleri oluşturabilir. Ağırlık kaldırırken veya yoğun fiziksel işlerde yüzüğü çıkarmak hem takının yüzeyini korumaya hem de daha rahat kullanıma yardımcı olur.",
  },
  "cok-satanlar": {
    titleSegment: "Çok Satanlar — En Çok Tercih Edilen Takılar",
    description:
      "Zelula'da öne çıkan ve en çok tercih edilen kolye, küpe, bileklik ve diğer takı modellerini keşfet. Favori parçanı bul.",
    intro:
      "Zelula'da öne çıkan ve müşterilerimizin sık tercih ettiği tasarımları bir arada keşfet. Kolye, küpe, bileklik ve farklı kategorilerden sevilen parçalar bu sayfada buluşuyor.",
    body: "Hangi takıyla başlayacağına karar veremiyorsan Çok Satanlar koleksiyonu sana fikir verebilir. Günlük kombinlere kolayca uyum sağlayan tasarımlardan daha dikkat çekici parçalara farklı kategorilerde öne çıkan modelleri bir arada inceleyebilirsin. Minimal kolyeler, küpeler ve ölçü gerektirmeyen parçalar hediye seçiminde de pratik alternatifler sunar. Koleksiyondaki ürünler stok ve ilgi durumuna göre zaman içerisinde değişebileceği için bu sayfada farklı dönemlerde yeni favorilerle karşılaşabilirsin. Kendi stiline uygun parçayı seçebilir veya Zelula koleksiyonunda nelerin öne çıktığını görmek için bu kategoriyi başlangıç noktası olarak kullanabilirsin.",
  },
};

export type DbListingSeo = {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_intro?: string | null;
  seo_body?: string | null;
};

export type ResolvedListingCopy = {
  titleSegment: string;
  description: string;
  intro: string | null;
  body: string | null;
};

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

/** Tam başlık yapıştırılırsa marka son ekini at. */
export function asTitleSegment(raw: string, fallback: string): string {
  const stripped = raw
    .trim()
    .replace(/\s*\|\s*Zelula(?:\s+Design)?\s*$/i, "")
    .trim();
  return stripped || fallback;
}

export function resolveListingCopy(input: {
  db?: DbListingSeo | null;
  codeKey?: string | null;
  fallbackTitle: string;
  fallbackDescription: string;
}): ResolvedListingCopy {
  const code = input.codeKey ? CODE_LISTING_COPY[input.codeKey] : undefined;
  const titleRaw = clean(input.db?.seo_title) || clean(code?.titleSegment);
  const description = clean(input.db?.seo_description) || clean(code?.description) || input.fallbackDescription;
  const intro = clean(input.db?.seo_intro) || clean(code?.intro) || null;
  const body = clean(input.db?.seo_body) || clean(code?.body) || null;
  return {
    titleSegment: asTitleSegment(titleRaw, input.fallbackTitle),
    description,
    intro,
    body,
  };
}

export function categoryFallbackDescription(name: string): string {
  return `${name} modelleri — paslanmaz çelik ve zamansız Zelula Design takı seçkisi. 650₺ üzeri ücretsiz kargo.`;
}

export function erkekHubFallbackDescription(): string {
  return "Erkek çelik bileklik ve yüzük modelleri — maskülen, günlük ve statement Zelula Design seçkisi. 650₺ üzeri ücretsiz kargo.";
}

export function erkekLeafFallbackDescription(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  return `Erkek ${lower} modelleri — paslanmaz çelik Zelula Design seçkisi. 650₺ üzeri ücretsiz kargo.`;
}

export const BESTSELLERS_FALLBACK_TITLE = "Çok satanlar";
export const BESTSELLERS_FALLBACK_DESCRIPTION =
  "Zelula’da en çok tercih edilen öne çıkan parçalar.";
