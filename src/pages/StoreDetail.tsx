import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowLeft, Plus, Minus, ShoppingCart, Loader2, Truck, Phone, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SuperstoreRequestForm from "@/components/SuperstoreRequestForm";
import ProductDetailModal from "@/components/ProductDetailModal";
import { safeImageUrl } from "@/lib/image-url";
import ManualItemDialog from "@/components/ManualItemDialog";

const SUPERSTORE_ID = "25e9b4a8-850a-4d26-9aad-54c9eb2f183a";

const PACK_SIZES_BY_CATEGORY: Record<string, { value: string; label: string; multiplier: number }[]> = {
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
  ciders_seltzers: [
    { value: "single", label: "Single", multiplier: 1 },
    { value: "4-pack", label: "4 Pack", multiplier: 4 },
    { value: "6-pack", label: "6 Pack", multiplier: 6 },
    { value: "12-pack", label: "12 Pack", multiplier: 12 },
    { value: "24-pack", label: "24 Pack", multiplier: 24 },
  ],
  smokes: [],
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
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [smokesSubcategory, setSmokesSubcategory] = useState<string>("all");
  const [spiritsSubcategory, setSpiritsSubcategory] = useState<string>("all");
  const [wineSubcategory, setWineSubcategory] = useState<string>("all");
  const [convenienceSubcategory, setConvenienceSubcategory] = useState<string>("all");
  const [petSubcategory, setPetSubcategory] = useState<string>("all");
  const [takeoutSubcategory, setTakeoutSubcategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const tabsListRef = useRef<HTMLDivElement>(null);
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
      // Fetch all products in batches to avoid the 1000-row default limit
      let allProducts: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", id!)
          .eq("in_stock", true)
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allProducts = allProducts.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allProducts;
    },
  });

  // Stable query key based on store id + product count (not array of ids — that recreates each render)
  const productIdsWithPacks = useMemo(() => products.map(p => p.id), [products]);
  const productIdsKey = useMemo(
    () => productIdsWithPacks.length > 0 ? `${id}:${productIdsWithPacks.length}` : "",
    [id, productIdsWithPacks.length]
  );

  const { data: packPrices = [] } = useQuery<PackPrice[]>({
    queryKey: ["product_pack_prices", productIdsKey],
    queryFn: async () => {
      if (productIdsWithPacks.length === 0) return [];
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
    staleTime: 60_000,
  });

  // Index packs by product_id once → O(1) lookup instead of O(N) filter per product
  const packsByProductId = useMemo(() => {
    const map = new Map<string, PackPrice[]>();
    for (const pp of packPrices) {
      const arr = map.get(pp.product_id);
      if (arr) arr.push(pp);
      else map.set(pp.product_id, [pp]);
    }
    return map;
  }, [packPrices]);

  const getPackSortValue = (packSize: string): number => {
    const match = String(packSize || "").match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const getAvailablePackSizes = (productId: string, category: keyof typeof PACK_SIZES_BY_CATEGORY) => {
    const all = packsByProductId.get(productId);
    if (!all || all.length === 0) return [];
    const productPackPrices = all.filter(pp => !pp.is_hidden);
    if (productPackPrices.length === 0) return [];

    const baseSizes = PACK_SIZES_BY_CATEGORY[category] || [];
    const matchedFromBase = baseSizes.filter(size =>
      productPackPrices.some(pp => pp.pack_size === size.value)
    );
    const unmatchedPrices = productPackPrices.filter(pp =>
      !baseSizes.some(s => s.value === pp.pack_size)
    );
    const dynamicSizes = unmatchedPrices.map(pp => ({
      value: pp.pack_size,
      label: pp.pack_size,
      multiplier: 1,
    }));
    return [...matchedFromBase, ...dynamicSizes].sort(
      (a, b) => getPackSortValue(b.value) - getPackSortValue(a.value)
    );
  };

  // Pre-compute max pack count per product once for sorting (avoids O(N×M) on every render)
  const maxPackCountByProductId = useMemo(() => {
    const map = new Map<string, number>();
    const considerStr = (current: number, s: string | null | undefined) => {
      if (!s) return current;
      const str = String(s).trim();
      if (!/can|bottle|btl|pack|tall/i.test(str)) return current;
      const m = str.match(/(\d+(?:\.\d+)?)/);
      if (!m) return current;
      const n = parseFloat(m[1]);
      return n > current ? n : current;
    };
    for (const p of products) {
      let max = considerStr(0, p.size);
      const packs = packsByProductId.get(p.id);
      if (packs) {
        for (const pp of packs) {
          if (!pp.is_hidden) max = considerStr(max, pp.pack_size);
        }
      }
      map.set(p.id, max);
    }
    return map;
  }, [products, packsByProductId]);

  const productsByCategory = useMemo(() => {
    const sortByLargestPack = (a: typeof products[0], b: typeof products[0]) => {
      const diff = (maxPackCountByProductId.get(b.id) ?? 0) - (maxPackCountByProductId.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      return ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name);
    };
    const sortByOrder = (a: typeof products[0], b: typeof products[0]) =>
      ((a as any).display_order ?? 0) - ((b as any).display_order ?? 0) || a.name.localeCompare(b.name);

    const beer: typeof products = [];
    const wine: typeof products = [];
    const spirits: typeof products = [];
    const ciders_seltzers: typeof products = [];
    const smokes: typeof products = [];
    const convenience: typeof products = [];
    const pet_supplies: typeof products = [];
    const takeout: typeof products = [];
    for (const p of products) {
      if (p.category === "beer") beer.push(p);
      else if (p.category === "wine") wine.push(p);
      else if (p.category === "spirits") spirits.push(p);
      else if (p.category === "ciders_seltzers") ciders_seltzers.push(p);
      else if (p.category === "smokes") smokes.push(p);
      else if ((p.category as string) === "convenience") convenience.push(p);
      else if ((p.category as string) === "pet_supplies") pet_supplies.push(p);
      else if ((p.category as string) === "takeout") takeout.push(p);
    }
    return {
      beer: beer.sort(sortByLargestPack),
      wine: wine.sort(sortByOrder),
      spirits: spirits.sort(sortByOrder),
      ciders_seltzers: ciders_seltzers.sort(sortByLargestPack),
      smokes: smokes.sort(sortByOrder),
      convenience: convenience.sort(sortByOrder),
      pet_supplies: pet_supplies.sort(sortByOrder),
      takeout: takeout.sort(sortByOrder),
    };
  }, [products, maxPackCountByProductId]);


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
    const packSizes = PACK_SIZES_BY_CATEGORY[category] ?? [];
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
        {/* Image - clickable */}
        <div
          className="aspect-square overflow-hidden bg-muted/30 relative cursor-pointer"
          onClick={() => setOpenProductId(product.id)}
        >
          <img
            src={safeImageUrl(product.image_url) || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format&fm=jpg"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        </div>

        {/* Content */}
        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h4
            className="font-medium text-foreground text-sm line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors"
            onClick={() => setOpenProductId(product.id)}
          >
            {product.name}
          </h4>

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
            src={safeImageUrl(store.image_url) || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800&auto=format&fm=jpg"}
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
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Nearby Location</span>
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
          {id === SUPERSTORE_ID ? (
            <SuperstoreRequestForm storeId={store.id} storeName={store.name} />
          ) : productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue={defaultCategory} className="w-full" onValueChange={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              {/* Search bar + manual add */}
              <div className="max-w-3xl mx-auto mb-5 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products in this store..."
                    className="pl-10 pr-10 h-11 rounded-full bg-card border-border shadow-sm w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <ManualItemDialog storeId={store.id} storeName={store.name} />
              </div>
              <TabsList className={`sticky top-16 z-30 mb-6 w-full justify-start sm:justify-center overflow-x-auto flex-nowrap h-auto p-1.5 gap-1 bg-background/95 backdrop-blur-md border border-border/50 shadow-sm rounded-xl ${availableCategories.length <= 1 ? "hidden" : ""}`}>
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
                {availableCategories.includes("convenience") && (
                  <TabsTrigger value="convenience" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🛒 Convenience ({productsByCategory.convenience.length})</TabsTrigger>
                )}
                {availableCategories.includes("pet_supplies") && (
                  <TabsTrigger value="pet_supplies" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🐾 Pet Supplies ({productsByCategory.pet_supplies.length})</TabsTrigger>
                )}
                {availableCategories.includes("takeout") && (
                  <TabsTrigger value="takeout" className="text-sm font-semibold px-5 py-2.5 gap-1.5 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">🍔 Menu ({productsByCategory.takeout.length})</TabsTrigger>
                )}
              </TabsList>

              {Object.entries(productsByCategory)
                .filter(([category]) => availableCategories.includes(category))
                .map(([category, items]) => (
                <TabsContent key={category} value={category}>
                  {(() => {
                    const isConv = category === "convenience";
                    const isSmokes = category === "smokes";
                    const isPet = category === "pet_supplies";
                    const isTakeout = category === "takeout";
                    const petEmoji = (v: string) => {
                      const n = v.toLowerCase();
                      if (n.includes("dog")) return "🐶";
                      if (n.includes("cat")) return "🐱";
                      if (n.includes("bird")) return "🦜";
                      if (n.includes("fish") || n.includes("aqua")) return "🐠";
                      if (n.includes("reptile")) return "🦎";
                      if (n.includes("small")) return "🐹";
                      if (n.includes("flea") || n.includes("tick")) return "🪲";
                      if (n.includes("outdoor")) return "🌲";
                      if (n.includes("parent")) return "👨‍👩‍👧";
                      return "🐾";
                    };
                    const subEmoji = (s: string) => {
                      const n = s.toLowerCase();
                      if (n.includes("baby")) return "👶";
                      if (n.includes("beauty appliance")) return "💇";
                      if (n.includes("beauty")) return "💄";
                      if (n.includes("beverage")) return "🥤";
                      if (n.includes("breakfast")) return "🥣";
                      if (n.includes("candy")) return "🍬";
                      if (n.includes("chip") || n.includes("snack") || n.includes("popcorn")) return "🍿";
                      if (n.includes("chocolate")) return "🍫";
                      if (n.includes("dairy") || n.includes("egg")) return "🥚";
                      if (n.includes("dermat")) return "🧴";
                      if (n.includes("electronic") || n.includes("tech")) return "🔌";
                      if (n.includes("eye makeup")) return "👁️";
                      if (n.includes("face care")) return "🧖";
                      if (n.includes("fashion")) return "👗";
                      if (n.includes("feminine")) return "🌸";
                      if (n.includes("first aid")) return "🩹";
                      if (n.includes("fragrance")) return "🌺";
                      if (n.includes("grocery")) return "🛒";
                      if (n.includes("gum") || n.includes("mint")) return "🍃";
                      if (n.includes("hair")) return "💇‍♀️";
                      if (n.includes("health device") || n.includes("therapy")) return "🩺";
                      if (n.includes("health") || n.includes("wellness")) return "💊";
                      if (n.includes("home health")) return "🏠";
                      if (n.includes("hosiery")) return "🧦";
                      if (n.includes("household")) return "🧹";
                      if (n.includes("incontinence")) return "🩲";
                      if (n.includes("international")) return "🌍";
                      if (n.includes("jewel") || n.includes("handbag")) return "💍";
                      if (n.includes("laundry")) return "🧺";
                      if (n.includes("makeup")) return "💋";
                      if (n.includes("medicine")) return "💊";
                      if (n.includes("nail")) return "💅";
                      if (n.includes("oral")) return "🦷";
                      if (n.includes("personal")) return "🧼";
                      if (n.includes("men")) return "🧔";
                      if (n.includes("toy") || n.includes("entertain")) return "🧸";
                      return "✨";
                    };
                    const smokeEmoji = (v: string) => ({
                      cigarettes: "🚬",
                      cigars: "🌬️",
                      vapes: "💨",
                      rolling: "📜",
                      pouches: "🥡",
                      accessories: "🔥",
                    } as Record<string, string>)[v] || "🚬";

                    const subs = isConv || isPet || isTakeout
                      ? (Array.from(new Set(items.map(p => (p as any).subcategory).filter(Boolean))).sort() as string[])
                      : isSmokes
                      ? SMOKES_SUBCATEGORIES.filter(s => s.value !== "all" && items.some(p => getSmokesSubcategory(p.name) === s.value)).map(s => s.value)
                      : [];
                    const hasSidebar = (isConv || isSmokes || isPet || isTakeout) && subs.length > 0;

                    const q = searchQuery.trim().toLowerCase();
                    let displayItems = category === "wine" && wineSubcategory !== "all"
                      ? items.filter(p => getWineSubcategory(p.name) === wineSubcategory)
                      : category === "spirits" && spiritsSubcategory !== "all"
                      ? items.filter(p => getSpiritsSubcategory(p.name) === spiritsSubcategory)
                      : category === "smokes" && smokesSubcategory !== "all"
                      ? items.filter(p => getSmokesSubcategory(p.name) === smokesSubcategory)
                      : category === "convenience" && convenienceSubcategory !== "all"
                      ? items.filter(p => (p as any).subcategory === convenienceSubcategory)
                      : category === "pet_supplies" && petSubcategory !== "all"
                      ? items.filter(p => (p as any).subcategory === petSubcategory)
                      : category === "takeout" && takeoutSubcategory !== "all"
                      ? items.filter(p => (p as any).subcategory === takeoutSubcategory)
                      : items;
                    if (q) {
                      displayItems = displayItems.filter(p =>
                        p.name.toLowerCase().includes(q) ||
                        (p.description?.toLowerCase().includes(q) ?? false)
                      );
                    }

                    const renderLegacyPills = () => (
                      <>
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
                          <div className="flex flex-wrap gap-2.5 mb-6">
                            {WINE_SUBCATEGORIES.map((sub) => {
                              const count = sub.value === "all" ? items.length : items.filter(p => getWineSubcategory(p.name) === sub.value).length;
                              if (sub.value !== "all" && count === 0) return null;
                              return (
                                <Button key={sub.value} variant={wineSubcategory === sub.value ? "default" : "outline"} onClick={() => setWineSubcategory(sub.value)} className="rounded-full text-base h-11 px-5 font-semibold shadow-sm">
                                  {sub.label} ({count})
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );

                    const grid = items.length > 0 ? (
                      displayItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                          {displayItems.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          {q ? `No products match "${searchQuery}"` : "No products available in this category"}
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No products available in this category
                      </div>
                    );

                    if (!hasSidebar) {
                      return (
                        <>
                          {renderLegacyPills()}
                          {grid}
                        </>
                      );
                    }

                    const takeoutEmoji = (v: string) => {
                      const n = v.toLowerCase();
                      if (n.includes("burger")) return "🍔";
                      if (n.includes("chicken")) return "🍗";
                      if (n.includes("breakfast")) return "🥞";
                      if (n.includes("side") || n.includes("fries")) return "🍟";
                      if (n.includes("drink") || n.includes("beverage") || n.includes("shake")) return "🥤";
                      if (n.includes("dessert") || n.includes("ice cream") || n.includes("treat") || n.includes("blizzard") || n.includes("sundae")) return "🍦";
                      if (n.includes("combo") || n.includes("meal")) return "🍱";
                      if (n.includes("kids")) return "🧒";
                      if (n.includes("salad")) return "🥗";
                      if (n.includes("hot dog")) return "🌭";
                      if (n.includes("sandwich") || n.includes("wrap")) return "🥪";
                      return "🍽️";
                    };
                    const currentValue = isConv ? convenienceSubcategory : isPet ? petSubcategory : isTakeout ? takeoutSubcategory : smokesSubcategory;
                    const setCurrent = isConv ? setConvenienceSubcategory : isPet ? setPetSubcategory : isTakeout ? setTakeoutSubcategory : setSmokesSubcategory;
                    const allLabel = isConv ? "All Departments" : isPet ? "All Pets" : isTakeout ? "Full Menu" : "All Smokes";
                    const allItemsLabel = isConv ? "All Items" : isPet ? "All Pet Supplies" : isTakeout ? "Full Menu" : "All Smokes";
                    const allEmoji = isConv ? "🏪" : isPet ? "🐾" : isTakeout ? "🍽️" : "🚬";
                    const sidebarTitle = isConv ? "Departments" : isPet ? "Pet Type" : isTakeout ? "Menu" : "Categories";
                    const aisleWord = isConv ? "aisles" : isPet ? "categories" : isTakeout ? "sections" : "categories";
                    const labelFor = (v: string) => isConv || isPet || isTakeout ? v : (SMOKES_SUBCATEGORIES.find(s => s.value === v)?.label || v);
                    const iconFor = (v: string) => isConv ? subEmoji(v) : isPet ? petEmoji(v) : isTakeout ? takeoutEmoji(v) : smokeEmoji(v);
                    const activeLabel = currentValue === "all" ? allLabel : labelFor(currentValue);
                    const activeEmoji = currentValue === "all" ? allEmoji : iconFor(currentValue);

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                        {/* Sidebar */}
                        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)]">
                          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
                              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{sidebarTitle}</h3>
                              <p className="text-sm font-semibold text-foreground mt-1">{subs.length} {aisleWord} • {items.length.toLocaleString()} items</p>
                            </div>
                            <nav className="p-2 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
                              <button
                                onClick={() => setCurrent("all")}
                                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                                  currentValue === "all"
                                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md"
                                    : "text-foreground hover:bg-muted/60"
                                }`}
                              >
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${currentValue === "all" ? "bg-white/20" : "bg-muted"}`}>{allEmoji}</span>
                                <span className="flex-1 truncate">{allItemsLabel}</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentValue === "all" ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>
                                  {items.length.toLocaleString()}
                                </span>
                              </button>
                              {subs.map((sub) => {
                                const count = isConv || isPet || isTakeout
                                  ? items.filter(p => (p as any).subcategory === sub).length
                                  : items.filter(p => getSmokesSubcategory(p.name) === sub).length;
                                const active = currentValue === sub;
                                return (
                                  <button
                                    key={sub}
                                    onClick={() => setCurrent(sub)}
                                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                                      active
                                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md font-semibold"
                                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                                    }`}
                                  >
                                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${active ? "bg-white/20" : "bg-muted"}`}>{iconFor(sub)}</span>
                                    <span className="flex-1 truncate">{labelFor(sub)}</span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                            </nav>
                          </div>
                        </aside>

                        {/* Main content */}
                        <div className="min-w-0">
                          <div className="flex items-end justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-border/60">
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-2xl shadow-sm">{activeEmoji}</span>
                              <div>
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{activeLabel}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">{displayItems.length.toLocaleString()} {displayItems.length === 1 ? "product" : "products"}{q ? ` matching "${searchQuery}"` : ""}</p>
                              </div>
                            </div>
                            {currentValue !== "all" && (
                              <button onClick={() => setCurrent("all")} className="text-xs font-semibold text-primary hover:underline">
                                ← Back to {isConv ? "all departments" : isPet ? "all pet supplies" : isTakeout ? "full menu" : "all smokes"}
                              </button>
                            )}
                          </div>
                          {grid}
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>


      <Footer />

      <ProductDetailModal
        productId={openProductId}
        open={!!openProductId}
        onOpenChange={(open) => !open && setOpenProductId(null)}
      />
    </div>
  );
};

export default StoreDetail;
