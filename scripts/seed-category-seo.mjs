/**
 * Yaprak kategori SEO metinlerini categories.seo_* kolonlarına yazar.
 * Hub / erkek / çok satanlar kod haritasındadır (src/lib/categories/listing-copy.ts).
 *
 *   node scripts/seed-category-seo.mjs
 *   node scripts/seed-category-seo.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const TITLE_SUFFIX = " | Zelula";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

/** Yaprak kategoriler — categories.seo_* */
const LEAVES = {
  kolye: {
    seo_title: "Kolye Modelleri — Çelik, Zirkon ve Doğal Taş",
    seo_description:
      "Paslanmaz çelik, zirkon taşlı ve el yapımı doğal taş kolye modelleri. Günlük kullanımdan katmanlı kombinlere Zelula kolye koleksiyonunu keşfet.",
    seo_intro:
      "Paslanmaz çelik ve zirkon taşlı kolyelerden el yapımı doğal taş tasarımlara ve minimal zincirlere uzanan Zelula kolye seçkisini keşfet. Günlük kombinlerden daha iddialı görünümlere farklı stillere eşlik eden tasarımlar bir arada.",
    seo_body:
      "Kolye seçerken zincir uzunluğu ve kolyenin kıyafet üzerindeki duruşu önemli bir fark yaratır. Boyna yakın modeller açık yakalarla minimal bir görünüm sunarken daha uzun zincirler tek başına veya farklı kolyelerle katmanlı olarak kullanılabilir. Zirkon taşlı tasarımlar kombine ışıltı katarken sade çelik modeller günlük kullanıma kolayca uyum sağlar. Doğal taş ve el yapımı tasarımlarda ise kullanılan taşların renk, damar ve desenlerinde küçük farklılıklar görülebilir; bu detay her parçaya kendine özgü bir karakter kazandırır. Altın ve gümüş tonlarını tek başına kullanabileceğin gibi modern bir görünüm için birlikte de kombinleyebilirsin. Takılarının görünümünü uzun süre korumak için parfüm ve kozmetik ürünlerini uyguladıktan sonra kolyeni takmanı, kullanmadığında ise kuru ve temiz bir ortamda saklamanı öneririz.",
  },
  kupe: {
    seo_title: "Küpe Modelleri — Çelik, Zirkon ve Halka Küpe",
    seo_description:
      "Halka, sallantılı, stud, zirkon taşlı ve kıkırdak küpe modelleri. Günlük ve iddialı kombinlere uygun Zelula küpe koleksiyonunu keşfet.",
    seo_intro:
      "Zirkon taşlı sallantılı küpelerden minimal halka ve stud modellere uzanan Zelula küpe koleksiyonunu keşfet. Günlük kullanıma uygun sade tasarımlar ve kombinin odağı olacak dikkat çekici parçalar bir arada.",
    seo_body:
      "Küpe seçerken kullanım tarzın ve oluşturmak istediğin görünüm iyi bir başlangıç noktasıdır. Küçük halka ve stud modeller günlük kombinlere kolayca uyum sağlarken sallantılı ve daha dikkat çekici tasarımlar sade bir kombinin odağı olabilir. Birden fazla kulak deliğin varsa farklı boyutlardaki halka, stud ve kıkırdak küpelerini birlikte kullanarak kendi ear stack kombinini oluşturabilirsin. Zirkon taşlı modeller ışığı yakalayan detaylarıyla özellikle akşam kombinlerinde öne çıkar. Daha minimal modeller ise günün farklı saatlerine kolayca uyum sağlar. Küpelerini kullanmadığında ayrı bölmelerde veya birbirine sürtünmeyecek şekilde saklamak yüzeylerinin korunmasına yardımcı olur. Kozmetik ürünleri uyguladıktan sonra takılarını takmak da temiz ve parlak görünümlerini daha uzun süre korumalarını destekler.",
  },
  bileklik: {
    seo_title: "Bileklik Modelleri — Çelik ve Zirkon Taşlı",
    seo_description:
      "Zincir, su yolu, charm ve zirkon taşlı bileklik modelleri. Günlük kombinlerden özel günlere Zelula bileklik koleksiyonunu keşfet.",
    seo_intro:
      "İnce zincir bilekliklerden su yolu, charm ve zirkon detaylı modellere uzanan Zelula bileklik seçkisini keşfet. Tek başına kullanabileceğin veya farklı parçalarla katmanlayabileceğin tasarımlar bir arada.",
    seo_body:
      "Bileklik seçerken bilek ölçüsü kadar nasıl bir görünüm istediğin de önemlidir. İnce zincir modeller minimal kombinlere kolayca uyum sağlarken taşlı, charm detaylı ve su yolu tasarımlar bilekte daha belirgin bir etki yaratır. Birden fazla bilekliği birlikte kullanarak katmanlı bir görünüm oluşturabilir veya sevdiğin bir modeli saatinin yanında tamamlayıcı parça olarak tercih edebilirsin. Ölçü alırken bilek çevreni çok sıkmadan ölçmek ve ürün sayfasındaki ölçülerle karşılaştırmak doğru seçimi kolaylaştırır. Uzatma zinciri bulunan modeller farklı bilek ölçülerine uyum sağlamada ekstra esneklik sunar. Takılarının yüzeyini korumak için spor, ağır iş ve yoğun kimyasal teması sırasında çıkarmanı; kullanmadığında ise diğer takılarla sürtünmeyecek şekilde saklamanı öneririz.",
  },
  bilezik: {
    seo_title: "Bilezik Modelleri — Kelepçe ve Çelik Bilezik",
    seo_description:
      "Kelepçe, klasik ve modern formlardaki çelik bilezik modellerini keşfet. Tek başına veya katmanlı kombinlere uygun Zelula tasarımları.",
    seo_intro:
      "Kelepçe ve klasik formlardan modern, dikkat çekici tasarımlara uzanan Zelula bilezik koleksiyonunu keşfet. Bilekte güçlü bir görünüm oluşturan modelleri tek başına veya farklı bilekliklerle birlikte kullanabilirsin.",
    seo_body:
      "Bilezikler daha belirgin formları sayesinde tek bir parçayla kombinin havasını değiştirebilir. Kalın ve güçlü tasarımlar tek başına kullanıldığında dikkat çekici bir görünüm oluştururken daha sade modeller ince bilekliklerle birlikte katmanlanabilir. Kelepçe modellerde ürünün ölçüsü ve açıklığına dikkat etmek doğru seçimi kolaylaştırır. Ayarlanabilir yapıya sahip modellerde bileziği sürekli büküp açmak yerine ürünün formunu mümkün olduğunca korumak daha sağlıklıdır. Günlük kullanım sırasında masa, metal yüzeyler ve sert objelerle temas takının yüzeyinde zamanla kullanım izleri oluşturabilir. Bu nedenle bileziklerini kullanmadığında ayrı bir bölmede saklamanı öneririz. Koleksiyondaki farklı renk, yüzey ve form seçenekleri arasından kendi stiline uygun parçayı seçebilir, sade kombinlere tek bir güçlü detay ekleyebilirsin.",
  },
  halhal: {
    seo_title: "Halhal Modelleri — Deniz Temalı ve Boncuklu",
    seo_description:
      "Deniz kabuğu, balık figürü, charm ve renkli boncuk detaylı halhal modelleri. Yaz kombinlerini tamamlayan Zelula halhal koleksiyonunu keşfet.",
    seo_intro:
      "Deniz kabuğu, balık figürü, charm ve renkli boncuk detaylarıyla yaz stilini tamamlayan Zelula halhal modellerini keşfet. Sandaletlerden plaj kombinlerine yaz boyunca kullanabileceğin farklı tasarımlar bir arada.",
    seo_body:
      "Halhal seçerken ayak bileğinin ölçüsü ve zincirin nasıl durmasını istediğin önemlidir. Daha rahat ve hafif sarkan bir görünüm istiyorsan ayak bileğini ölçtükten sonra ürün ölçülerini kontrol ederek biraz hareket payı bırakabilirsin. Uzatma zinciri bulunan modeller farklı ölçülere uyum sağlamayı kolaylaştırır. Deniz temalı figürler, renkli boncuklar ve charm detayları özellikle yaz kombinlerine hareket katarken daha sade zincir modeller günlük stile kolayca uyum sağlar. Sandalet, terlik ve açık ayakkabılarla halhalın tamamı görünür hale gelir ve küçük bir detayla kombini tamamlar. El yapımı veya doğal materyal kullanılan modellerde boncuk, taş ve benzeri parçaların renk ve desenlerinde küçük farklılıklar bulunabilir. Kullanım sonrasında halhalını temiz ve kuru şekilde saklamak görünümünün korunmasına yardımcı olur.",
  },
  yuzuk: {
    seo_title: "Yüzük Modelleri — Zirkon Taşlı ve Çelik Yüzük",
    seo_description:
      "Zirkon taşlı, bant, minimal ve farklı ölçülerde çelik yüzük modelleri. Zelula yüzük koleksiyonunu ve stiline uygun tasarımları keşfet.",
    seo_intro:
      "Zirkon taşlı, bant, minimal ve dikkat çekici formlardan oluşan Zelula yüzük koleksiyonunu keşfet. Günlük kombinlerden özel günlere farklı stillere eşlik edecek tasarımlar bir arada.",
    seo_body:
      "Yüzük seçiminde tasarım kadar doğru ölçüyü bulmak da önemlidir. Numaranı bilmiyorsan sana iyi oturan bir yüzüğün iç çapını milimetre cinsinden ölçerek ürün ölçüleriyle karşılaştırabilirsin. Parmak ölçüsü sıcaklık ve gün içerisindeki değişimlerden etkilenebildiği için ölçümü parmağın normal durumdayken yapmak daha doğru sonuç verir. Geniş bantlı modeller aynı ölçüde daha sıkı hissedebilir; bu nedenle ürün açıklamasındaki ölçü bilgilerini kontrol etmeni öneririz. Ayarlanabilir olarak belirtilen modeller farklı ölçülere uyum sağlama konusunda daha esnek bir kullanım sunarken sabit ölçülü yüzüklerde doğru numarayı seçmek gerekir. Zirkon taşlı modeller tek başına dikkat çekici bir görünüm oluştururken sade bantları farklı yüzüklerle birlikte kullanarak kendi kombinini oluşturabilirsin.",
  },
  bros: {
    seo_title: "Broş Modelleri — Figürlü ve Taşlı Broşlar",
    seo_description:
      "Hayvan, çiçek ve farklı figürlerde taşlı broş modelleri. Ceket, gömlek, şal ve çantalara karakter katan Zelula broşlarını keşfet.",
    seo_intro:
      "Hayvan, çiçek ve farklı figürlerden ilham alan taşlı Zelula broşlarını keşfet. Ceket yakasından gömleğe, şaldan çantaya farklı parçalara küçük ama dikkat çekici bir detay ekle.",
    seo_body:
      "Broş, sade bir kombini küçük bir dokunuşla kişiselleştirmenin en kolay yollarından biridir. Ceket yakasında klasik bir görünüm yaratabilir, gömlek cebinin üzerinde farklı bir detay olarak kullanabilir veya çanta ve şal gibi aksesuarlara ekleyebilirsin. Büyük ve figürlü broşlar düz renkli parçaların üzerinde daha belirgin görünürken daha minimal tasarımlar desenli kıyafetlerle kolayca eşleşebilir. Hassas ve ince kumaşlarda broş iğnesinin iz bırakabileceğini göz önünde bulundurarak daha kalın veya katmanlı bölgelere takmanı öneririz. Ölçü gerektirmemeleri sayesinde broşlar hediye seçiminde de pratik bir alternatiftir. Kullanmadığında iğne mekanizmasını kapalı tutmak ve diğer takılardan ayrı saklamak hem broşun hem de diğer parçaların yüzeyini korumaya yardımcı olur.",
  },
  setler: {
    seo_title: "Takı Setleri — Kolye, Küpe ve Kombin Setleri",
    seo_description:
      "Birbiriyle uyumlu kolye, küpe ve farklı takı setlerini keşfet. Tek seferde tamamlanmış kombinler ve hediyelik Zelula seçenekleri.",
    seo_intro:
      "Birbiriyle uyumlu parçaları bir araya getiren Zelula takı setlerini keşfet. Hazır kombinlerden farklı küpe setlerine, birlikte veya ayrı ayrı kullanabileceğin tasarımlar bir arada.",
    seo_body:
      "Takı setleri, birbirine uyumlu parçaları tek seçimde bir araya getirmenin pratik bir yoludur. Benzer renk, taş ve form detaylarına sahip parçalar birlikte kullanıldığında dengeli bir görünüm oluşturur. Set içerisindeki parçaları her zaman birlikte kullanmak zorunda değilsin; kolye, küpe veya diğer parçaları farklı kombinlere ayrı ayrı dahil ederek tek setten birden fazla stil çıkarabilirsin. Birden fazla kulak deliğine yönelik küpe setleri ise farklı boyut ve formları aynı kulakta bir araya getirerek katmanlı bir görünüm oluşturmayı kolaylaştırır. Hediye seçerken de setler güçlü bir alternatiftir. Satın almadan önce ürün sayfasındaki set içeriğini, ölçüleri ve parça sayısını kontrol ederek sana en uygun modeli seçebilirsin.",
  },
  saat: {
    seo_title: "Saat Modelleri — Çelik Kadın ve Erkek Saat",
    seo_description:
      "Çelik kasalı kadın ve erkek kol saatleri. Quartz mekanizma, metal ve deri kordon seçenekleri. 14 gün iade.",
    seo_intro:
      "Çelik kasalı quartz kol saatleri. Günlük kullanıma uygun sade kadranlar, metal ve deri kordon seçenekleriyle kadın ve erkek modeller.",
    seo_body:
      "Saat seçerken kasa çapı bilek genişliğine göre belirlenir: ince bileklerde 32–36 mm, daha geniş bileklerde 38–42 mm orantılı durur. Metal bilezikli modeller şık ve dayanıklıdır, deri kordon ise daha yumuşak ve hafif bir kullanım sunar. Quartz mekanizma pil ile çalışır, kurma gerektirmez ve günlük hassasiyeti yüksektir; pil ömrü kullanıma göre genellikle 1–2 yıldır. Çelik kasa suya ve tere dayanıklıdır ama saatlerin su geçirmezlik seviyeleri farklıdır; duş ve denizde çıkarman en güvenlisidir. Kordon boyunu ayarlamak için kuyumcuya gitmen gerekebilir, metal bilezikli modellerde baklalar çıkarılarak ayarlanır. Saatini mıknatıslı yüzeylerden ve sert darbelerden uzak tut.",
  },
  "hediye-karti": {
    seo_title: "Zelula Dijital Hediye Kartı — Hediyeni O Seçsin",
    seo_description:
      "Ne seçeceğinden emin değilsen Zelula dijital hediye kartını tercih et. Takı ve aksesuar sevenler için seçim özgürlüğü sunan pratik bir hediye.",
    seo_intro:
      "Hangi takıyı seçeceğinden emin değilsen kararı ona bırak. Zelula dijital hediye kartıyla sevdiklerine kendi favori parçalarını seçme özgürlüğü hediye edebilirsin.",
    seo_body:
      "Takı hediye ederken model, renk veya ölçü konusunda karar vermek her zaman kolay olmayabilir. Zelula dijital hediye kartı, hediye edeceğin kişinin kendi stiline uygun parçayı seçmesine olanak tanıyan pratik bir alternatiftir. Kolye, küpe, bileklik, yüzük ve diğer Zelula tasarımları arasından kendi favorisini belirleyebilir. Özellikle zevkinden veya yüzük gibi ürünlerde doğru ölçüden emin olmadığın kişiler için seçim riskini azaltır. Doğum günü, yıldönümü, özel gün veya küçük bir sürpriz için değerlendirebileceğin dijital hediye kartının güncel kullanım koşulları, geçerlilik süresi ve diğer detayları ürün sayfasında belirtilir. Böylece hediyeyi sen seçerken asıl parçayı seçme keyfi ona kalır.",
  },
};

