import type {
  DppActor,
  DppBadge,
  DppDocument,
  DppProduct,
  DppStage,
  DocumentCode,
  Tone,
} from "@/data/dppData";
import type { DppPage } from "@/types/dppPage";
import type {
  DppStage as TraceStage,
  TraceabilityDocument,
  TraceabilityNode,
  TraceabilityNodeMapping,
  TraceabilityRecord,
} from "@/types/traceability";

const REQUIRED_CODES: DocumentCode[] = ["PO", "INV", "CO", "BL", "TR", "CD"];
const STAGE_ORDER: TraceStage[] = ["farm", "ginner", "trader", "spinner", "fabric", "garment"];
const DEFAULT_COORDINATES: [number, number] = [110.2663, -6.9263];

const STAGE_META: Record<TraceStage, { title: string; subtitle: string; description: string; tone: Tone; countryCode: string }> = {
  farm: {
    title: "Farm",
    subtitle: "Cotton origin",
    description: "Seed cotton is grown and harvested at the origin farm documented in the traceability record.",
    tone: "lime",
    countryCode: "—",
  },
  ginner: {
    title: "Ginner",
    subtitle: "Ginning & baling",
    description: "Raw seed cotton is cleaned, ginned, and pressed into export bales for the next tier.",
    tone: "mint",
    countryCode: "—",
  },
  trader: {
    title: "Cotton trader",
    subtitle: "Trader & export",
    description: "Cotton traders move the bales between origin, processing, and export destinations.",
    tone: "sky",
    countryCode: "—",
  },
  spinner: {
    title: "Spinner",
    subtitle: "Spinning",
    description: "Cotton is spun into yarn and the material identity is carried forward by lot.",
    tone: "sand",
    countryCode: "—",
  },
  fabric: {
    title: "Knitter / weaver",
    subtitle: "Knitting, weaving & finishing",
    description: "Yarn is knitted or woven into fabric and finished for the garment tier.",
    tone: "clay",
    countryCode: "—",
  },
  garment: {
    title: "Garment manufacturer / finished goods",
    subtitle: "Cut, make & trim",
    description: "The finished fabric is cut, made, and trimmed into the final product.",
    tone: "stone",
    countryCode: "—",
  },
};

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  australia: [149.8417, -29.4644],
  indonesia: [110.2663, -6.9263],
  "south korea": [127.7669, 35.9078],
  korea: [127.7669, 35.9078],
  japan: [138.2529, 36.2048],
  china: [104.1954, 35.8617],
  india: [78.9629, 20.5937],
  vietnam: [108.2772, 14.0583],
  usa: [-95.7129, 37.0902],
  "united states": [-95.7129, 37.0902],
  brazil: [-51.9253, -14.235],
  turkey: [35.2433, 38.9637],
  pakistan: [69.3451, 30.3753],
  bangladesh: [90.3563, 23.685],
  afrika: [18.5, 2.0],
  africa: [18.5, 2.0],
  "hong kong": [114.1694, 22.3193],
  switzerland: [8.2275, 46.8182],
  singapore: [103.8198, 1.3521],
  thailand: [100.9925, 15.87],
  taiwan: [120.9605, 23.6978],
  germany: [10.4515, 51.1657],
  italy: [12.5674, 41.8719],
  spain: [-3.7492, 40.4637],
  uk: [-3.4359, 55.3781],
  "united kingdom": [-3.4359, 55.3781],
  netherlands: [5.2913, 52.1326],
  france: [2.2137, 46.2276],
  portugal: [-8.2245, 39.3999],
  mexico: [-102.5528, 23.6345],
  peru: [-75.0152, -9.19],
  egypt: [30.8025, 26.8206],
  morocco: [-7.0926, 31.7917],
  "south africa": [22.9375, -30.5595],
  ethiopia: [40.4897, 9.145],
  tanzania: [34.8888, -6.369],
  kenya: [37.9062, -0.0236],
  benin: [2.3158, 9.3077],
  mali: [-3.9962, 17.5707],
  "burkina faso": [-1.5616, 12.2383],
  "ivory coast": [-5.5471, 7.54],
  cameroon: [12.3547, 7.3697],
  nigeria: [8.6753, 9.082],
  ghana: [-1.0232, 7.9465],
  argentina: [-63.6167, -38.4161],
  paraguay: [-58.4438, -23.4425],
  colombia: [-74.2973, 4.5709],
  guatemala: [-90.2308, 15.7835],
  honduras: [-86.2419, 15.2],
  canada: [-106.3468, 56.1304],
  russia: [105.3188, 61.524],
  uzbekistan: [64.5853, 41.3775],
  kazakhstan: [66.9237, 48.0196],
  greece: [21.8243, 39.0742],
  bulgaria: [25.4858, 42.7339],
  romania: [24.9668, 45.9432],
  sweden: [18.6435, 60.1282],
  norway: [8.4689, 60.472],
  denmark: [9.5018, 56.2639],
  finland: [25.7482, 61.9241],
  poland: [19.1451, 51.9194],
  ukraine: [31.1656, 48.3794],
  ireland: [-8.2439, 53.4129],
  "new zealand": [174.886, -40.9006],
  "sri lanka": [80.7718, 7.8731],
  nepal: [84.124, 28.3949],
  myanmar: [95.9562, 21.9162],
  cambodia: [104.991, 12.5657],
  philippines: [121.774, 12.8797],
  malaysia: [101.9758, 4.2105],
  mongolia: [103.8467, 46.8625],
  "saudi arabia": [45.0792, 23.8859],
  uae: [53.8478, 23.4241],
  israel: [34.8516, 31.0461],
  iran: [53.688, 32.4279],
  iraq: [43.6793, 33.2232],
  lebanon: [35.8623, 33.8547],
  qatar: [51.1839, 25.3548],
  kuwait: [47.4818, 29.3117],
  algeria: [1.6596, 28.0339],
  libya: [17.2283, 26.3351],
  sudan: [30.2176, 12.8628],
  chad: [18.7322, 15.4542],
  niger: [8.0817, 17.6078],
  madagascar: [46.8691, -18.7669],
  mozambique: [35.5296, -18.6657],
  zimbabwe: [29.1549, -19.0154],
  zambia: [27.8493, -13.1339],
  malawi: [34.3015, -13.2543],
  angola: [17.8739, -11.2027],
  rwanda: [29.8739, -1.9403],
  uganda: [32.2903, 1.3733],
  "united arab emirates": [53.8478, 23.4241],
};

