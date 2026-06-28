/**
 * Ürün uzun açıklaması: şablon tespiti + SEO-dostu benzersiz metin üretimi.
 * Bakım paragrafı tüm ürünlerde aynı kalabilir (duplicate content riski düşük).
 */

/** Tüm fiziksel ürünlerde ortak — bilinçli tekrar. */
export const STANDARD_CARE_PARAGRAPH =
  "Bakım ve kullanım: Parfüm, losyon ve klorlu su ile doğrudan temas ettirmeyin. Takınızı yumuşak, kuru bir bezle silerek parlatın; kapalı bir kılıfta, nemden uzak saklayın. Uzun ömür için uyurken ve hamam/sauna öncesinde çıkarmanızı öneririz.";

const EMOJI_BULLET_RE = /^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u;

/** Geniş emoji havuzu — her üründe farklı 4'lü permütasyon. */
const EMOJI_POOL = [
  "💙",
  "📿",
  "✨",
  "🔗",
  "💎",
  "🌙",
  "⭐",
  "🌟",
  "🎁",
  "🪞",
  "🦋",
  "🌸",
  "🔮",
  "⚡",
  "🌊",
  "💫",
  "🌺",
  "🍃",
  "🪷",
  "🔆",
];

/** Birden fazla üründe birebir geçen kalıplar — şablon göstergesi. */
export const GENERIC_PHRASE_MARKERS = [
  "şık ve zarif",
  "hediye alternatifi",
  "eşsiz bir hediye",
  "öne çıkan özellikler",
  "günlük kullanım için ideal",
  "her kombine uyum sağlar",
  "modern ve şık tasarım",
  "yüksek kaliteli malzeme",
  "cilt dostu yapı",
  "zarif bir dokunuş",
  "stilinize şıklık katar",
  "sevdikleriniz için mükemmel",
  "minimal çizgisiyle öne çıkan",
  "şık bir kulak aksesuarı arayanlar için tasarlandı",
  "hem tek başına hem çiftli kombinlerde dengeli durur",
];

const ZODIAC_SIGNS = {
  koc: "Koç",
  boga: "Boğa",
  ikizler: "İkizler",
  yengec: "Yengeç",
  aslan: "Aslan",
  basak: "Başak",
  terazi: "Terazi",
  akrep: "Akrep",
  yay: "Yay",
  oglak: "Oğlak",
  kova: "Kova",
  balik: "Balık",
  aquarius: "Kova",
  aries: "Koç",
  taurus: "Boğa",
  gemini: "İkizler",
  cancer: "Yengeç",
  leo: "Aslan",
  virgo: "Başak",
  libra: "Terazi",
  scorpio: "Akrep",
  sagittarius: "Yay",
  capricorn: "Oğlak",
  pisces: "Balık",
};

const VARIANT = {
  light: ["hafif", "ince", "zarif", "yumuşak", "sade"],
  shine: ["parıltı", "ışıltı", "parlaklık", "yansıma", "doku"],
  daily: ["günlük", "her gün", "gündelik", "rutin", "sürekli"],
  frame: ["çerçeveler", "tamamlar", "vurgular", "dengeye katar", "örtüşür"],
};

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(pool, seed, offset = 0) {
  return pool[(seed + offset) % pool.length];
}

function pickVariant(key, variant) {
  const pool = VARIANT[key] ?? VARIANT.light;
  return pool[variant % pool.length];
}

/** Parçaları tek boşlukla birleştir; çift boşluk üretmez. */
function formatPhrase(...parts) {
  return parts
    .flatMap((p) => String(p ?? "").trim().split(/\s+/))
    .filter(Boolean)
    .join(" ");
}

const MATERIAL_ABLATIVE = {
  çelik: "çelikten",
  alaşım: "alaşımdan",
  altın: "altından",
  gümüş: "gümüşten",
  bakır: "bakırdan",
  platin: "platinden",
};

