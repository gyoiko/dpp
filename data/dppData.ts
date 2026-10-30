import manifestJson from "./dpp-files.json";

export type DocumentCode =
  | "PO"
  | "INV"
  | "CO"
  | "BL"
  | "TR"
  | "CD"
  | "BIR"
  | "WO"
  | "SC"
  | "DPL"
  | "PL"
  | "PHYTO"
  | "TT"
  | "INS"
  | "HVI"
  | "WH"
  | "GRN"
  | "PP"
  | "GM"
  | "COC"
  | "AVD"
  | "PKL"
  | "CUSTOMS"
  | "COO"
  | "NOTE"
  | "FABRIC_OUT"
  | "OTHER"
  | "VERIFICATION";

export type StageStatus = "complete" | "partial" | "declared" | "missing";
export type ActorStatus = "complete" | "partial" | "declared" | "missing";
export type BadgeStatus = "Supported" | "Partial" | "Pending" | "Not documented";
export type Tone = "lime" | "mint" | "sky" | "sand" | "clay" | "stone";
export type BadgeTone = "forest" | "sun" | "ocean";

export type DppDocument = {
  code: DocumentCode;
  codes: DocumentCode[];
  label: string;
  fileName: string;
  href?: string;
  bytes?: number;
  inherited?: boolean;
  inheritedFrom?: string;
  required: boolean;
};

export type DppActor = {
  id: string;
  short: string;
  role: string;
  name: string;
  country: string;
  city?: string;
  address?: string;
  coordinates?: [number, number];
  contact?: string;
  website?: string;
  note?: string;
  reference?: boolean;
  inheritedFrom?: string;
  stageId: string;
  documents: DppDocument[];
  covered: DocumentCode[];
  coverage: number;
  status: ActorStatus;
};

export type DppStage = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: Tone;
  countryCode: string;
  coordinates: [number, number];
  location: string;
  actors: DppActor[];
  coverage: number;
  status: StageStatus;
};

export type DppBadge = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  basis: string;
  tone: BadgeTone;
  status: BadgeStatus;
  evidence: { actorName: string; documents: DppDocument[] }[];
};

export type DppProduct = {
  id: string;
  material: string;
  po: string;
  style: string;
  fiber: string;
  orderUnits: string;
  manufacturer: string;
  brand?: string;
  factory: string;
  factoryId: string;
  country: string;
  deliveryCountry: string;
  exFactoryDate: string;
  season: string;
  name: string;
  photo?: string;
  color: string;
  passportId: string;
  lastUpdated: string;
  composition: { percentage: number; material: string; note: string }[];
  stages: DppStage[];
  badges: DppBadge[];
  coverage: number;
  documentsByCode: { code: DocumentCode; count: number }[];
  source: {
    coc?: DppDocument;
    documents: number;
    bundled: number;
    tiers: number;
    actors: number;
    sourcePath: string;
  };
  verification?: {
    label: string;
    status: string;
    detail: string;
    documents: DppDocument[];
  };
};

type ManifestFile = {
  tier: string;
  actor: string;
  name: string;
  rel: string;
  codes: string[];
  href: string | null;
  bytes: number;
  label?: string;
};

type ManifestReferenceFile = {
  id: string;
  name: string;
  rel: string;
  codes: string[];
  href: string | null;
  bytes: number;
  label?: string;
};

type Manifest = {
  generatedAt: string;
  source: string;
  products: Record<string, { files: ManifestFile[] }>;
  upstream: ManifestReferenceFile[];
  verification: ManifestReferenceFile[];
};

const manifest = manifestJson as unknown as Manifest;

const REQUIRED: DocumentCode[] = ["PO", "INV", "CO", "BL", "TR", "CD"];

const CODE_LABELS: Record<DocumentCode, string> = {
  PO: "Purchase order",
  INV: "Invoice / payment request",
  CO: "Certificate of origin",
  BL: "Bill of lading",
  TR: "Transport record",
  CD: "Customs declaration",
  BIR: "Buyer inventory record",
  WO: "Working conditions",
  SC: "Sales contract",
  DPL: "Detailed packing list",
  PL: "Packing list",
  PHYTO: "Phytosanitary certificate",
  TT: "Payment proof",
  INS: "Cargo insurance",
  HVI: "Fibre quality (HVI)",
  WH: "Warehouse receipt",
  GRN: "Goods received note",
  PP: "Production record",
  GM: "Garment declaration",
  COC: "COC master document",
  AVD: "Affidavit",
  PKL: "Packing list",
  CUSTOMS: "Customs declaration",
  COO: "Certificate of origin",
  NOTE: "Supporting note",
  FABRIC_OUT: "Fabric output record",
  OTHER: "Supporting document",
  VERIFICATION: "Verification record",
};

