import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowLeft, Plus, Minus, ShoppingCart, Loader2, Truck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PACK_SIZES_BY_CATEGORY = {
  beer: [
    { value: "1-tall", label: "1 Tall Can", multiplier: 1 },
    { value: "6-pack", label: "6 Pack", multiplier: 6 },
    { value: "8-pack", label: "8 Pack", multiplier: 8 },
    { value: "15-pack", label: "15 Pack", multiplier: 15 },
    { value: "24-pack", label: "24 Pack", multiplier: 24 },
    { value: "36-pack", label: "36 Pack", multiplier: 36 },
    { value: "48-pack", label: "48 Pack", multiplier: 48 },
  ],
  wine: [
    { value: "single-bottle", label: "Single Bottle", multiplier: 1 },
    { value: "2-pack", label: "2-Pack", multiplier: 2 },
    { value: "case-6", label: "Case of 6", multiplier: 6 },
    { value: "case-12", label: "Case of 12", multiplier: 12 },
  ],
  spirits: [
    { value: "single-bottle", label: "Single Bottle", multiplier: 1 },
    { value: "2-pack", label: "2-Pack", multiplier: 2 },
    { value: "case-6", label: "Case of 6", multiplier: 6 },
  ],
  smokes: [] as { value: string; label: string; multiplier: number }[],
};

interface PackPrice {
  product_id: string;
  pack_size: string;
  price: number;
  is_hidden: boolean;
}

const WINE_SUBCATEGORIES = [
  { value: "all", label: "All" },
  { value: "argentina", label: "Argentina" },
  { value: "australia", label: "Australia" },
  { value: "austria", label: "Austria" },
  { value: "bulgaria", label: "Bulgaria" },
  { value: "canada", label: "Canada" },
  { value: "canada_vqa", label: "Canada VQA" },
  { value: "chile", label: "Chile" },
  { value: "france", label: "France" },
  { value: "germany", label: "Germany" },
  { value: "greece", label: "Greece" },
  { value: "hungary", label: "Hungary" },
  { value: "italy", label: "Italy" },
  { value: "japan", label: "Japan" },
  { value: "montenegro", label: "Montenegro" },
  { value: "new_zealand", label: "New Zealand" },
  { value: "portugal", label: "Portugal" },
  { value: "south_africa", label: "South Africa" },
  { value: "south_korea", label: "South Korea" },
  { value: "spain", label: "Spain" },
  { value: "usa", label: "USA" },
  { value: "other", label: "Other" },
];