function repairInputTypos(text) {
  return String(text ?? "")
    .replace(/\b[Pp]aslanmazz+\b/g, (m) => (m[0] === "P" ? "Paslanmaz" : "paslanmaz"))
    .replace(/\b[Pp]asllanmaz\b/g, (m) => (m[0] === "P" ? "Paslanmaz" : "paslanmaz"))
    .replace(/\bçeelik\b/gi, (m) => (m[0] === "Ç" ? "Çelik" : "çelik"))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function materialAblative(materialLo) {
  const lo = repairInputTypos(materialLo).toLocaleLowerCase("tr-TR");
  const words = lo.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "dayanıklı alaşımdan";

  const last = words[words.length - 1];
  const abl = MATERIAL_ABLATIVE[last];
  if (abl) {
    return formatPhrase(...words.slice(0, -1), abl);
  }
  if (words.length === 1) return `${last} malzemeden`;
  return formatPhrase(...words.slice(0, -1), `${last} malzemeden`);
}

/** Türkçe -sını/-sunu: "parlaklık" → "parlaklığını", "ışıltı" → "ışıltısını" */
function shineAccusative(variant) {
  const w = pickVariant("shine", variant);
  const map = {
    parıltı: "parıltısını",
    ışıltı: "ışıltısını",
    parlaklık: "parlaklığını",
    yansıma: "yansımasını",
    doku: "dokusunu",
  };
  return map[w] ?? `${w}sunu`;
}

function normalizeColorInput(raw) {
  let c = repairInputTypos(String(raw ?? "").trim() || "nötr ton");
  c = c.replace(/\s+(tonu|ton|renk)$/i, "").trim();
  return c || "nötr";
}

function normalizeMaterialInput(raw) {
  let m = repairInputTypos(String(raw ?? "").trim() || "dayanıklı alaşım");
  m = m.replace(/\s+malzeme(si|den|li)?$/i, "").trim();
  return m || "dayanıklı alaşım";
}

function colorTonPhrase(normalizedColor) {
  return `${normalizedColor.toLocaleLowerCase("tr-TR")} tonu`;
}

function colorTonunuPhrase(normalizedColor) {
  return `${normalizedColor.toLocaleLowerCase("tr-TR")} tonunu`;
}

function colorTonluPhrase(normalizedColor) {
  return `${normalizedColor.toLocaleLowerCase("tr-TR")} tonlu`;
}

/** "taş detayı" + "detayıyla" gibi çift eklemeyi önler. */
function motifDetailAdverb(motif) {
  if (!motif) return "";
  if (/detayıyla$/i.test(motif)) return `${motif} `;
  if (/detayı$/i.test(motif)) return `${motif}yla `;
  return `${motif} detayıyla `;
}

function motifDetailObject(motif) {
  if (!motif) return "";
  if (/detayını$/i.test(motif)) return `${motif} `;
  if (/detayı$/i.test(motif)) return `${motif.replace(/detayı$/i, "detayını")} `;
  return `${motif} detayını `;
}

function motifDesignClause(motif) {
  if (!motif) return "";
  const cap = motif.charAt(0).toLocaleUpperCase("tr-TR") + motif.slice(1);
  return `${cap},`;
}

function motifModelDetail(motif) {
  if (!motif) return "İnce detay";
  if (/detay/i.test(motif)) return motif.charAt(0).toLocaleUpperCase("tr-TR") + motif.slice(1);
  return `${motif} detayı`;
}

function colorTonuylaPhrase(normalizedColor) {
  return `${normalizedColor.toLocaleLowerCase("tr-TR")} tonuyla`;
}

function materialSourcePhrase(materialLo) {
  return `${materialAblative(materialLo)} üretilen`;
}

function buildMaterialBulletLines(material, seed) {
  const m = normalizeMaterialInput(material);
  const lo = m.toLocaleLowerCase("tr-TR");
  const abl = materialAblative(lo);
  const pool = [
    `${m} gövde; günlük temasta formunu korumaya yardımcı olur.`,
    `Malzeme: ${m} — cilde nazik, uzun süreli kullanım için seçildi.`,
    `${m} yapı; hafif hissiyle gün boyu konfor sunar.`,
    `Gövde ${abl}; parlaklığını uzun süre taşır.`,
    `İşçilik: ${m} üzerinde ince detay işlemesi.`,
    `${m} tercih edildi; oksidasyon ve matlaşmaya karşı dengeli bir yüzey hedeflenir.`,
    `${lo} ile şekillendirilen gövde; hafif ama dayanıklı bir yapı sunar.`,
    `Gövde malzemesi ${m}; tenle temasta konfor odaklı bir deneyim amaçlanır.`,
    `Üretimde ${lo} kullanıldı; günlük kullanımda formunu korumayı hedefler.`,
    `Gövde için ${lo} seçildi; darbelere karşı dengeli dayanım sağlar.`,
    `${lo} yüzey işçiliği; uzun süreli parlaklık için optimize edildi.`,
    `Ana malzeme ${m}; alerji hassasiyeti olan kullanıcılar için uygun bir seçenektir.`,
    `${abl} gövde; formunu koruyan dengeli bir yapı sunar.`,
    `İşlenmiş ${abl} gövde; çizilme ve matlaşmaya karşı dengeli bir kaplama ile sunulur.`,
    `${lo} alaşımı gövdede kullanıldı; hafiflik ve dayanıklılık birlikte hedeflendi.`,
    `Seçilen ${lo} yapı; günlük temasta şekil bütünlüğünü korumaya yardımcı olur.`,
    `${m} ile üretilen gövde; uzun süreli takıma uygun bir profil sunar.`,
    `Kaplama altında ${lo} gövde; parlaklığını korumaya yönelik işlendi.`,
  ];
  return pick(pool, seed, 0);
}

function buildColorBulletLines(color, seed) {
  const c = normalizeColorInput(color);
  const lo = c.toLocaleLowerCase("tr-TR");
  const pool = [
    `${c} kaplama; sıcak ve soğuk altın tonlarıyla kolay kombinlenir.`,
    `Renk: ${c} — ten rengine yumuşak geçişli bir parlaklık verir.`,
    `${c} yüzey, ışığı yumuşak yansıtarak abartısız bir ışıltı bırakır.`,
    `Kaplama tonu ${c}; minimal ve iddialı stillere eşlik eder.`,
    `${c} bitiş; tek parçalık veya katmanlı takı setlerinde uyum sağlar.`,
    `Yüzey rengi ${c}; gümüş ve altın aksesuarlarla karışık metal stillerine uyar.`,
    `${colorTonPhrase(c)}, doğal ışıkta ve iç mekân aydınlatmasında farklı derinliklerde görünür.`,
    `Seçilen ${lo} kaplama, parçanın karakterini belirleyen ana detaydır.`,
  ];
  return pick(pool, seed, 1);
}

/** Şablon birleştirme artifaktlarını düzelt (sını/sunu eki, çift kelime, çift boşluk). */
export function repairConcatArtifacts(text) {
  return String(text ?? "")
    .split("\n")
    .map((line) =>
      line
        .replace(/parlaklıksını/g, "parlaklığını")
        .replace(/ışıltısınısını/g, "ışıltısını")
        .replace(/yansımasınısını/g, "yansımasını")
        .replace(/dokusunusunu/g, "dokusunu")
        .replace(/parıltısınısını/g, "parıltısını")
        .replace(/([a-zçğıöşü])sınısını/gi, "$1sını")
        .replace(/\btercihh\b/gi, "tercih")
        .replace(/\bkoruyyan\b/gi, "koruyan")
        .replace(/\bkullanımmda\b/gi, "kullanımda")
        .replace(/\bçeelik\b/gi, (m) => (m[0] === "Ç" ? "Çelik" : "çelik"))
        .replace(/\b[Pp]aslanmazz+\b/g, (m) => (m[0] === "P" ? "Paslanmaz" : "paslanmaz"))
        .replace(/\b[Pp]asllanmaz\b/g, (m) => (m[0] === "P" ? "Paslanmaz" : "paslanmaz"))
        .replace(/\b(\p{L}+)\s+ton\s+tonu(nu)?\b/giu, "$1 tonu$2")
        .replace(/\bdetayı\s+detayı/gi, "detayı")
        .replace(/\bdetayını\s+detayını/gi, "detayını")
        .replace(/\bdetayıyla\s+detayı/gi, "detayıyla")
        .replace(/\bmalzeme\s+malzeme/gi, "malzeme")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .join("\n");
}

/** @deprecated alias */
export function sanitizeGeneratedText(text) {
  return repairConcatArtifacts(text);
}

function shuffleArray(arr, seed) {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickFourEmojis(seed) {
  return shuffleArray(EMOJI_POOL, seed).slice(0, 4);
}

function normalizeFingerprint(text) {
  return String(text ?? "")
    .replace(STANDARD_CARE_PARAGRAPH, "")
    .replace(/Bakım(?:\s+ve\s+kullanım)?\s*:[\s\S]*$/i, "")
    .replace(EMOJI_BULLET_RE, "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function stripCareParagraph(text) {
  const raw = String(text ?? "").trim();
  const idx = raw.search(/\n\s*Bakım(?:\s+ve\s+kullanım)?\s*:/i);
  if (idx >= 0) return raw.slice(0, idx).trim();
  return raw;
}

export function countEmojiBullets(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  return lines.filter((line) => EMOJI_BULLET_RE.test(line.trim())).length;
}

function detectZodiacSign(name, slug) {
  const hay = `${name} ${slug}`.toLocaleLowerCase("tr-TR");
  for (const [key, label] of Object.entries(ZODIAC_SIGNS)) {
    if (hay.includes(key) || hay.includes(label.toLocaleLowerCase("tr-TR"))) return label;
  }
  if (hay.includes("burcu") || hay.includes("zodyak")) return "burç";
  return null;
}

function detectDesignMotif(name) {
  const n = name.toLocaleLowerCase("tr-TR");
  if (/fish|balık|balik/.test(n)) return "balık motifi";
  if (/drop|damla/.test(n)) return "damla formu";
  if (/halka|hoop/.test(n)) return "halka silueti";
  if (/yıldız|yildiz|star/.test(n)) return "yıldız detayı";
  if (/kalp|heart/.test(n)) return "kalp formu";
  if (/taşlı|tasli|stone|pave/.test(n)) return "taş detayı";
  if (/zincir|chain/.test(n)) return "zincir hattı";
  if (/inci|pearl/.test(n)) return "inci dokunuşu";
  if (/halo|aura/.test(n)) return "hale efekti";
  if (/artisan|el yapımı|hand/.test(n)) return "artisan işçilik";
  return null;
}

export function categoryKind(categorySlug, name) {
  const slug = String(categorySlug ?? "").toLowerCase();
  const n = name.toLocaleLowerCase("tr-TR");
  if (slug.includes("kupe") || n.includes("küpe") || n.includes("kupe")) return "kupe";
  if (slug.includes("kolye") || n.includes("kolye")) return "kolye";
  if (slug.includes("yuzuk") || n.includes("yüzük") || n.includes("yuzuk")) return "yuzuk";
  if (slug.includes("bileklik") || slug.includes("bilezik") || n.includes("bileklik") || n.includes("bilezik"))
    return "bileklik";
  if (slug.includes("halhal") || n.includes("halhal")) return "halhal";
  if (slug.includes("sahmeran") || n.includes("şahmeran") || n.includes("sahmeran")) return "sahmeran";
  if (slug.includes("bros") || n.includes("broş") || n.includes("bros")) return "bros";
  if (slug.includes("anahtarlik") || n.includes("anahtarlık")) return "anahtarlik";
  if (slug.includes("sapka") || n.includes("şapka")) return "sapka";
  if (slug.includes("hediye")) return "gift_card";
  return "aksesuar";
}

function buildProductCtx(product) {
  const material = normalizeMaterialInput(product.material);
  const color = normalizeColorInput(product.color);
  return {
    name: product.name,
    material,
    materialLo: material.toLocaleLowerCase("tr-TR"),
    color,
    colorLo: color.toLocaleLowerCase("tr-TR"),
    colorTon: colorTonPhrase(color),
    colorTonunu: colorTonunuPhrase(color),
    colorTonlu: colorTonluPhrase(color),
    collection: String(product.collectionName ?? "").trim(),
    motif: detectDesignMotif(product.name),
    zodiac: detectZodiacSign(product.name, product.slug),
  };
}

/** @typedef {(c: ReturnType<typeof buildProductCtx>, v: number) => string} OpenerBuilder */

/** @type {Record<string, OpenerBuilder[]>} */
const CATEGORY_OPENERS = {
  kupe: [
    (c, v) =>
      c.motif
        ? `${c.name} kulak hattında ${c.motif} ile durur; ${c.colorTon} ${pickVariant("shine", v)} yüz hatlarına ${pickVariant("frame", v)}.`
        : `${c.name}, ${c.colorTon} ve ${pickVariant("light", v)} ${c.materialLo} gövdesiyle ${pickVariant("daily", v)} kullanımda konforlu kalır.`,
    (c, v) =>
      `${c.color} kaplamalı ${c.name}, saç toplandığında kulak çevresine ${pickVariant("shine", v)} katan ${pickVariant("light", v)} bir aksesuardır.`,
    (c, v) =>
      `${materialSourcePhrase(c.materialLo)} ${c.name}; ${c.collection ? `${c.collection} serisinin ` : ""}kulak hattına özel ${pickVariant("light", v)} bir profil sunar.`,
    (c, v) =>
      `Yüz hatlarını yumuşatan ${c.name}, ${motifDetailAdverb(c.motif)}${c.colorLo} yüzeyiyle yakın plan çekimlerde belirginleşir.`,
    (c, v) =>
      `${c.name} modeli, ${pickVariant("daily", v)} kombinlerde tek küpe olarak da, simetrik çift olarak da dengeli bir görünüm verir.`,
    (c, v) =>
      `İnce kanca yapısı ve ${c.materialLo} gövde sayesinde ${c.name}, uzun toplantı günlerinde bile ${pickVariant("light", v)} hissettirir.`,
    (c, v) =>
      `${c.name} — ${c.color} bitişli bu parça, sade topuz ve omuzda açık saç stillerinde farklı bir ${pickVariant("shine", v)} yaratır.`,
    (c, v) =>
      c.motif
        ? `${c.motif.charAt(0).toLocaleUpperCase("tr-TR") + c.motif.slice(1)} taşıyan ${c.name}, ${c.materialLo} işçilikle koleksiyonda ayırt edici bir küpedir.`
        : `${c.name} küpesinin ${c.colorTon}, gümüş ve altın aksesuarlarla karışık metal kombinlerine uyum sağlar.`,
    (c, v) =>
      `Kulak üzerinde abartısız duran ${c.name}; ${c.materialLo} yapısı ${shineAccusative(v)} korurken ${pickVariant("light", v)} bir siluet bırakır.`,
    (c, v) =>
      `${c.name} ile ${c.colorLo} rengi, blazer ve triko yakaların yanında ${pickVariant("frame", v)}; ${c.materialLo} gövde dayanıklılık sunar.`,
  ],
  kolye: [
    (c, v) =>
      c.motif
        ? `Boyun hattını ${c.motif} ile tamamlayan ${c.name}, ${c.colorLo} zincir tonuyla katmanlı kolye stillerine uyum sağlar.`
        : `${c.name}, ince zincir profili ve ${c.colorLo} yüzeyiyle dekolteyi ${pickVariant("frame", v)}.`,
    (c, v) =>
      `${c.materialLo} gövdeli ${c.name}, ${c.collection ? `${c.collection} serisinin ` : ""}gündüzden geceye uzanan kullanımına göre kurgulandı.`,
    (c, v) =>
      `Göğüs hizasında dengeli duran ${c.name}; ${c.colorLo} rengi sade veya iddialı üstlere eşlik eder.`,
    (c, v) =>
      `${c.name} zinciri, gömlek düğmesi arasından sarktığında ${pickVariant("shine", v)} katan ${pickVariant("light", v)} bir çizgi oluşturur.`,
    (c, v) =>
      `${c.color} kaplamalı ${c.name}, tek başına odak parça ya da uzun bir zincirle katmanlı kombin için uygundur.`,
    (c, v) =>
      `Dekolteyi boğmayan ${c.name}; ${c.materialLo} gövde ve ${pickVariant("light", v)} oturuşuyla ${pickVariant("daily", v)} takılabilir.`,
    (c, v) =>
      c.zodiac && c.zodiac !== "burç"
        ? `${c.zodiac} sembolünü taşıyan ${c.name}, ${c.colorLo} madalyon yüzeyiyle anlamlı bir boyun aksesuarıdır.`
        : `${c.name} modelinin ${motifModelDetail(c.motif)}, yakın çekimde koleksiyonun imzasını gösterir.`,
    (c, v) =>
      `${c.name} — ${c.materialLo} zincir ve ${c.colorLo} bitiş, triko ve v yaka üstlere ${pickVariant("frame", v)}.`,
    (c, v) =>
      `İnce hatlı ${c.name}, omuz açık elbiselerde ${c.colorLo} ${pickVariant("shine", v)} ile boyun hattını tamamlar.`,
    (c, v) =>
      `${c.materialLo} işçilikli ${c.name}; farklı uzunluktaki zincirlerle birlikte zenginleştirilen katmanlı stiller için tasarlandı.`,
  ],
  yuzuk: [
    (c, v) =>
      `${c.name}, parmak hattına oturan ${c.materialLo} formu ve ${c.colorLo} kaplamasıyla ${pickVariant("daily", v)} takı rutinine uyumludur.`,
    (c, v) =>
      c.motif
        ? `${motifDetailObject(c.motif)}taşıyan ${c.name}, ince profiliyle yanındaki yüzüklerle üst üste kullanılabilir.`
        : `İç yüzeyi konfor odaklı ${c.name}, ${c.colorTonlu} zamansız bir ifade sunar.`,
    (c, v) =>
      `${c.name} yüzüğü, ${c.collection ? `${c.collection} çizgisini ` : "modern minimalizmi "}yansıtan ${c.materialLo} bir parçadır.`,
    (c, v) =>
      `${c.colorLo} bitişli ${c.name}; ince bant yapısı üst üste yüzük kombinlerinde ${pickVariant("light", v)} bir katman ekler.`,
    (c, v) =>
      `Parmak eklemlerinde rahatsızlık yaratmayan ${c.name}, ${c.materialLo} gövdesiyle ${pickVariant("daily", v)} yazı ve ekran kullanımına uygundur.`,
    (c, v) =>
      `${c.name} modeli, ${c.motif ? `${c.motif} ile ` : ""}${c.colorLo} yüzeyiyle tek başına da güçlü bir aksesuar olarak durur.`,
    (c, v) =>
      `${materialSourcePhrase(c.materialLo)} ${c.name}; nişan yüzüğü yerine değil, moda yüzüğü olarak konumlandırılmış ${pickVariant("light", v)} bir tasarımdır.`,
    (c, v) =>
      `El hareketlerinde parlayan ${c.name}, ${c.colorLo} kaplama ve pürüzsüz iç yüzeyiyle uzun süre takılmaya uygundur.`,
    (c, v) =>
      `${c.name} — ${c.collection ? `${c.collection} koleksiyonundan ` : ""}${c.colorTonlu}, ${c.materialLo} gövdeli bir yüzük seçeneğidir.`,
    (c, v) =>
      `İki veya üç yüzükle birlikte kullanıldığında ${c.name}, ${c.colorLo} ${pickVariant("shine", v)} ile kombini dengeler.`,
  ],
  bileklik: [
    (c, v) =>
      `${c.name}, bilek üzerinde ${c.colorLo} bir ${pickVariant("shine", v)} bırakır; ${c.materialLo} zincir yapısı esnek hissettirir.`,
    (c, v) =>
      `Katmanlı bileklik trendine uygun ${c.name}, ${c.motif ? `${c.motif} ile ` : ""}saat veya diğer bilekliklerle dengeli durur.`,
    (c, v) =>
      `${c.materialLo} gövdeli ${c.name}, günlük hareketlerde rahatsız etmeyen ${pickVariant("light", v)} bir profille tasarlandı.`,
    (c, v) =>
      `${c.color} kaplamalı ${c.name}; bilek kemiği hizasında ${pickVariant("frame", v)} ve tek başına iddialı bir görünüm oluşturur.`,
    (c, v) =>
      `${c.name} bileziği, ${c.collection ? `${c.collection} serisinin ` : ""}${pickVariant("daily", v)} parçalarından biri olarak öne çıkar.`,
    (c, v) =>
      `Kelepçe veya zincir formundaki ${c.name}, ${c.materialLo} işçilikle ${c.colorTonunu} korur.`,
    (c, v) =>
      `Saat kordonunun yanında ${c.name}, ${c.colorLo} ${pickVariant("shine", v)} ile bileği ${pickVariant("frame", v)}.`,
    (c, v) =>
      `${c.name} — ${pickVariant("light", v)} zincir halkaları ve ${c.materialLo} gövde, uzun süreli ${pickVariant("daily", v)} kullanım için seçildi.`,
    (c, v) =>
      c.motif
        ? `${c.motif} taşıyan ${c.name}, bilek üzerinde ince ama fark edilir bir detay sunar.`
        : `${c.name} modeli, gömlek manşeti altından sarkan ${c.colorLo} bir çizgi yaratır.`,
    (c, v) =>
      `${c.materialLo} yapıdaki ${c.name}; yaz aylarında tek başına, kışın katmanlı bileklik setlerinde tamamlayıcıdır.`,
  ],
  bros: [
    (c, v) =>
      `${c.name}, ceket yakası veya atkı üzerinde ${c.colorLo} bir odak noktası yaratır.`,
    (c, v) =>
      `${c.materialLo} broş ${c.name}, ${c.motif ? `${c.motif} ile ` : ""}klasik ve modern gardıroplara uyum sağlar.`,
    (c, v) =>
      `Blazer ve palto yakalarında ${c.name}, ${c.colorLo} ${pickVariant("shine", v)} ile ${pickVariant("frame", v)}.`,
    (c, v) =>
      `${c.name} broşu; ${c.materialLo} iğne mekanizması ve ${pickVariant("light", v)} profiliyle kumaşa güvenle tutunur.`,
    (c, v) =>
      `Örgü kazak veya ipek foulard üzerinde ${c.name}, ${c.color} detayıyla ${pickVariant("daily", v)} stile imza atar.`,
    (c, v) =>
      `${c.collection ? `${c.collection} ruhunu taşıyan ` : ""}${c.name}, tek broşla sade bir üstü akşam stiline taşır.`,
    (c, v) =>
      `${c.materialLo} gövdeli ${c.name}; ${c.motif ? `${c.motif} ` : ""}işçiliği yakın planda koleksiyonun karakterini gösterir.`,
    (c, v) =>
      `${c.name} — ${c.colorLo} yüzeyi, siyah-beyaz gardıropta da renkli kombinlerde de dengeli durur.`,
    (c, v) =>
      `Yaka hattını tamamlayan ${c.name}, ${c.materialLo} gövde ve ${pickVariant("light", v)} formuyla çanta veya şapka iğnesi alternatifi sunar.`,
    (c, v) =>
      `${c.name} broş modeli, ${shineAccusative(v)} koruyan ${c.color} kaplama ile uzun süreli kullanım hedefler.`,
  ],
  aksesuar: [
    (c, v) =>
      `${c.name}, ${c.colorLo} detayları ve ${c.materialLo} yapısıyla Zelula seçkisinde özgün bir yer tutar.`,
    (c, v) =>
      `${c.collection ? `${c.collection} ruhunu yansıtan ` : ""}${c.name}, sade kombinlere rafine bir tamamlayıcı olarak düşünüldü.`,
    (c, v) =>
      `${materialSourcePhrase(c.materialLo)} ${c.name}; ${pickVariant("daily", v)} taşımada ${pickVariant("light", v)} ve pratik bir aksesuardır.`,
    (c, v) =>
      `${c.name} modeli, ${c.colorTonuyla} çanta, şapka veya anahtarlık düzeninize ${pickVariant("shine", v)} katar.`,
    (c, v) =>
      c.motif
        ? `${c.motif} ile öne çıkan ${c.name}, ${c.materialLo} gövdesiyle koleksiyonda farklı bir seçenek sunar.`
        : `${c.name} — ${c.colorLo} bitiş ve ${pickVariant("light", v)} form, minimal stilleri tamamlar.`,
    (c, v) =>
      `Günlük eşyalarınıza stil katan ${c.name}; ${c.materialLo} yapısı sık kullanıma dayanıklıdır.`,
    (c, v) =>
      `${c.name}, ${c.collection ? `${c.collection} serisinden ` : ""}${c.colorLo} rengiyle fotoğraflarda belirgin bir detay oluşturur.`,
    (c, v) =>
      `${c.materialLo} işçilikli ${c.name}; ${pickVariant("daily", v)} kombinlerde küçük ama etkili bir tamamlayıcıdır.`,
    (c, v) =>
      `${c.colorTonlu} kaplamalı ${c.name}, ${c.motif ? `${motifDetailAdverb(c.motif).trim()} ` : ""}kişisel stile ${pickVariant("frame", v)}.`,
    (c, v) =>
      `${c.name} aksesuarı, Zelula'nın ${pickVariant("light", v)} çizgisini ${c.materialLo} gövde ve ${c.colorLo} tonla birleştirir.`,
  ],
};

const ZODIAC_OPENERS = [
  (c, v) =>
    `${c.name}, ${c.zodiac} burcunun karakterini taşıyan madalyon işçiliğiyle boyun hattına anlamlı bir imza bırakır.`,
  (c, v) =>
    `${c.zodiac} enerjisini ${c.colorLo} kaplama ve ${c.materialLo} gövdeyle buluşturan ${c.name}, burç koleksiyonunda öne çıkan bir parçadır.`,
  (c, v) =>
    `Burç sembolünü sade bir çerçevede sunan ${c.name}; ${c.motif ? `${c.motif} ile ` : ""}günlük stile mistik bir katman ekler.`,
  (c, v) =>
    `${c.zodiac} işlemeli ${c.name}, ${c.colorLo} yüzeyiyle ${pickVariant("daily", v)} takılmaya uygun anlamlı bir kolyedir.`,
  (c, v) =>
    `${c.name} madalyonu, ${c.zodiac} burcunu ${c.materialLo} gövde üzerinde ${pickVariant("light", v)} bir tasarımla yorumlar.`,
];

/**
 * Batch içinde kategori başına benzersiz açılış şablonu ve emoji permütasyonu ata.
 * @param {object[]} products
 * @returns {Map<string, { openerTemplate: number, openerVariant: number, emojis: string[], bulletSeed: number }>}
 */
export function planDescriptionBatch(products) {
  /** @type {Map<string, { openerTemplate: number, openerVariant: number, emojis: string[], bulletSeed: number }>} */
  const plan = new Map();
  /** @type {Map<string, object[]>} */
  const byKind = new Map();

  for (const p of products) {
    if (p.product_kind === "gift_card") continue;
    const kind = categoryKind(p.categorySlug, p.name);
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(p);
  }

  for (const [kind, items] of byKind) {
    const sorted = [...items].sort((a, b) => String(a.slug).localeCompare(String(b.slug), "tr"));
    const builders = CATEGORY_OPENERS[kind] ?? CATEGORY_OPENERS.aksesuar;
    const templateCount = builders.length;

    let templateQueue = shuffleArray(
      [...Array(templateCount).keys()],
      hashString(`opener:${kind}:${sorted.length}`),
    );
    let queuePos = 0;
    let variantRound = 0;

    const usedEmojiSigs = new Set();

    for (let i = 0; i < sorted.length; i += 1) {
      const p = sorted[i];

      if (queuePos >= templateQueue.length) {
        variantRound += 1;
        templateQueue = shuffleArray(
          [...Array(templateCount).keys()],
          hashString(`opener:${kind}:r${variantRound}:${sorted.length}`),
        );
        queuePos = 0;
      }

      const openerTemplate = templateQueue[queuePos];
      queuePos += 1;

      let emojiAttempt = 0;
      let emojis;
      do {
        emojis = pickFourEmojis(hashString(`${p.slug}:emoji:${kind}:${emojiAttempt}`));
        emojiAttempt += 1;
      } while (usedEmojiSigs.has(emojis.join("")) && emojiAttempt < 40);
      usedEmojiSigs.add(emojis.join(""));

      plan.set(p.slug, {
        openerTemplate,
        openerVariant: variantRound * 3 + (i % 3),
        emojis,
        bulletSeed: hashString(`${p.slug}:bullets:${kind}:${i}`),
      });
    }
  }

  return plan;
}

function buildOpening(product, batchPlan) {
  const ctx = buildProductCtx(product);
  const kind = categoryKind(product.categorySlug, product.name);
  const entry = batchPlan?.get(product.slug);

  if (ctx.zodiac && ctx.zodiac !== "burç" && kind === "kolye") {
    const zi = entry?.openerTemplate ?? hashString(product.slug) % ZODIAC_OPENERS.length;
    const zv = entry?.openerVariant ?? 0;
    return ZODIAC_OPENERS[zi % ZODIAC_OPENERS.length](ctx, zv);
  }

  if (ctx.zodiac === "burç") {
    return `${ctx.name}, burç sembolünü modern bir çizgide yorumlayan; ${ctx.colorLo} tonu ve ${ctx.materialLo} yapısıyla dikkat çeken bir tasarımdır.`;
  }

  if (ctx.motif === "balık motifi") {
    const v = entry?.openerVariant ?? 0;
    const fishOpeners = [
      () =>
        `${ctx.name}, denizden ilham alan ${ctx.motif} ile ${ctx.colorLo} yüzeyi bir araya getirir; ${ctx.materialLo} gövdesi formunu korur.`,
      () =>
        `${ctx.motif.charAt(0).toUpperCase() + ctx.motif.slice(1)} taşıyan ${ctx.name}, ${ctx.colorLo} kaplama ve ${ctx.materialLo} işçilikle Zelula'nın artisan çizgisini yansıtır.`,
      () =>
        `${ctx.name} — ${ctx.colorLo} tonlu ${ctx.motif}, ${pickVariant("daily", v)} kombinlerde ${pickVariant("shine", v)} katan özgün bir parçadır.`,
    ];
    return fishOpeners[v % fishOpeners.length]();
  }

  const builders = CATEGORY_OPENERS[kind] ?? CATEGORY_OPENERS.aksesuar;
  const templateIndex = entry?.openerTemplate ?? hashString(product.slug) % builders.length;
  const variant = entry?.openerVariant ?? 0;
  return builders[templateIndex % builders.length](ctx, variant);
}

function buildBullets(product, batchPlan) {
  const seed = batchPlan?.get(product.slug)?.bulletSeed ?? hashString(`${product.slug}:bullets`);
  const emojis = batchPlan?.get(product.slug)?.emojis ?? pickFourEmojis(seed);
  const kind = categoryKind(product.categorySlug, product.name);
  const material = normalizeMaterialInput(product.material);
  const color = normalizeColorInput(product.color);
  const motif = detectDesignMotif(product.name);
  const zodiac = detectZodiacSign(product.name, product.slug);

  const materialLine = buildMaterialBulletLines(material, seed);
  const colorLine = buildColorBulletLines(color, seed);

  const designLines = motif
    ? [
        `Tasarım: ${motif} — koleksiyonun ayırt edici imzası.`,
        motifDesignClause(motif) + " parçayı diğer modellerden ayırır.",
        `Özgün ${motif}; fotoğraflarda ve yakın plan çekimlerde belirgin durur.`,
        `${motif} merkezli kompozisyon; sade arka planlarda güçlü kontrast oluşturur.`,
        `İmza detay: ${motif}; ürün adıyla uyumlu seçilmiş form dili.`,
      ]
    : zodiac && zodiac !== "burç"
      ? [
          `${zodiac} burcu sembolü; anlamlı ve kişisel bir hediye hikâyesi taşır.`,
          `Madalyon yüzeyinde ${zodiac} işlemesi; burç koleksiyonunun karakteristik detayı.`,
          `Burç motifi, minimal çerçeve içinde modern bir yorumla sunulur.`,
          `${zodiac} figürü; yakın çekimde işçilik kalitesini gösterir.`,
        ]
      : [
          `${product.name} silueti, Zelula'nın sade çizgi anlayışını yansıtır.`,
          `Form: günlük kullanımda öne çıkmayan, yakından fark edilen ince detaylar.`,
          `Form dengesi; farklı vücut oranlarına uyumlu bir tasarım hedeflenir.`,
          `Ürün adındaki form dili, koleksiyon içinde kendine özgü bir yer tutar.`,
          `Minimal kompozisyon; abartısız ama karakterli bir görünüm sunar.`,
        ];

  const wearLinesByKind = {
    kupe: [
      "Küpe kancası dengeli; uzun günlerde kulakta baskı hissi oluşturmaz.",
      "Tek başına iddialı parça olarak da, ikili küpe setiyle simetrik kullanım için uygundur.",
      "Saç toplandığında veya omuzda bırakıldığında kulak hattını zarifçe vurgular.",
      "Hafif gövde; gün boyu takıldığında kulak arkasında tahriş veya ağırlık hissi oluşturmaz.",
      "Asimetrik saç kesimlerinde dengeyi tamamlayan kulak aksesuarı.",
    ],
    kolye: [
      "Zincir uzunluğu dekolteyi boğmadan boyun hattını tamamlar.",
      "İnce zincirlerle katmanlayarak farklı boylarda zengin bir görünüm elde edebilirsiniz.",
      "Gömlek yakası içinde veya üzerinde aynı derecede şık durur.",
      "Triko ve boğazlı üstler üzerinde dışarıdan sarkan zarif bir çizgi bırakır.",
      "Fermuarlı üstlerde yaka açıklığıyla uyumlu boy uzunluğu.",
    ],
    yuzuk: [
      "İç yüzey pürüzsüz; parmak etrafında tahriş riskini azaltır.",
      "İnce bant yapısı, yanındaki yüzüklerle üst üste takıma uygundur.",
      "Günlük yazı yazma ve telefon kullanımında rahatsız etmeyen profil.",
      "Parmak eklemlerinde sıkışma yapmayan konforlu iç eğri.",
      "Tek yüzük olarak da, üçlü setin orta parçası olarak da dengeli durur.",
    ],
    bileklik: [
      "Kelepçe/kilit mekanizması pratik; tek elle takılabilir.",
      "Bilek çevresinde gevşek durmayan, sıkmayan esnek bir oturuş hedefler.",
      "Saat kordonuyla aynı bilekte dengeli bir ikili oluşturur.",
      "Manşet altından hafifçe görünen ince zincir etkisi.",
      "Bilek hareketlerinde takılmayan, esnek oturuşlu yapı.",
    ],
    halhal: [
      "Ayakkabısız ve sandaletli kombinlerde yaz stiline hafif bir dokunuş katar.",
      "İnce zincir yapısı ayak bileğinde kayganlık hissi vermeden durur.",
    ],
    sahmeran: [
      "Çoklu zincir katmanları tek parçada derinlik hissi verir.",
      "El bileği ve parmak arası hareketlerinde takılmayan esnek düzen.",
    ],
    bros: [
      "İğne mekanizması kumaşa sağlam tutunur; ince örgü ve blazer yaka için uygundur.",
      "Tek broşla sade bir ceketi akşam stiline taşıyabilirsiniz.",
      "Yün palto veya tweed ceket yakasında karakterli bir odak noktası.",
      "İpek fular üzerinde iğne deliği bırakmayan dengeli tutuş.",
    ],
    anahtarlik: [
      "Hafif yapı; çanta fermuarına veya anahtarlığa ek ağırlık bindirmez.",
      "Günlük taşımada çizilmeye karşı dayanıklı yüzey.",
    ],
    aksesuar: [
      "Günlük rotanızda pratik, şık bir tamamlayıcı olarak konumlandırıldı.",
      "Hafif gövde; uzun süre taşındığında rahatsızlık yaratmaz.",
      "Çanta veya şapka ile eşleştirildiğinde bütünlüklü bir görünüm verir.",
    ],
    sapka: ["Esnek yapı; farklı baş ölçülerine uyum sağlar."],
    gift_card: [],
  };

  const wearPool = wearLinesByKind[kind] ?? wearLinesByKind.aksesuar;

  return [
    `${emojis[0]} ${materialLine}`,
    `${emojis[1]} ${colorLine}`,
    `${emojis[2]} ${pick(designLines, seed, 2)}`,
    `${emojis[3]} ${pick(wearPool, seed, 3)}`,
  ];
}

function buildClosing(product, index, batchPlan) {
  const seed = batchPlan?.get(product.slug)?.bulletSeed ?? hashString(`${product.slug}:close`);
  const kind = categoryKind(product.categorySlug, product.name);
  const name = product.name;

  const closings = [
    `Ofisten kahve molasına uzanan günlerde ${name} ile kombininizi tamamlayabilir; sade parçalar arasında kaybolmadan ışıltı katar.`,
    `Yakın bir arkadaşınızın doğum günü veya yeni iş kutlaması için anlamlı ve kullanışlı bir seçenek olarak düşünebilirsiniz.`,
    `Akşam yemeği veya özel davetlerde tek aksesuarla stilinizi yükseltmek istediğiniz anlarda öne çıkar.`,
    kind === "kolye" || kind === "bileklik"
      ? `Dolabınızdaki diğer zincirlerle katmanlayarak kişisel bir takı seti oluşturmanız için esnek bir temel sunar.`
      : kind === "kupe"
        ? `Küpe koleksiyonunuzda farklı boyutlardaki modellerle eşleştirerek haftanın her günü farklı bir kulak hattı yaratabilirsiniz.`
        : `Hafta sonu sade bir tişört ve kot üzerinde bile ${name} ile rafine bir kontrast yakalayabilirsiniz.`,
    `Kendinize küçük bir ödül arıyorsanız, uzun süre keyifle takacağınız günlük bir parça olarak öne çıkar.`,
    `Kutulu sunumla sevdiklerinize iletmek istediğinizde, hem kişisel hem de kullanışlı bir jest olarak değerlendirilebilir.`,
    `İş toplantısı sonrası doğrudan akşam planına geçtiğiniz günlerde, ekstra aksesuar değiştirmeden stilinizi taşımanıza yardımcı olur.`,
    `Yeni sezon gardırobunuzdaki temel parçaların üzerine eklediğinizde kombini tazeler — abartısız ama fark edilir.`,
  ];

  return pick(closings, seed, index % closings.length);
}

/**
 * @param {object} product
 * @param {number} [index]
 * @param {ReturnType<typeof planDescriptionBatch>} [batchPlan]
 * @returns {string}
 */
export function generateUniqueFullDescription(product, index = 0, batchPlan = null) {
  const opening = buildOpening(product, batchPlan);
  const bullets = buildBullets(product, batchPlan);
  const closing = buildClosing(product, index, batchPlan);

  const raw = [opening, "", ...bullets, "", closing, "", STANDARD_CARE_PARAGRAPH].join("\n");
  return repairConcatArtifacts(raw);
}

/**
 * @param {object} product
 * @param {Map<string, number>} fingerprintCounts
 */
export function isTemplatedDescription(product, fingerprintCounts) {
  if (product.product_kind === "gift_card") return false;

  const full = String(product.full_description ?? "");
  const stripped = stripCareParagraph(full);
  const fingerprint = normalizeFingerprint(full);

  if (countEmojiBullets(full) >= 2) return true;

  const lower = full.toLocaleLowerCase("tr-TR");
  const genericHits = GENERIC_PHRASE_MARKERS.filter((p) => lower.includes(p)).length;
  if (genericHits >= 2) return true;

  if (fingerprint.length >= 40 && (fingerprintCounts.get(fingerprint) ?? 0) >= 2) return true;

  if (stripped.length > 0 && stripped.length < 180 && !stripped.includes("\n") && countEmojiBullets(full) === 0) {
    return true;
  }

  return false;
}

export function buildFingerprintCounts(products) {
  const counts = new Map();
  for (const p of products) {
    if (p.product_kind === "gift_card") continue;
    const fp = normalizeFingerprint(p.full_description);
    if (fp.length < 30) continue;
    counts.set(fp, (counts.get(fp) ?? 0) + 1);
  }
  return counts;
}

export function mapProductRow(row) {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const collection = Array.isArray(row.collections) ? row.collections[0] : row.collections;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    short_description: row.short_description,
    full_description: row.full_description,
    material: row.material,
    color: row.color,
    product_kind: row.product_kind ?? "physical",
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    collectionName: collection?.name ?? null,
    is_active: row.is_active,
  };
}