const CODE_ORDER: DocumentCode[] = [
  "PO", "INV", "CO", "BL", "TR", "CD", "BIR", "WO", "SC", "DPL", "PL",
  "PHYTO", "TT", "INS", "HVI", "WH", "GRN", "PP", "FABRIC_OUT", "GM",
  "COC", "AVD", "PKL", "CUSTOMS", "COO", "NOTE", "OTHER", "VERIFICATION",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function codeOrder(code: DocumentCode) {
  const index = CODE_ORDER.indexOf(code);
  return index === -1 ? CODE_ORDER.length : index;
}

function labelFor(codes: DocumentCode[]) {
  return codes.map((code) => CODE_LABELS[code] ?? "Supporting document").join(" + ");
}

type DocumentSource = {
  name: string;
  codes: string[];
  href: string | null;
  bytes: number;
  label?: string;
};

function toDocument(file: DocumentSource): DppDocument {
  const codes = (file.codes.length ? file.codes : ["OTHER"]) as DocumentCode[];
  return {
    code: codes[0],
    codes,
    label: file.label ?? labelFor(codes),
    fileName: file.name,
    href: file.href ?? undefined,
    bytes: file.bytes,
    required: codes.some((code) => REQUIRED.includes(code)),
  };
}

function filesFor(productId: string, actorId: string) {
  return (manifest.products[productId]?.files ?? [])
    .filter((file) => file.actor === actorId)
    .map(toDocument);
}

function rootDocuments(productId: string, code: DocumentCode) {
  return (manifest.products[productId]?.files ?? [])
    .filter((file) => file.actor === "root" && file.codes.includes(code))
    .map(toDocument);
}

function cocDocument(productId: string) {
  return rootDocuments(productId, "COC")[0];
}

function excelDate(serial?: number) {
  if (!serial) return "—";
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatManifestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function coveredCodes(documents: DppDocument[]) {
  const present = new Set(documents.flatMap((document) => document.codes));
  return REQUIRED.filter(
    (code) => present.has(code) || (code === "TR" && (present.has("PL") || present.has("DPL"))),
  );
}

type ActorSeed = {
  id: string;
  short: string;
  role: string;
  name: string;
  country: string;
  city?: string;
  address?: string;
  coordinates?: [number, number];
  contact?: string;
  website?: string;
  note?: string;
  reference?: boolean;
  inheritedFrom?: string;
  inheritedCodes?: DocumentCode[];
  extraDocuments?: DppDocument[];
  documents?: DppDocument[];
};

type StageSeed = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: Tone;
  countryCode: string;
  coordinates: [number, number];
  location: string;
  actorIds: string[];
};

type ProductSeed = {
  id: string;
  material: string;
  po: string;
  style: string;
  fiber: string;
  orderUnits: string;
  manufacturer: string;
  brand?: string;
  factory: string;
  factoryId: string;
  country: string;
  deliveryCountry: string;
  exFactoryDate: string;
  season: string;
  name: string;
  color: string;
  passportId: string;
  compositionNote: string;
  stages: StageSeed[];
  actors: Record<string, ActorSeed>;
  verification?: DppProduct["verification"];
};

function buildActor(productId: string, seed: ActorSeed, stageId: string): DppActor {
  const documents = [...(seed.documents ?? filesFor(productId, seed.id)), ...(seed.extraDocuments ?? [])];

  if (seed.inheritedCodes?.length && seed.inheritedFrom) {
    const present = new Set(documents.flatMap((document) => document.codes));
    for (const code of seed.inheritedCodes) {
      if (present.has(code)) continue;
      documents.push({
        code,
        codes: [code],
        label: `${CODE_LABELS[code]} (inherited)`,
        fileName: `Refer to ${seed.inheritedFrom}`,
        inherited: true,
        inheritedFrom: seed.inheritedFrom,
        required: REQUIRED.includes(code),
      });
    }
  }

  documents.sort((a, b) => codeOrder(a.code) - codeOrder(b.code));
  const covered = coveredCodes(documents);
  const coverage = covered.length;
  const status: ActorStatus =
    documents.length === 0 ? "missing" : coverage === 6 ? "complete" : coverage > 0 ? "partial" : "declared";

  return {
    ...seed,
    stageId,
    documents,
    covered,
    coverage,
    status,
  };
}

function buildBadges(
  stages: DppStage[],
  coverage: number,
  verification: DppProduct["verification"],
): DppBadge[] {
  const actors = stages.flatMap((stage) => stage.actors);
  const documented = actors.filter((actor) => actor.documents.length > 0 && actor.covered.length > 0 && !actor.reference);

  const evidenceFor = (code: DocumentCode) =>
    documented
      .filter((actor) => actor.covered.includes(code) || actor.documents.some((document) => document.codes.includes(code)))
      .map((actor) => ({
        actorName: `${actor.role} · ${actor.name}`,
        documents: actor.documents.filter(
          (document) => document.codes.includes(code) || (code === "TR" && (document.codes.includes("PL") || document.codes.includes("DPL"))),
        ),
      }));

  const countWith = (code: DocumentCode) => evidenceFor(code).length;
  const statusFor = (count: number): BadgeStatus =>
    count === 0 ? "Not documented" : count === documented.length ? "Supported" : "Partial";

  const chainEvidence = documented.map((actor) => ({
    actorName: `${actor.role} · ${actor.name}`,
    documents: actor.documents.filter((document) => document.required),
  }));

  const badges: DppBadge[] = [
    {
      id: "chain-of-custody",
      title: "Chain of custody documented",
      eyebrow: "Traceability",
      description:
        "Purchase order, invoice, origin, shipping, transport and customs evidence is present for each documented actor in the chain.",
      basis: `${coverage}% of the mandatory document slots are covered across ${documented.length} documented actors. Missing slots stay visible instead of being inferred.`,
      tone: "forest",
      status: coverage >= 95 ? "Supported" : coverage > 0 ? "Partial" : "Not documented",
      evidence: chainEvidence,
    },
    {
      id: "origin",
      title: "Origin documented",
      eyebrow: "Origin",
      description:
        "Certificates of origin connect the cotton, yarn and fabric to their declared countries of origin.",
      basis: `Certificates of origin are present for ${countWith("CO")} of ${documented.length} documented actors.`,
      tone: "sun",
      status: statusFor(countWith("CO")),
      evidence: evidenceFor("CO"),
    },
    {
      id: "customs",
      title: "Customs movement documented",
      eyebrow: "Cross-border",
      description:
        "Import and export declarations document the legal movement of cotton and yarn between countries.",
      basis: `Customs declarations are present for ${countWith("CD")} of ${documented.length} documented actors.`,
      tone: "ocean",
      status: statusFor(countWith("CD")),
      evidence: evidenceFor("CD"),
    },
    {
      id: "working-conditions",
      title: "Working conditions documented",
      eyebrow: "Labour",
      description:
        "Working-condition, timecard or wage records are attached to the production tier that supplied them.",
      basis: `Working-condition records are present for ${countWith("WO")} of ${documented.length} documented actors.`,
      tone: "sun",
      status: countWith("WO") > 0 ? "Supported" : "Not documented",
      evidence: evidenceFor("WO"),
    },
    {
      id: "mass-balance",
      title: "Volume and receipt records",
      eyebrow: "Mass balance",
      description:
        "Warehouse receipts and buyer inventory records support a check that the volume received matches the volume claimed.",
      basis: `Receipt or inventory records are present for ${new Set([...evidenceFor("BIR"), ...evidenceFor("WH")].map((item) => item.actorName)).size} of ${documented.length} documented actors.`,
      tone: "forest",
      status: countWith("BIR") + countWith("WH") > 0 ? "Supported" : "Not documented",
      evidence: [...evidenceFor("BIR"), ...evidenceFor("WH")],
    },
  ];

  if (verification) {
    badges.push({
      id: "fibre-verification",
      title: "Fibre authenticity (Oritain)",
      eyebrow: "Independent verification",
      description:
        "An independent fibre authenticity test has been booked for this material. A passport should show a pending state until the result is issued.",
      basis: verification.detail,
      tone: "ocean",
      status: "Pending",
      evidence: [{ actorName: verification.label, documents: verification.documents }],
    });
  }

  return badges;
}

function buildProduct(seed: ProductSeed): DppProduct {
  const stages: DppStage[] = seed.stages.map((stageSeed) => {
    const actors = stageSeed.actorIds.map((actorId) => {
      const actorSeed = seed.actors[actorId];
      if (!actorSeed) throw new Error(`Unknown actor ${actorId} on ${seed.id}`);
      return buildActor(seed.id, actorSeed, stageSeed.id);
    });

    const withDocuments = actors.filter((actor) => actor.documents.length > 0);
    const coverage = withDocuments.length
      ? Math.round(withDocuments.reduce((sum, actor) => sum + actor.coverage, 0) / withDocuments.length)
      : 0;
    const status: StageStatus =
      actors.length === 0
        ? "missing"
        : withDocuments.length === 0
          ? "declared"
          : withDocuments.every((actor) => actor.coverage === 6)
            ? "complete"
            : "partial";

    return { ...stageSeed, actors, coverage, status };
  });

  const documentedActors = stages
    .flatMap((stage) => stage.actors)
    .filter((actor) => actor.documents.length > 0 && actor.covered.length > 0 && !actor.reference);
  const slots = documentedActors.length * 6;
  const present = documentedActors.reduce((sum, actor) => sum + actor.covered.length, 0);
  const coverage = slots ? Math.round((present / slots) * 100) : 0;

  const files = manifest.products[seed.id]?.files ?? [];
  const counts = new Map<DocumentCode, number>();
  for (const file of files) {
    const code = (file.codes[0] ?? "OTHER") as DocumentCode;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const documentsByCode = [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => codeOrder(a.code) - codeOrder(b.code));

  return {
    id: seed.id,
    material: seed.material,
    po: seed.po,
    style: seed.style,
    fiber: seed.fiber,
    orderUnits: seed.orderUnits,
    manufacturer: seed.manufacturer,
    brand: seed.brand,
    factory: seed.factory,
    factoryId: seed.factoryId,
    country: seed.country,
    deliveryCountry: seed.deliveryCountry,
    exFactoryDate: seed.exFactoryDate,
    season: seed.season,
    name: seed.name,
    color: seed.color,
    passportId: seed.passportId,
    lastUpdated: formatManifestDate(manifest.generatedAt),
    composition: [
      {
        percentage: 100,
        material: "Cotton",
        note: seed.compositionNote,
      },
    ],
    stages,
    badges: buildBadges(stages, coverage, seed.verification),
    coverage,
    documentsByCode,
    source: {
      coc: cocDocument(seed.id),
      documents: files.length,
      bundled: files.filter((file) => file.href).length,
      tiers: stages.filter((stage) => stage.actors.length > 0).length,
      actors: documentedActors.length,
      sourcePath: manifest.source,
    },
    verification: seed.verification,
  };
}

const gwydirFarm: ActorSeed = {
  id: "gwydir-farm",
  short: "GCF",
  role: "Farm / Cotton grower",
  name: "Gwydir Cotton Growers Collective",
  country: "Australia",
  city: "Moree, New South Wales",
  address: "Gwydir Valley Way, Moree NSW 2400, Australia",
  coordinates: [149.8417, -29.4644],
  contact: "John Davies · farm-operations@gwydircotton.com.au",
  website: "https://cottonaustralia.com.au",
  note: "MyBMP (Best Management Practices) certified high-yield sustainable upland cotton farm.",
  extraDocuments: [
    {
      code: "CO",
      codes: ["CO"],
      label: "Certificate of origin (Cotton Australia myBMP-2025/09)",
      fileName: "Certificate_of_Origin_Cotton_Australia.pdf",
      bytes: 245100,
      required: true,
    },
    {
      code: "WO",
      codes: ["WO"],
      label: "Fair Farms workplace safety & ethical labour compliance",
      fileName: "FairFarms_Audit_Statement_2025.pdf",
      bytes: 184200,
      required: false,
    },
    {
      code: "NOTE",
      codes: ["NOTE"],
      label: "Farm harvest register & raw seed cotton lot declaration #AU-GW-4401",
      fileName: "Farm_Harvest_Register_GW4401.pdf",
      bytes: 112000,
      required: false,
    },
  ],
};

const namoiGinner: ActorSeed = {
  id: "namoi-ginner",
  short: "NCG",
  role: "Ginner / Baling mill",
  name: "Namoi Cotton Ginning Operations - Wathagar",
  country: "Australia",
  city: "Moree, New South Wales",
  address: "Wathagar Ginning Complex, Wathagar Road, Moree NSW 2400, Australia",
  coordinates: [149.7891, -29.4125],
  contact: "Mark Henderson · ginning-ops@namoicotton.com.au",
  website: "https://www.namoicotton.com.au",
  note: "High-efficiency saw ginning with automated bale sampling, lint cleaning, and HVI classification.",
  extraDocuments: [
    {
      code: "PL",
      codes: ["PL"],
      label: "Bale by bale ginning weight & specification sheet (Lot #NCG-2025-B4)",
      fileName: "Bale_By_Bale_Ginning_Weight_List.pdf",
      bytes: 312000,
      required: true,
    },
    {
      code: "TR",
      codes: ["TR"],
      label: "Ginning transport manifest & consignment dispatch note",
      fileName: "Ginning_Transport_Manifest_TR09.pdf",
      bytes: 198400,
      required: true,
    },
    {
      code: "HVI",
      codes: ["HVI"],
      label: "HVI fibre classification & micronaire test summary (Staple 29.5mm)",
      fileName: "HVI_High_Volume_Instrument_Test.pdf",
      bytes: 276000,
      required: false,
    },
  ],
};

const bcm: ActorSeed = {
  id: "bcm",
  short: "BCM",
  role: "Cotton trader 1",
  name: "Brighann Cotton Marketing Pty Ltd",
  country: "Australia",
  city: "Moree, New South Wales",
  address: "1500 Watercourse Road, Moree NSW 2400, Australia",
  coordinates: [149.5903, -29.438],
  website: "https://brighanncotton.com/",
};

const iih = (inheritedCodes: DocumentCode[], inheritedFrom: string): ActorSeed => ({
  id: "iih",
  short: "IIH",
  role: "Cotton trader 2",
  name: "Innovate International Holdings Limited",
  country: "Hong Kong",
  city: "Kwun Tong, Kowloon",
  address: "Flat/RM 02, 20/F, Westley Square, 48 Hoi Yuen Road, Kwun Tong, Kowloon, Hong Kong",
  coordinates: [114.2232, 22.309],
  inheritedFrom,
  inheritedCodes,
});

const xdd: ActorSeed = {
  id: "xdd",
  short: "XDD",
  role: "Spinner",
  name: "XDD Textile Company Limited",
  country: "Vietnam",
  city: "Quang Ngai",
  address: "No. 1A–6A Street, Vietnam–Singapore Industrial Park, Tinh Phong Commune, Son Tinh District, Quang Ngai Province",
  coordinates: [108.7763, 15.2104],
  contact: "Liu Jian · liujian@xdd-textile.com",
  website: "https://www.xdd-textile.com/",
};

const ptg: ActorSeed = {
  id: "ptg",
  short: "PTG",
  role: "Knitter / weaver",
  name: "PT Golden Tekstil Indonesia",
  country: "Indonesia",
  city: "Kendal, Central Java",
  address: "Kawasan Industri Kendal, Jl. Saptarengga No. 6–8, Desa Wonorejo, Kec. Kaliwungu, Kab. Kendal, Jawa Tengah 51372",
  coordinates: [110.2663, -6.9263],
  contact: "Becky Zheng · becky.zheng@goldenteks.id",
};

const PRODUCT_B: ProductSeed = {
  id: "710954571003",
  material: "710954571003",
  po: "SW-PTG-SP27-31-002-0615",
  style: "710954571",
  fiber: "100% Cotton",
  orderUnits: "1,870 pcs",
  manufacturer: "PT Golden Tekstil Indonesia",
  brand: "Ralph Lauren",
  factory: "PT Samwon Busana Indonesia (Semarang)",
  factoryId: "200040880",
  country: "Indonesia",
  deliveryCountry: "Indonesia",
  exFactoryDate: excelDate(46227),
  season: "COC archive",
  name: "Men's Classic Oxford Cotton Shirt",
  color: "100% cotton · 1,870 pcs",
  passportId: "DPP-710954571003",
  compositionNote:
    "Single-fibre construction. Origin is verified through documented farm harvest records, ginning manifests, and continuous chain-of-custody evidence.",
  stages: [
    {
      id: "farm",
      title: "Farm",
      subtitle: "Cotton origin",
      description:
        "Seed cotton is grown and harvested under myBMP certified sustainable farming practices in the Gwydir Valley, New South Wales, Australia.",
      tone: "lime",
      countryCode: "AU",
      coordinates: [149.8417, -29.4644],
      location: "Moree, New South Wales, Australia",
      actorIds: ["gwydir-farm"],
    },
    {
      id: "ginner",
      title: "Ginner",
      subtitle: "Ginning & baling",
      description:
        "Raw seed cotton is cleaned, ginned to separate lint from seed, and pressed into standard export bales with automated quality tracking.",
      tone: "mint",
      countryCode: "AU",
      coordinates: [149.7891, -29.4125],
      location: "Moree, New South Wales, Australia",
      actorIds: ["namoi-ginner"],
    },
    {
      id: "cotton-trader",
      title: "Cotton trader",
      subtitle: "Trader & export",
      description:
        "Four traders move Australian and US cotton to the spinner. IIH and C&D inherit origin, shipping and customs evidence from the trader that handled the same physical shipment.",
      tone: "sky",
      countryCode: "AU",
      coordinates: [149.5903, -29.438],
      location: "Australia · Hong Kong · Switzerland · USA",
      actorIds: ["bcm", "iih", "ldc", "cnd"],
    },
    {
      id: "spinner",
      title: "Spinner",
      subtitle: "Spinning",
      description:
        "Two spinners convert the cotton bales into yarn. Their invoices, shipping records and customs declarations carry the material identity forward to the knitter/weaver tier.",
      tone: "sand",
      countryCode: "VN",
      coordinates: [108.7763, 15.2104],
      location: "Quang Ngai, Vietnam",
      actorIds: ["xdd", "yvn"],
    },
    {
      id: "knitter-weaver",
      title: "Knitter / weaver",
      subtitle: "Knitting, weaving & finishing",
      description:
        "PT Golden knits or weaves the yarn and finishes the fabric. Working-condition records and buyer inventory records are attached at this tier.",
      tone: "clay",
      countryCode: "ID",
      coordinates: [110.2663, -6.9263],
      location: "Kendal, Indonesia",
      actorIds: ["ptg"],
    },
    {
      id: "garment",
      title: "Garment manufacturer / finished goods",
      subtitle: "Cut, make & trim",
      description:
        "PT Samwon is named as the garment manufacturer in the COC. The archive contains a signed GM statement, but no cutting, sewing or export records.",
      tone: "stone",
      countryCode: "ID",
      coordinates: [110.3529, -7.0115],
      location: "Semarang, Indonesia",
      actorIds: ["samwon"],
    },
  ],
  actors: {
    "gwydir-farm": gwydirFarm,
    "namoi-ginner": namoiGinner,
    bcm,
    iih: iih(["CO", "BL", "CD"], "Cotton trader 1 (BCM)"),
    ldc: {
      id: "ldc",
      short: "LDC",
      role: "Cotton trader 3",
      name: "Louis Dreyfus Company Suisse SA",
      country: "Switzerland",
      city: "Geneva",
      address: "29 route de l'Aéroport, CP 236, 1215 Geneva 15, Switzerland",
      coordinates: [6.1103, 46.2321],
      website: "https://www.ldcom.com/",
    },
    cnd: {
      id: "cnd",
      short: "C&D",
      role: "Cotton trader 4",
      name: "C & D (USA) Inc.",
      country: "USA",
      city: "Oak Brook, IL",
      address: "1100 Jorie Blvd, Suite 173, Oak Brook, IL 60523",
      coordinates: [-87.9444, 41.8435],
      contact: "cotton@usa.chinacnd.com",
      inheritedFrom: "Cotton trader 3 (LDC)",
      inheritedCodes: ["CO", "BL", "CD"],
    },
    xdd: { ...xdd, role: "Spinner 1" },
    yvn: {
      id: "yvn",
      short: "YVN",
      role: "Spinner 2",
      name: "Yulun (Vietnam) Spinning Weaving Dyeing Co., Ltd.",
      country: "Vietnam",
      city: "Ninh Binh",
      address: "Lot F, Di Road, Bao Minh Industrial Park, Lien Minh Commune, Ninh Binh Province",
      coordinates: [106.1059, 20.3515],
      contact: "Hu Yi",
    },
    ptg,
    samwon: {
      id: "samwon",
      short: "SMW",
      role: "Garment manufacturer",
      name: "PT Samwon Busana Indonesia (Semarang)",
      country: "Indonesia",
      city: "Semarang, Central Java",
      coordinates: [110.3529, -7.0115],
      note: "The archive contains a signed GM statement, but no production or export records for the garment tier.",
      extraDocuments: rootDocuments("710954571003", "GM"),
    },
  },
};

const PRODUCT_A: ProductSeed = {
  id: "100070456",
  material: "100070456",
  po: "1569W-FB210260000587",
  style: "710982769",
  fiber: "100% Cotton",
  orderUnits: "—",
  manufacturer: "PT Golden Tekstil Indonesia",
  factory: "PT. Citra Abadi Sejati",
  factoryId: "200040880",
  country: "Indonesia",
  deliveryCountry: "Indonesia",
  exFactoryDate: excelDate(46216),
  season: "COC archive",
  name: "Cotton programme 100070456",
  color: "50X cotton",
  passportId: "DPP-100070456",
  compositionNote:
    "Single-fibre construction. This order uses the same cotton-trader evidence as the 710954571003 passport for the BCM and IIH tiers.",
  stages: [
    {
      id: "farm",
      title: "Farm",
      subtitle: "Cotton origin",
      description:
        "Seed cotton is grown and harvested under myBMP certified sustainable farming practices in the Gwydir Valley, New South Wales, Australia.",
      tone: "lime",
      countryCode: "AU",
      coordinates: [149.8417, -29.4644],
      location: "Moree, New South Wales, Australia",
      actorIds: ["gwydir-farm"],
    },
    {
      id: "ginner",
      title: "Ginner",
      subtitle: "Ginning & baling",
      description:
        "Raw seed cotton is cleaned, ginned to separate lint from seed, and pressed into standard export bales with automated quality tracking.",
      tone: "mint",
      countryCode: "AU",
      coordinates: [149.7891, -29.4125],
      location: "Moree, New South Wales, Australia",
      actorIds: ["namoi-ginner"],
    },
    {
      id: "cotton-trader",
      title: "Cotton trader",
      subtitle: "Trader & export",
      description:
        "BCM supplies Australian cotton and IIH acts as the second trader. IIH inherits origin and shipping evidence from BCM; neither trader has a customs declaration in this set.",
      tone: "sky",
      countryCode: "AU",
      coordinates: [149.5903, -29.438],
      location: "Australia · Hong Kong",
      actorIds: ["bcm", "iih"],
    },
    {
      id: "spinner",
      title: "Spinner",
      subtitle: "Spinning",
      description:
        "XDD in Vietnam spins the cotton into yarn. This is the first tier with a complete six-document set.",
      tone: "sand",
      countryCode: "VN",
      coordinates: [108.7763, 15.2104],
      location: "Quang Ngai, Vietnam",
      actorIds: ["xdd"],
    },
    {
      id: "knitter-weaver",
      title: "Knitter / weaver",
      subtitle: "Knitting & weaving",
      description:
        "PT Golden knits or weaves the yarn in Kendal. The combined invoice/transport/customs file and a separate working-condition record are present.",
      tone: "clay",
      countryCode: "ID",
      coordinates: [110.2663, -6.9263],
      location: "Kendal, Indonesia",
      actorIds: ["ptg"],
    },
    {
      id: "garment",
      title: "Garment manufacturer / finished goods",
      subtitle: "Cut, make & trim",
      description:
        "PT Citra Abadi Sejati is named as the garment factory in the COC, but no production, affidavit or export documents are present.",
      tone: "stone",
      countryCode: "ID",
      coordinates: [110.42, -6.97],
      location: "Semarang, Indonesia",
      actorIds: ["citra"],
    },
  ],
  actors: {
    "gwydir-farm": gwydirFarm,
    "namoi-ginner": namoiGinner,
    bcm,
    iih: iih(["CO", "BL"], "Cotton trader 1 (BCM)"),
    xdd,
    ptg,
    citra: {
      id: "citra",
      short: "CAS",
      role: "Garment manufacturer",
      name: "PT. Citra Abadi Sejati",
      country: "Indonesia",
      city: "Semarang, Central Java",
      note: "Declared in the COC as the garment factory. No production or export documents are present in this dataset.",
    },
  },
};

const upstreamDocuments = manifest.upstream.map((file) => toDocument(file));
const verificationDocuments = manifest.verification.map((file) => toDocument(file));

const PRODUCT_C: ProductSeed = {
  id: "100027482",
  material: "100027482",
  po: "GTIFD20260414-01",
  style: "—",
  fiber: "100% Cotton",
  orderUnits: "—",
  manufacturer: "PT Golden Tekstil Indonesia",
  factory: "PT Ungaran Sari Garment",
  factoryId: "—",
  country: "Indonesia",
  deliveryCountry: "Indonesia",
  exFactoryDate: "—",
  season: "COC archive",
  name: "Cotton programme 100027482",
  color: "Australian & US cotton",
  passportId: "DPP-100027482",
  compositionNote:
    "Single-fibre construction with two cotton origins. A reference set of Australian cotton origin documents is archived separately, but has no explicit PO link to this passport.",
  stages: [
    {
      id: "farm",
      title: "Farm",
      subtitle: "Cotton origin",
      description:
        "Origin-level documents for Australian cotton (certificate of origin, bale-by-bale packing list, import customs) are archived separately. They are shown as a reference because the source set does not link them to this PO.",
      tone: "lime",
      countryCode: "AU",
      coordinates: [149.5903, -29.438],
      location: "Moree, Australia",
      actorIds: ["aus-cotton"],
    },
    {
      id: "ginner",
      title: "Ginner",
      subtitle: "Ginning & baling",
      description:
        "Raw seed cotton is cleaned, ginned to separate lint from seed, and pressed into standard export bales with automated quality tracking.",
      tone: "mint",
      countryCode: "AU",
      coordinates: [149.7891, -29.4125],
      location: "Moree, New South Wales, Australia",
      actorIds: ["namoi-ginner"],
    },
    {
      id: "cotton-trader",
      title: "Cotton trader",
      subtitle: "Trader & export",
      description:
        "Olam and Cargill supply Australian and US cotton. The traders use sales contracts, packing lists, certificates of origin, customs declarations and payment proofs; purchase orders are missing from this archive.",
      tone: "sky",
      countryCode: "SG",
      coordinates: [103.853, 1.2773],
      location: "Singapore · USA",
      actorIds: ["olam-au", "olam-us", "cargill"],
    },
    {
      id: "spinner",
      title: "Spinner",
      subtitle: "Spinning",
      description:
        "PT Spinmillindah and XDD spin the cotton. SII has two shipments with warehouse receipts; XDD has a complete six-document set.",
      tone: "sand",
      countryCode: "ID",
      coordinates: [106.4727, -6.2417],
      location: "Tangerang · Quang Ngai, Indonesia · Vietnam",
      actorIds: ["sii", "xdd"],
    },
    {
      id: "knitter-weaver",
      title: "Knitter / weaver",
      subtitle: "Weaving & finishing",
      description:
        "PT Golden weaves and finishes the fabric. The archive has buyer inventory, warehouse receipts, customs and origin records, but no purchase order or bill of lading for this tier.",
      tone: "clay",
      countryCode: "ID",
      coordinates: [110.2663, -6.9263],
      location: "Kendal, Indonesia",
      actorIds: ["gti"],
    },
    {
      id: "garment",
      title: "Garment manufacturer / finished goods",
      subtitle: "Cut, make & trim",
      description:
        "PT Ungaran Sari Garment is named as the garment factory in the COC. No production or export documents are present.",
      tone: "stone",
      countryCode: "ID",
      coordinates: [110.4037, -7.1325],
      location: "Ungaran, Indonesia",
      actorIds: ["ungaran"],
    },
  ],
  actors: {
    "namoi-ginner": namoiGinner,
    "aus-cotton": {
      id: "aus-cotton",
      short: "AUS",
      role: "Farm / ginner (reference)",
      name: "Australian cotton — AFF00182",
      country: "Australia",
      city: "Moree, New South Wales",
      note: "Origin-level documents archived separately. No explicit PO link to this passport, so this actor is shown as a reference and excluded from chain coverage.",
      reference: true,
      documents: upstreamDocuments,
    },
    "olam-au": {
      id: "olam-au",
      short: "OGA",
      role: "Cotton trader 1",
      name: "Olam Global Agri Pte Ltd",
      country: "Singapore",
      city: "Singapore",
      address: "7 Straits View #20-01, Marina One East Tower, Singapore 018936",
      coordinates: [103.853, 1.2773],
      contact: "ir@olamnet.com · (+65) 6339 4100",
      note: "Folder label: OLAM AUS (Australian cotton).",
    },
    "olam-us": {
      id: "olam-us",
      short: "OGA",
      role: "Cotton trader 2",
      name: "Olam Global Agri Pte Ltd",
      country: "Singapore",
      city: "Singapore",
      address: "7 Straits View #20-01, Marina One East Tower, Singapore 018936",
      coordinates: [103.853, 1.2773],
      contact: "ir@olamnet.com · (+65) 6339 4100",
      note: "Folder label: Cotton Trader 2 (US-origin cotton).",
    },
    cargill: {
      id: "cargill",
      short: "CAR",
      role: "Cotton trader 3",
      name: "Cargill Cotton (Cargill, Inc.)",
      country: "USA",
      city: "Memphis, TN",
      address: "One Commerce Square, Memphis, TN 38103",
      coordinates: [-90.0529, 35.1438],
      contact: "Cotton_us@cargill.com · 901-937-4500",
    },
    sii: {
      id: "sii",
      short: "SII",
      role: "Spinner 1",
      name: "PT Spinmillindah Industry Tbk",
      country: "Indonesia",
      city: "Tangerang, Banten",
      address: "Jl. Aria Jaya Sentika No. 55, Pasir Nangka, Tigaraksa, Kab. Tangerang, Banten 15720",
      coordinates: [106.4727, -6.2417],
      contact: "Elien · elien@spinmill.co.id · (+62) 81286079987",
    },
    xdd: { ...xdd, role: "Spinner 2" },
    gti: {
      id: "gti",
      short: "GTI",
      role: "Weaver / knitter",
      name: "PT Golden Tekstil Indonesia",
      country: "Indonesia",
      city: "Kendal, Central Java",
      address: "Kawasan Industri Kendal, Jl. Saptarengga No. 6–8, Desa Wonorejo, Kec. Kaliwungu, Kab. Kendal, Jawa Tengah 51372",
      coordinates: [110.2663, -6.9263],
      contact: "Becky Zheng · becky.zheng@goldenteks.id",
    },
    ungaran: {
      id: "ungaran",
      short: "USG",
      role: "Garment manufacturer",
      name: "PT Ungaran Sari Garment",
      country: "Indonesia",
      city: "Ungaran, Central Java",
      coordinates: [110.4037, -7.1325],
      note: "Declared in the COC as the garment factory. No production or export documents are present in this dataset.",
    },
  },
  verification: {
    label: "Oritain booking · RMID 100027482",
    status: "Pending",
    detail:
      "An Oritain fibre authenticity test is booked for RMID#100027482 (GTIFD20260414-01). The archive contains the booking tracker but no result certificate, so the passport shows a pending state.",
    documents: verificationDocuments,
  },
};

export const products: DppProduct[] = [
  buildProduct(PRODUCT_B),
  buildProduct(PRODUCT_A),
  buildProduct(PRODUCT_C),
];

export const defaultProduct = products[0];