function codeMapTitles() {
  const file = fs.readFileSync(path.join(ROOT, "src/lib/categories/listing-copy.ts"), "utf8");
  const start = file.indexOf("export const CODE_LISTING_COPY");
  const slice = start >= 0 ? file.slice(start) : file;
  const titles = [];
  const re = /(?:^|\n)\s{2}(?:"([^"]+)"|([A-Za-z0-9-]+)):\s*\{[\s\S]*?titleSegment:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(slice))) {
    titles.push({ key: match[1] || match[2], title: match[3] });
  }
  return titles;
}

function printTitleLengths(rows) {
  console.log(`\nTam <title> = seo_title + "${TITLE_SUFFIX}" (layout şablonu). 60 üstü:`);
  const over = [];
  for (const row of rows) {
    const full = `${row.title}${TITLE_SUFFIX}`;
    const flag = full.length > 60 ? " AŞIYOR" : "";
    console.log(`  ${String(full.length).padStart(3)}  ${row.key}  ${full}${flag}`);
    if (full.length > 60) over.push({ key: row.key, length: full.length, full });
  }
  if (over.length === 0) console.log("  60 karakteri aşan başlık yok.");
  return over;
}

const slugs = Object.keys(LEAVES);
const codeTitles = codeMapTitles();
console.log(`Kod haritası (DB yazılmaz): ${codeTitles.map((row) => row.key).join(", ") || "(başlık okunamadı)"}`);
printTitleLengths([
  ...slugs.map((slug) => ({ key: slug, title: LEAVES[slug].seo_title })),
  ...codeTitles,
]);

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await admin
  .from("categories")
  .select("id,slug,name,seo_title,seo_description,seo_intro,seo_body")
  .in("slug", slugs);