const getWineSubcategory = (productName: string): string => {
  const n = productName.toLowerCase();
  // Canada VQA (must be checked before Canada)
  if (["vintage ink", "pelee island", "pelee pink", "sumac ridge", "burrowing owl", "closson chase", "osoyoos larose", "black sage vineyard", "clos du soleil", "henry of pelham baco", "mission hill reserve", "black hills estate", "diabolica", "sandhill", "southbrook", "blue mountain gold label", "checkmate silent bishop", "wayne gretzky cabernet syrah"].some(k => n.includes(k)) || (n.includes("vqa") && !["canada"].some(() => false))) return "canada_vqa";
  // Canada
  if (["20 bees", "50th parallel", "andrès baby", "andres baby", "avenue sauvignon", "avenue syrah", "bask ", "bee & thistle", "bench 1775", "benjamin bridge", "black cellar", "bodacious", "cave spring", "copper moon", "girls' night out", "girls night out", "gray monk", "henry of pelham", "hochtaler", "honest john", "honest lot", "inniskillin", "jackson-triggs", "jackson triggs", "keep calm", "l'ambiance", "lakeview cellars", "lighthouse cab", "lighthouse sauv", "lola pinot", "magnotta", "mission hill", "mission ridge", "mt. boucharie", "mt. boucherie", "mt boucherie", "naked grape", "open smooth", "orofino", "peller", "prairie bee", "wayne gretzky", "weekday wine", "xoxo"].some(k => n.includes(k))) return "canada";
  // Chile (must be checked before Australia to avoid santa carolina conflict)
  if (["1865 selected", "antares", "carmen gran reserva", "casillero del diablo", "casillero del diablo", "cigar box", "concha y toro", "cono sur", "emiliana coyam", "errazuriz", "ochagavia", "root 1", "santa carolina", "santa ema", "vino de eyzaguirre", "vivo reserva", "vivo reserve"].some(k => n.includes(k)) || n.includes("carmenere") || n.includes("carménère")) return "chile";
  // Italy (must be checked before France to avoid campari conflict with liqueur, and before Argentina for pinot grigio brands)
  if (["ama bene", "antinori tignanello", "aperitivo luxardo", "argiano brunello", "argiolas costamolino", "batasiolo", "benvolio pinot grigio", "bolla ", "brancaia", "caiaffa", "campari aperitivo", "caposaldo", "caprera trebbiano", "carpano antica", "cavaliere d'oro", "cavaliere d'oro", "cavit ", "santa margherita cabernet", "santa margherita chianti", "santa margherita pinot grigio", "santa margherita sparkling", "tenuta di arceno", "tenuta di capraia", "tenuta sette ponti", "torresella", "umberto cesari", "vaporetto prosecco", "viberti ", "villa cafaggio", "villa teresa", "zenato"].some(k => n.includes(k)) || n.includes("valpolicella") || n.includes("chianti") || n.includes("prosecco") || n.includes("barolo") || n.includes("brunello") || n.includes("amarone") || n.includes("toscana igt") || n.includes("veneto igt") || n.includes("delle venezie") || n.includes("d'abruzzo") || n.includes("nebbiolo") || n.includes("lugana") || n.includes("docg") || n.includes(" doc") || n.includes(" igt")) return "italy";
  // France (must be checked before Argentina to handle clos la coutale malbec)
  if (["2003 clos du marquis", "2014 bartel", "bartel champagne", "bouchard aine", "brotte cotes du rhone", "cave des vignerons de saumur", "chapoutier", "chateau argadens", "chateau coutreau", "chateau de courteillac", "chateau de la gardine", "chateau fuisse", "chateau gassier", "chateau pey la tour", "chateauneuf-du-pape la fiole", "château argadens", "château cheval brun", "château de beaucastel", "château mouton-rothschild", "château patache", "château timberlay", "clos de l'eveche", "clos de l'oratoire", "clos la coutale", "cote des roses", "domaine le colombier", "domaine paul mas", "dubonnet", "famille perrin", "georges duboeuf", "gerard bertrand", "gérard bertrand", "guy saget", "j.l. chave", "jaboulet", "jean marc brocard", "joseph drouhin", "krug grande", "l'oustalet", "la vielle ferme", "la vieille ferme", "le bijou de sophie", "les fleurs du mal", "les fumées blanches", "m. chapoutier", "miraval", "moet & chandon", "mumm cordon rouge", "nicolas feuillatte", "noilly prat", "paul mas", "pavillon de trianon", "perdrix de l'annee", "perrin réserve", "philippe de rothschild", "piper-heidsieck", "rothschild mouton cadet", "rothschild sauvignon", "s de la sablette", "studio by miraval", "the beach by whispering angel", "veuve clicquot", "veuve d'argent", "champagne"].some(k => n.includes(k)) || n.includes("pays d'oc") || n.includes("côtes du rhône") || n.includes("cotes du rhone") || n.includes("bordeaux") || n.includes("chablis") || n.includes("beaujolais") || n.includes("provence")) return "france";
  // New Zealand (must be checked before Australia to avoid oyster bay/babich conflicts)
  if (["babich", "cloudy bay", "craggy range", "dog point", "invivo", "kim crawford", "matua", "mud house", "oyster bay", "saint clair", "stoneleigh"].some(k => n.includes(k))) return "new_zealand";
  // Australia
  if (["19 crimes", "angus the bull", "banrock station", "barossa valley", "d'arenberg", "elderton", "farm hand", "gilbert pet-nat", "gilbert rose", "grant burge", "hardy stamp", "hardys stamp", "henschke", "heritage road", "jacob's creek", "jacobs creek", "johnny q", "langmeil", "lindeman", "mcguigan", "menagerie of the barossa", "mollydooker", "old testament", "passion pop", "penfolds", "peter lehmann", "schild estate", "seven eves", "sister's run", "smoky bay", "somos", "tempus two", "the black chook", "tread softly", "tyrrell", "wakefield", "wee angus", "wine men of gotham", "wolf blass", "yellow tail", "yellowtail"].some(k => n.includes(k))) return "australia";
  // Germany
  if (["black tower", "blue nun", "bree riesling", "bree pinot noir", "dr zenzen", "dr. loosen", "dr. zenzen", "goldener oktober", "henkell trocken", "kabinett riesling", "relax riesling", "romeo peach bellini"].some(k => n.includes(k)) || n.includes("mosel")) return "germany";
  // Austria
  if (["gruber roschitz", "sattlerhof", "laurenz z", "grüner veltliner", "gruner veltliner", "johanneshof reinisch", "markus huber", "huber sparkling", "huber terrassen", "huber vision", "hiedler", "prieler", "blaufrankisch", "zweigelt"].some(k => n.includes(k))) return "austria";
  // Portugal
  if (["animus douro", "anjos de portugal", "aveleda", "blandy", "casal garcia", "catedral reserva dao", "julia kemper", "mateus rose", "quinta da aveleda", "silk & spice", "silk and spice", "sogrape gazela", "taylor 20 year", "taylor late bottled"].some(k => n.includes(k)) || n.includes("vinho verde") || n.includes("madeira") || n.includes("port") && (n.includes("taylor") || n.includes("tawny"))) return "portugal";
  // South Africa
  if (["beachhouse", "bellingham", "constantia uitsig", "glenelly", "inception deep layered", "jam jar sweet", "ken forrester", "kwv ", "nederburg", "the wolftrap", "two oceans", "vinecrafter", "wild olive chenin"].some(k => n.includes(k)) || n.includes("pinotage")) return "south_africa";
  // Spain
  if (["anciano rioja", "baron de ley", "beronia", "bodegas aroa", "bodegas moraza", "campo viejo", "castelfino cava", "castillo de mendoza", "castillo de monseran", "cune cava", "cvne cune", "finca bacara", "freixenet", "frexienet", "garmon ribera", "harvey's bristol", "henkell rose", "izadi reserva", "juan gil", "juvé & camps", "juve & camps", "la maldita", "la montessa", "marques de riscal", "pablo claro", "pachem cami", "pata negra", "perinet likka", "radio boka", "sangenis i vaque", "segura viudas", "suriol", "telmo rodriguez", "toro loco", "torres celeste", "two skulls", "villa conchi", "viña esmeralda", "vina esmeralda"].some(k => n.includes(k)) || n.includes("rioja") || n.includes("cava") || n.includes("tempranillo") || n.includes("garnacha") || n.includes("monastrell") || n.includes("priorat")) return "spain";
  // Argentina
  if (["malbec", "torront", "1884", "alamos", "alma negra", "argento", "catena", "clos de los siete", "cuma", "don david", "doña paula", "dona paula", "escorihuela", "finca las moras", "finca los primos", "graffigna", "kaiken", "la linda", "la posta", "layer cake malbec", "luigi bosca", "pascual toso", "piedra negra", "portillo", "santa julia", "tapiz", "the show malbec", "tilia", "trapiche", "trivento", "zuccardi"].some(k => n.includes(k))) return "argentina";
  // USA
  if (["california roots", "cannonball", "canyon road", "carlo rossi", "carnivor", "caymus", "charles & charles", "chateau ste. michelle", "cloudline pinot", "columbia crest", "conundrum", "duckhorn", "elemental pinot", "emmolo", "francis coppola", "freemark abbey", "j. lohr", "joel gott", "joseph phelps", "josh cellars", "la crema", "lapis luna", "liberty school", "longshot", "louis m. martini", "matchbook", "meiomi", "mer soleil", "mumm cuvée napa", "mumm cuvee napa", "napa cellars", "orin swift", "quilt napa", "red schooner", "robert mondavi", "rodney strong", "santa lucia mer", "sterling vintners", "submission cabernet", "three finger jack", "three thieves", "tom gore", "wente morning", "woodbridge", "woodwork california"].some(k => n.includes(k)) || n.includes("napa valley") || n.includes("sonoma")) return "usa";
  return "other";
};