function normalise(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function coordinatesFor(country: string | null): [number, number] | undefined {
  const value = normalise(country);

  if (!value) {
    return undefined;
  }

  const direct = COUNTRY_COORDINATES[value];

  if (direct) {
    return direct;
  }

  const match = Object.keys(COUNTRY_COORDINATES)
    .filter((key) => value.includes(key))
    .sort((a, b) => b.length - a.length)[0];

  return match ? COUNTRY_COORDINATES[match] : undefined;
}

function documentCode(type: string | null): DocumentCode {
  const value = normalise(type);

  if (value.includes("invoice")) return "INV";
  if (value.includes("purchase order") || value === "po") return "PO";
  if (value.includes("certificate of origin") || value.includes("origin") || value === "co" || value === "coo") return "CO";
  if (value.includes("bill of lading") || value === "bl") return "BL";
  if (value.includes("transport") || value === "tr") return "TR";
  if (value.includes("customs") || value === "cd") return "CD";
  if (value.includes("packing list") || value === "pl" || value === "dpl") return "PL";
  if (value.includes("working") || value === "wo") return "WO";
  if (value.includes("inventory") || value === "bir") return "BIR";
  if (value.includes("hvi") || value.includes("fibre quality")) return "HVI";
  if (value.includes("warehouse") || value === "wh") return "WH";
  if (value.includes("goods received") || value === "grn") return "GRN";
  if (value.includes("production") || value === "pp") return "PP";
  if (value.includes("garment") || value === "gm") return "GM";
  if (value === "coc") return "COC";
  if (value.includes("affidavit") || value === "avd") return "AVD";

  return "OTHER";
}

function mapDocument(document: TraceabilityDocument): DppDocument {
  const code = documentCode(document.documentType);
  const label = document.typeDescription || [document.documentType, document.documentNo].filter(Boolean).join(" · ") || "Supporting document";

  return {
    code,
    codes: [code],
    label,
    fileName: document.fileName ?? `${code}-${document.documentNo ?? document.id}`,
    required: REQUIRED_CODES.includes(code),
  };
}

function coveredCodes(documents: DppDocument[]): DocumentCode[] {
  const present = new Set(documents.flatMap((document) => document.codes));
  return REQUIRED_CODES.filter((code) => present.has(code));
}

function actorStatus(documents: DppDocument[], coverage: number): DppActor["status"] {
  if (documents.length === 0) return "missing";
  if (coverage === REQUIRED_CODES.length) return "complete";
  if (coverage > 0) return "partial";
  return "declared";
}

function initials(value: string): string {
  const words = value
    .split(/[\s/&.-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "NA";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function buildActor(node: TraceabilityNode, stage: TraceStage, documents: TraceabilityDocument[]): DppActor {
  const actorDocuments = documents.map(mapDocument);
  const covered = coveredCodes(actorDocuments);
  const coverage = covered.length;
  const noteParts = [
    node.processDescription,
    node.branchLabel ? `Branch ${node.branchLabel}` : null,
    node.inputLot || node.outputLot ? `Lot ${node.inputLot ?? "—"} → ${node.outputLot ?? "—"}` : null,
    node.quantity === null ? null : `${node.quantity.toLocaleString("en-US")} ${node.unit ?? ""}`.trim(),
    node.upstreamSeqNos.length ? `Upstream #${node.upstreamSeqNos.join(", ")}` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    id: `node-${node.id}`,
    short: initials(node.supplier ?? node.role ?? "NA"),
    role: node.role ?? STAGE_META[stage].title,
    name: node.supplier ?? "Unnamed supplier",
    country: node.country ?? "—",
    coordinates: coordinatesFor(node.country),
    note: noteParts.length ? noteParts.join(" · ") : undefined,
    stageId: stage,
    documents: actorDocuments,
    covered,
    coverage,
    status: actorStatus(actorDocuments, coverage),
  };
}

function buildBadges(stages: DppStage[], coverage: number): DppBadge[] {
  const documented = stages
    .flatMap((stage) => stage.actors)
    .filter((actor) => actor.documents.length > 0 && actor.covered.length > 0);

  const evidenceFor = (code: DocumentCode) =>
    documented
      .filter((actor) => actor.covered.includes(code) || actor.documents.some((document) => document.codes.includes(code)))
      .map((actor) => ({
        actorName: `${actor.role} · ${actor.name}`,
        documents: actor.documents.filter((document) => document.codes.includes(code)),
      }));

  const countWith = (code: DocumentCode) => evidenceFor(code).length;
  const count = documented.length;
  const statusFor = (matched: number): DppBadge["status"] =>
    matched === 0 ? "Not documented" : matched === count ? "Supported" : "Partial";

  return [
    {
      id: "chain-of-custody",
      title: "Chain of custody documented",
      eyebrow: "Traceability",
      description:
        "Purchase order, invoice, origin, shipping, transport, and customs evidence supports the mapped supply-chain actors.",
      basis: `${coverage}% of the mandatory document slots are covered across ${count} documented actors.`,
      tone: "forest",
      status: coverage >= 95 ? "Supported" : coverage > 0 ? "Partial" : "Not documented",
      evidence: documented.map((actor) => ({
        actorName: `${actor.role} · ${actor.name}`,
        documents: actor.documents.filter((document) => document.required),
      })),
    },
    {
      id: "origin",
      title: "Origin documented",
      eyebrow: "Origin",
      description: "Certificates of origin connect the material to its declared country of origin.",
      basis: `Certificates of origin are present for ${countWith("CO")} of ${count} documented actors.`,
      tone: "sun",
      status: statusFor(countWith("CO")),
      evidence: evidenceFor("CO"),
    },
    {
      id: "customs",
      title: "Customs movement documented",
      eyebrow: "Cross-border",
      description: "Import and export declarations document the legal movement of the material.",
      basis: `Customs declarations are present for ${countWith("CD")} of ${count} documented actors.`,
      tone: "ocean",
      status: statusFor(countWith("CD")),
      evidence: evidenceFor("CD"),
    },
    {
      id: "working-conditions",
      title: "Working conditions documented",
      eyebrow: "Labour",
      description: "Working-condition records are attached to the production tier that supplied them.",
      basis: `Working-condition records are present for ${countWith("WO")} of ${count} documented actors.`,
      tone: "sun",
      status: countWith("WO") > 0 ? "Supported" : "Not documented",
      evidence: evidenceFor("WO"),
    },
  ];
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function buildTraceabilityProduct(
  record: TraceabilityRecord,
  mappings: TraceabilityNodeMapping[],
  page: DppPage,
): DppProduct {
  const mappingByNodeId = new Map(mappings.map((mapping) => [mapping.nodeId, mapping]));
  let lastCoordinates: [number, number] = DEFAULT_COORDINATES;

  const stages: DppStage[] = STAGE_ORDER.map((stage) => {
    const nodes = record.nodes.filter((node) => mappingByNodeId.get(node.id)?.stage === stage);
    const actors = nodes.map((node) =>
      buildActor(
        node,
        stage,
        record.documents.filter((document) => document.nodeId === node.id),
      ),
    );
    const located = actors.find((actor) => actor.coordinates);

    if (located?.coordinates) {
      lastCoordinates = located.coordinates;
    }

    const countries = [...new Set(nodes.map((node) => node.country).filter((country): country is string => Boolean(country)))];
    const withDocuments = actors.filter((actor) => actor.documents.length > 0);
    const coverage = withDocuments.length
      ? Math.round(withDocuments.reduce((sum, actor) => sum + actor.coverage, 0) / withDocuments.length)
      : 0;
    const status: DppStage["status"] =
      actors.length === 0
        ? "missing"
        : withDocuments.length === 0
          ? "declared"
          : withDocuments.every((actor) => actor.coverage === REQUIRED_CODES.length)
            ? "complete"
            : "partial";

    return {
      id: stage,
      title: STAGE_META[stage].title,
      subtitle: STAGE_META[stage].subtitle,
      description: STAGE_META[stage].description,
      tone: STAGE_META[stage].tone,
      countryCode: STAGE_META[stage].countryCode,
      coordinates: located?.coordinates ?? lastCoordinates,
      location: countries.length ? countries.join(" · ") : "Not documented",
      actors,
      coverage,
      status,
    };
  });

  const allActors = stages.flatMap((stage) => stage.actors);
  const documentedActors = allActors.filter((actor) => actor.documents.length > 0 && actor.covered.length > 0);
  const slots = documentedActors.length * REQUIRED_CODES.length;
  const present = documentedActors.reduce((sum, actor) => sum + actor.covered.length, 0);
  const coverage = slots ? Math.round((present / slots) * 100) : 0;

  const counts = new Map<DocumentCode, number>();
  for (const document of record.documents) {
    const code = documentCode(document.documentType);
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const documentsByCode = [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const fibreText = record.fibres
    .map((fibre) => `${fibre.fibreType ?? "Fibre"}${fibre.percentage === null ? "" : ` ${fibre.percentage}%`}`)
    .join(" · ");
  const compositions = record.fibres.length
    ? record.fibres.map((fibre) => ({
        percentage: fibre.percentage ?? 0,
        material: fibre.fibreType ?? "Fibre",
        note: fibre.sourceLot ? `Source lot ${fibre.sourceLot}` : `Documented from ${record.milRef}.`,
      }))
    : [{ percentage: 0, material: "Not documented", note: "No fibre composition recorded for this MilRef." }];

  const quantities = record.nodes
    .map((node) => node.quantity)
    .filter((quantity): quantity is number => quantity !== null);
  const unit = record.nodes.find((node) => node.unit)?.unit ?? "";
  const orderUnits = quantities.length ? `${quantities.reduce((sum, value) => sum + value, 0).toLocaleString("en-US")} ${unit}`.trim() : "—";

  const lastActor = allActors.at(-1);
  const firstCountry = allActors.find((actor) => actor.country && actor.country !== "—")?.country ?? "—";

  return {
    id: page.milRef,
    material: record.header?.materialReference ?? record.header?.millNo ?? page.milRef,
    po: record.header?.buyerPo ?? "—",
    style: record.header?.style ?? "—",
    fiber: fibreText || "Not documented",
    orderUnits,
    manufacturer: lastActor?.name ?? "—",
    brand: record.header?.buyer ?? "—",
    factory: lastActor?.name ?? "—",
    factoryId: record.header?.materialReference ?? "—",
    country: firstCountry,
    deliveryCountry: record.header?.buyer ?? "—",
    exFactoryDate: "—",
    season: "DPP traceability",
    name: record.header?.style ?? page.milRef,
    color: record.header?.productForm ?? "—",
    passportId: page.milRef,
    lastUpdated: formatDate(page.updatedAt),
    composition: compositions,
    stages,
    badges: buildBadges(stages, coverage),
    coverage,
    documentsByCode,
    source: {
      documents: record.documents.length,
      bundled: 0,
      tiers: stages.filter((stage) => stage.actors.length > 0).length,
      actors: allActors.length,
      sourcePath: `tesdatt5 · T_溯源_* · ${record.milRef}`,
    },
  };
}