if (error) {
  console.error("Sorgu hatası:", error.message);
  if (String(error.message).includes("seo_title")) {
    console.error("Kolon yok. Önce supabase/migrations/20261009103000_categories_seo_copy.sql çalışmalı.");
  }
  process.exit(1);
}

const bySlug = new Map((data ?? []).map((row) => [row.slug, row]));
console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", leaves: slugs.length }, null, 2));

const missing = [];
for (const slug of slugs) {
  const row = bySlug.get(slug);
  const next = LEAVES[slug];
  if (!row) {
    missing.push(slug);
    console.log(`\nMISSING  ${slug}`);
    continue;
  }
  const same =
    (row.seo_title ?? "") === next.seo_title &&
    (row.seo_description ?? "") === next.seo_description &&
    (row.seo_intro ?? "") === next.seo_intro &&
    (row.seo_body ?? "") === next.seo_body;
  console.log(
    `\n${slug}  ${row.name}  ${same ? "aynı" : "yazılacak"}  title ${next.seo_title.length}  desc ${next.seo_description.length}  intro ${next.seo_intro.length}  body ${next.seo_body.length}`,
  );
  console.log(`  şimdi: ${row.seo_title || "(boş)"}`);
  console.log(`  yeni:  ${next.seo_title}`);
}

if (missing.length > 0) {
  console.error("\nKategori satırı yok:", missing.join(", "));
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry-run bitti. Veritabanı değişmedi.");
  process.exit(0);
}

let updated = 0;
for (const slug of slugs) {
  const { error: updateError } = await admin.from("categories").update(LEAVES[slug]).eq("slug", slug);
  if (updateError) {
    console.error("update fail", slug, updateError.message);
    process.exit(1);
  }
  updated += 1;
}
console.log(`\nApply bitti. ${updated} kategori güncellendi.`);