const SPIRITS_SUBCATEGORIES = [
  { value: "all", label: "All" },
  { value: "vodka", label: "Vodka" },
  { value: "whisky", label: "Whisky" },
  { value: "rum", label: "Rum" },
  { value: "tequila", label: "Tequila" },
  { value: "gin", label: "Gin" },
  { value: "brandy", label: "Brandy & Cognac" },
  { value: "liqueur", label: "Liqueurs" },
  { value: "other", label: "Other" },
];

const getSpiritsSubcategory = (productName: string): string => {
  const n = productName.toLowerCase();
  // Rum
  if (/\brum\b/.test(n) || ["bacardi", "captain morgan", "appleton", "havana club", "flor de cana", "kraken", "malibu", "gosling", "diplomatico", "el dorado", "mount gay", "lamb's", "lambs", "brugal", "bumbu", "cachaça", "cruzan", "don papa", "angostura", "coconut cartel", "blue chair bay", "dead man", "old j spiced", "last mountain spice", "sailor jerry", "screech", "lemon hart"].some(k => n.includes(k))) return "rum";
  // Tequila & Mezcal
  if (/\btequila\b|\bmezcal\b|\bsotol\b/.test(n) || ["1800 ", "jose cuervo", "patron", "don julio", "casamigos", "espolon", "hornitos", "cazadores", "el jimador", "cabo wabo", "clase azul", "grand mayan", "don fulano", "adictivo", "adicitvo", "familia camerena", "nodo", "elevacion", "olmeca", "agavero", "la gritona", "tequileño", "tequileno", "pisco", "400 conejos", "bozal", "sauza", "tres agaves", "tres generaciones", "margarita"].some(k => n.includes(k))) return "tequila";
  // Gin
  if (/\bgin\b/.test(n) || ["hendrick", "beefeater", "bombay", "tanqueray", "gordon", "aviation", "empress", "botanist", "last mountain grann", "patent 5", "lucky bastard gambit", "georgian bay gin", "founders gin", "ungava", "hayman", "bruichladdich the botanist"].some(k => n.includes(k))) return "gin";
  // Vodka
  if (/\bvodka\b/.test(n) || ["smirnoff", "absolut", "grey goose", "ketel one", "belvedere", "ciroc", "finlandia", "stolichnaya", "stoli ", "titos", "tito's", "banff ice", "alberta pure", "crystal head", "iceberg", "co-op vodka", "moskovskaya", "khortytsa", "luksusowa", "lb premium", "lb premum", "highwood pure", "northern keep", "new amsterdam pink whitney", "alibi vodka", "wyborowa", "lucky bastard dill", "lucky bastard vanilla", "lucky bastard x co-op 90th anniversary vanilla", "last mountain premium", "last mountain sweet tea", "pink whitney", "prairie", "polar ice"].some(k => n.includes(k))) return "vodka";
  // Whisky
  if (/whisk|bourbon|scotch|\brye\b/.test(n) || ["alberta premium", "alberta springs", "crown royal", "canadian club", "five star", "forty creek", "gibson", "j.p. wiser", "j.p wiser", "wisers", "jack daniel", "jim beam", "johnnie walker", "makers mark", "maker's mark", "jameson", "glenfiddich", "glenmorangie", "macallan", "lagavulin", "laphroaig", "ardbeg", "bowmore", "highland park", "oban", "monkey shoulder", "chivas", "bushmills", "bulleit", "fireball", "elijah craig", "evan williams", "gentleman jack", "old forester", "old tub", "bearface", "caribou crossing", "centennial", "cedar ridge", "compass box", "dewars", "dewar's", "glen grant", "glendalough", "glendronach", "j&b rare", "kilbeggan", "nikka", "old pulteney", "pendleton", "pike creek", "paul john", "aberlour", "aberfeldy", "auchentoshan", "balvenie", "basil hayden", "islay mist", "grant's", "grants", "meaghers 1878", "lot 40", "sortilege", "tin cup", "seagram", "woodford", "wild turkey", "sazerac", "royal salute", "red breast", "redbreast", "rittenhouse", "russells", "green spot", "yellow spot", "red spot", "proper twelve", "proper no twelve", "mcclelland", "glenlivet", "silk tassel", "yukon jack", "power's gold", "rabbit hole", "suntory", "traveller blend"].some(k => n.includes(k))) return "whisky";
  // Brandy & Cognac
  if (/\bbrandy\b|\bcognac\b/.test(n) || ["hennessy", "courvoisier", "metaxa", "d'eaubonne", "remy martin"].some(k => n.includes(k))) return "brandy";
  // Liqueurs
  if (/liqueur|liquor|\bcream\b|schnapps|amaretto|\bamaro\b/.test(n) || ["baileys", "bailey's", "kahlua", "disaronno", "frangelico", "chambord", "cointreau", "drambuie", "jagermeister", "campari", "aperol", "sambuca", "ouzo", "goldschlager", "hpnotiq", "limoncello", "triple sec", "bols ", "chartreuse", "peppermint", "dr mcgillicuddy", "dr. mcgillicuddy", "creme de", "crème de", "paralyzer", "carolans", "o'darby", "ceilis", "grand marnier", "absinthe", "baja rosa", "alize", "cynar", "luxardo", "giffard", "benedictine", "fernet", "montenegro", "nonino", "lucano", "averna", "pimm", "st-germain", "st germain", "southern comfort", "kamora", "jaya chai", "golden pear", "cabot trail", "georgian bay caramel", "lb distillers", "mcguinness", "mcguiness", "meaghers triple", "shanky's whip", "sour puss", "peychaud", "st. george bruto", "zwack", "pierre ferrand", "perfect shot", "twisted shotz"].some(k => n.includes(k))) return "liqueur";
  return "other";
};

const SMOKES_SUBCATEGORIES = [
  { value: "all", label: "All" },
  { value: "cigarettes", label: "Cigarettes" },
  { value: "cigars", label: "Cigars" },
  { value: "vapes", label: "Vapes" },
  { value: "rolling", label: "Rolling Tobacco" },
  { value: "pouches", label: "Nicotine Pouches" },
  { value: "accessories", label: "Accessories" },
];

const getSmokesSubcategory = (productName: string): string => {
  const name = productName.toLowerCase();
  if (name.includes("cigarette") || name.includes("marlboro") || name.includes("camel") || name.includes("newport") || name.includes("american spirit") || name.includes("pall mall") || name.includes("winston") || name.includes("l&m") || name.includes("lucky strike")) return "cigarettes";
  if (name.includes("cigar") || name.includes("backwood") || name.includes("swisher") || name.includes("black & mild") || name.includes("phillies") || name.includes("dutch") || name.includes("garcia vega") || name.includes("white owl")) return "cigars";
  if (name.includes("vape") || name.includes("juul") || name.includes("stlth") || name.includes("vuse") || name.includes("elf bar") || name.includes("lost mary") || name.includes("hyde") || name.includes("pod") || name.includes("e-liquid") || name.includes("disposable")) return "vapes";
  if (name.includes("rolling") || name.includes("drum") || name.includes("top ") || name.includes("bugler") || name.includes("zig-zag") || name.includes("raw ") || name.includes("papers") || name.includes("filter") || name.includes("rizla") || name.includes("elements")) return "rolling";
  if (name.includes("pouch") || name.includes("zyn") || name.includes("velo") || name.includes("on!") || name.includes("nicotine pouch") || name.includes("snus")) return "pouches";
  if (name.includes("lighter") || name.includes("case") || name.includes("grinder") || name.includes("ashtray") || name.includes("holder") || name.includes("cutter") || name.includes("humidor")) return "accessories";
  return "cigarettes";
};

const StoreDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedPackSizes, setSelectedPackSizes] = useState<Record<string, string>>({});
  const [smokesSubcategory, setSmokesSubcategory] = useState<string>("all");
  const [spiritsSubcategory, setSpiritsSubcategory] = useState<string>("all");
  const [wineSubcategory, setWineSubcategory] = useState<string>("all");
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("store_id", id).eq("in_stock", true);
      if (error) throw error;
      return data;
    },
  });

  const productIdsWithPacks = products.map(p => p.id);
  const { data: packPrices = [] } = useQuery<PackPrice[]>({
    queryKey: ["product_pack_prices", productIdsWithPacks],
    queryFn: async () => {
      if (productIdsWithPacks.length === 0) return [];
      // Fetch all pack prices in batches to avoid the 1000-row default limit
      const allPrices: PackPrice[] = [];
      const batchSize = 200;
      for (let i = 0; i < productIdsWithPacks.length; i += batchSize) {
        const batch = productIdsWithPacks.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("product_pack_prices")
          .select("product_id, pack_size, price, is_hidden")
          .in("product_id", batch);
        if (error) throw error;
        if (data) allPrices.push(...(data as PackPrice[]));
      }
      return allPrices;
    },
    enabled: productIdsWithPacks.length > 0,
  });

  const getAvailablePackSizes = (productId: string, category: keyof typeof PACK_SIZES_BY_CATEGORY) => {
    const productPackPrices = packPrices.filter(pp => pp.product_id === productId && !pp.is_hidden);
    
    // If product has direct pack prices (like "750 mL", "1.14L"), use those directly
    if (productPackPrices.length > 0) {
      const baseSizes = PACK_SIZES_BY_CATEGORY[category];
      const matchedFromBase = baseSizes.filter(size => 
        productPackPrices.some(pp => pp.pack_size === size.value)
      );
      
      // Also include any pack prices that don't match predefined sizes (e.g. "750 mL", "1.14L", "1.75L")
      const unmatchedPrices = productPackPrices.filter(pp => 
        !baseSizes.some(s => s.value === pp.pack_size)
      );
      
      const dynamicSizes = unmatchedPrices.map(pp => ({
        value: pp.pack_size,
        label: pp.pack_size,
        multiplier: 1,
      }));
      
      return [...matchedFromBase, ...dynamicSizes];
    }
    
    return [];
  };

  const productsByCategory = {
    beer: products.filter((p) => p.category === "beer").sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name)),
    wine: products.filter((p) => p.category === "wine").sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name)),
    spirits: products.filter((p) => p.category === "spirits").sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name)),
    ciders_seltzers: products.filter((p) => p.category === "ciders_seltzers").sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name)),
    smokes: products.filter((p) => p.category === "smokes").sort((a, b) => ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name)),
  };

  const availableCategories = Object.entries(productsByCategory).filter(([_, items]) => items.length > 0).map(([cat]) => cat);
  const defaultCategory = availableCategories.length > 0 ? availableCategories[0] : "beer";

  const getQuantity = (productId: string) => quantities[productId] || 0;
  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) + delta) }));
  };

  const getPackSizesForProduct = (product: typeof products[0]) => {
    const category = product.category as keyof typeof PACK_SIZES_BY_CATEGORY;
    return getAvailablePackSizes(product.id, category);
  };

  const getSelectedPackSize = (product: typeof products[0]) => {
    const availableSizes = getPackSizesForProduct(product);
    const defaultSize = availableSizes.length > 0 ? availableSizes[0].value : "single";
    const currentSelection = selectedPackSizes[product.id];
    if (currentSelection && availableSizes.some(s => s.value === currentSelection)) return currentSelection;
    return defaultSize;
  };

  const setPackSize = (productId: string, value: string) => {
    const scrollY = window.scrollY;
    setSelectedPackSizes(prev => ({ ...prev, [productId]: value }));
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    });
  };

  const getDisplayPrice = (product: typeof products[0]) => {
    const availableSizes = getPackSizesForProduct(product);
    if (availableSizes.length === 0) return Number(product.price);
    const selectedSize = getSelectedPackSize(product);
    const storedPrice = packPrices.find(bp => bp.product_id === product.id && bp.pack_size === selectedSize && !bp.is_hidden);
    if (storedPrice) return Number(storedPrice.price);
    const packSize = availableSizes.find(p => p.value === selectedSize);
    return Number(product.price) * (packSize?.multiplier || 1);
  };

  const handleAddToCart = (product: typeof products[0]) => {
    const qty = getQuantity(product.id);
    if (qty === 0) updateQuantity(product.id, 1);
    const category = product.category as keyof typeof PACK_SIZES_BY_CATEGORY;
    const packSizes = PACK_SIZES_BY_CATEGORY[category];
    const defaultSize = packSizes.length > 0 ? packSizes[0].value : "single";
    const selectedSize = selectedPackSizes[product.id] || defaultSize;
    const packSize = packSizes.find(p => p.value === selectedSize);
    const storedPrice = packPrices.find(bp => bp.product_id === product.id && bp.pack_size === selectedSize);
    const displayPrice = storedPrice ? Number(storedPrice.price) : packSize ? Number(product.price) * packSize.multiplier : Number(product.price);
    const displayName = packSize && packSize.multiplier !== 1 ? `${product.name} (${packSize.label})` : product.name;

    addToCart({
      id: `${product.id}-${packSize?.value || "single"}`,
      name: displayName, price: displayPrice,
      image: product.image_url || "", storeId: store?.id || "", storeName: store?.name || "",
    });
    toast({ title: "Added to cart", description: `${displayName} added` });
  };

  const ProductCard = ({ product }: { product: typeof products[0] }) => {
    const sizes = getPackSizesForProduct(product);
    const selectedSize = getSelectedPackSize(product);
    const hasSizes = sizes.length > 0;
    const hasMultipleSizes = sizes.length > 1;

    const getSizePrice = (sizeValue: string) => {
      const storedPrice = packPrices.find(bp => bp.product_id === product.id && bp.pack_size === sizeValue && !bp.is_hidden);
      const sizeObj = sizes.find(s => s.value === sizeValue);
      return storedPrice ? Number(storedPrice.price) : Number(product.price) * (sizeObj?.multiplier || 1);
    };

    return (
      <div className="group bg-card rounded-xl border border-border overflow-hidden card-hover flex flex-col">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-muted/30 relative">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        </div>

        {/* Content */}
        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h4 className="font-medium text-foreground text-sm line-clamp-2 leading-snug">{product.name}</h4>

          {/* Size Selection */}
          {hasSizes && !hasMultipleSizes && (
            <span className="inline-flex items-center self-start text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60 tracking-wide">
              {sizes[0].label}
            </span>
          )}

          {hasMultipleSizes && (
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((size) => {
                const isSelected = selectedSize === size.value;
                return (
                  <button
                    key={size.value}
                    onClick={() => setPackSize(product.id, size.value)}
                    className={`
                      text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-200
                      ${isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                      }
                    `}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Price */}
          <p className="text-lg font-bold text-primary mt-auto">${getDisplayPrice(product).toFixed(2)}</p>

          {/* Cart Controls */}
          <div className="flex items-center gap-2">
            {getQuantity(product.id) > 0 ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(product.id, -1)}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="font-semibold w-7 text-center text-sm">{getQuantity(product.id)}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(product.id, 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button className="flex-1 h-9 text-sm rounded-lg font-medium" onClick={() => handleAddToCart(product)}>
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Add
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Store not found</h1>
            <Link to="/stores"><Button className="rounded-full">Back to Stores</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        {/* Store Header */}
        <div className="relative h-56 md:h-72 overflow-hidden">
          <img
            src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800&auto=format"}
            alt={store.name}
            className={`w-full h-full ${store.image_url?.includes('.png') ? 'object-contain bg-gradient-to-br from-muted to-muted/50 p-8' : 'object-cover'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <div className="container mx-auto">
              <Link to="/stores" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white mb-3 transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> All Stores
              </Link>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-white">{store.name}</h1>
                    {store.is_open ? (
                      <Badge className="bg-success text-white text-xs">Open</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Closed</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-white/70 text-sm">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{store.address}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{store.hours}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-white text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="font-bold">{store.rating}</span>
                    <span className="text-white/60">({store.reviews_count})</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/70">
                    <Truck className="h-3.5 w-3.5" />
                    {store.delivery_time} • {Number(store.delivery_fee) === 0 ? "Free" : `$${Number(store.delivery_fee).toFixed(2)}`} delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="container mx-auto px-4 py-6">
          {productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue={defaultCategory} className="w-full">
              <TabsList className="mb-6 w-full justify-center overflow-x-auto h-auto p-1.5 gap-1 bg-muted/50 rounded-xl">
                {availableCategories.includes("beer") && (
                  <TabsTrigger value="beer" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🍺 Beer ({productsByCategory.beer.length})</TabsTrigger>
                )}
                {availableCategories.includes("wine") && (
                  <TabsTrigger value="wine" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🍷 Wine ({productsByCategory.wine.length})</TabsTrigger>
                )}
                {availableCategories.includes("spirits") && (
                  <TabsTrigger value="spirits" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🥃 Spirits ({productsByCategory.spirits.length})</TabsTrigger>
                )}
                {availableCategories.includes("ciders_seltzers") && (
                  <TabsTrigger value="ciders_seltzers" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🍏 Ciders & Seltzers ({productsByCategory.ciders_seltzers.length})</TabsTrigger>
                )}
                {availableCategories.includes("smokes") && (
                  <TabsTrigger value="smokes" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🚬 Smokes ({productsByCategory.smokes.length})</TabsTrigger>
                )}
              </TabsList>

              {Object.entries(productsByCategory)
                .filter(([category]) => availableCategories.includes(category))
                .map(([category, items]) => (
                <TabsContent key={category} value={category}>
                  {category === "spirits" && items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {SPIRITS_SUBCATEGORIES.map((sub) => {
                        const count = sub.value === "all" ? items.length : items.filter(p => getSpiritsSubcategory(p.name) === sub.value).length;
                        if (sub.value !== "all" && count === 0) return null;
                        return (
                          <Button key={sub.value} variant={spiritsSubcategory === sub.value ? "default" : "outline"} size="sm" onClick={() => setSpiritsSubcategory(sub.value)} className="rounded-full text-xs h-8">
                            {sub.label} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {category === "wine" && items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {WINE_SUBCATEGORIES.map((sub) => {
                        const count = sub.value === "all" ? items.length : items.filter(p => getWineSubcategory(p.name) === sub.value).length;
                        if (sub.value !== "all" && count === 0) return null;
                        return (
                          <Button key={sub.value} variant={wineSubcategory === sub.value ? "default" : "outline"} size="sm" onClick={() => setWineSubcategory(sub.value)} className="rounded-full text-xs h-8">
                            {sub.label} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {category === "smokes" && items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {SMOKES_SUBCATEGORIES.map((sub) => {
                        const count = sub.value === "all" ? items.length : items.filter(p => getSmokesSubcategory(p.name) === sub.value).length;
                        if (sub.value !== "all" && count === 0) return null;
                        return (
                          <Button key={sub.value} variant={smokesSubcategory === sub.value ? "default" : "outline"} size="sm" onClick={() => setSmokesSubcategory(sub.value)} className="rounded-full text-xs h-8">
                            {sub.label} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {(category === "wine" && wineSubcategory !== "all"
                        ? items.filter(p => getWineSubcategory(p.name) === wineSubcategory)
                        : category === "spirits" && spiritsSubcategory !== "all"
                        ? items.filter(p => getSpiritsSubcategory(p.name) === spiritsSubcategory)
                        : category === "smokes" && smokesSubcategory !== "all"
                        ? items.filter(p => getSmokesSubcategory(p.name) === smokesSubcategory)
                        : items
                      ).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No products available in this category
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoreDetail;
