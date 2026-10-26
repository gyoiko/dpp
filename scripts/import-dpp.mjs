import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOURCE = process.env.DPP_SOURCE ?? "D:\\KERJO\\Project\\DPP";
const PROJECT = process.cwd();
const PUBLIC_DOCS = path.join(PROJECT, "public", "documents");
const MANIFEST_PATH = path.join(PROJECT, "data", "dpp-files.json");

const CODE_SET = new Set([
  "PO", "INV", "CO", "BL", "TR", "CD", "BIR", "WO", "DPL", "PL", "PHYTO",
  "SC", "TT", "INS", "HVI", "WH", "GRN", "PP", "GM", "COC", "AVD", "PKL",
  "CUSTOMS", "COO", "NOTE", "FABRIC_OUT",
]);

const MULTI_WORD = new Map([
  ["WH RECEIVED", "WH"],
  ["FABRIC OUT", "FABRIC_OUT"],
  ["CD IMPORT", "CD"],
  ["TT PROOF", "TT"],
  ["DPL UPDATED", "DPL"],
  ["PAYMENT PROOF", "TT"],
  ["BALE BY BALE PACKING LIST", "PL"],
  ["PACKING LIST", "PL"],
]);

const TOKEN_ALIASES = new Map([
  ["PHYTHO", "PHYTO"],
]);

function parseCodes(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const tokens = base
    .toUpperCase()
    .split(/[_,&()[\]]|\s{2,}/)
    .flatMap((token) => token.split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);

  const joined = tokens.join(" ");
  const codes = new Set();
  for (const [phrase, code] of MULTI_WORD) {
    if (joined.includes(phrase)) codes.add(code);
  }

  for (const token of tokens) {
    const cleaned = token.replace(/[^A-Z0-9 ]+/g, "").trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([A-Z]+)[0-9.]*[A-Z]?$/);
    const candidate = TOKEN_ALIASES.get(match?.[1] ?? cleaned) ?? (match ? match[1] : cleaned.replace(/\s+/g, " "));
    if (CODE_SET.has(candidate)) codes.add(candidate);
  }

  return codes.size ? [...codes] : ["OTHER"];
}

const PRODUCTS = [
  {
    id: "100070456",
    root: path.join(SOURCE, "100070456 (GTI4D20260430-01)", "100070456 (GTI4D20260430-01)", "50X"),
    bundle: "all",
    tiers: [
      { folder: "1.Cotton Trader", actors: { BCM: "bcm", IIH: "iih" } },
      { folder: "2.Spinner", defaultActor: "xdd" },
      { folder: "3.Knitter_Weaver", defaultActor: "ptg" },
    ],
    rootFiles: [
      { relative: "COC Document 100070456.xlsx", codes: ["COC"], label: "COC master document" },
    ],
  },
  {
    id: "710954571003",
    root: path.join(
      SOURCE,
      "PT Samwon Busana Indonesia (Semarang)",
      "PT Samwon Busana Indonesia (Semarang)",
      "Indonesia_SW-PTG-SP27-31-002-0615",
      "710954571003",
    ),
    bundle: "all",
    tiers: [
      { folder: "1.Cotton Trader", actors: { BCM: "bcm", IIH: "iih", LDC: "ldc", "C&D": "cnd" } },
      { folder: "2.Spinner", actors: { XDD: "xdd", YVN: "yvn" } },
      { folder: "3.Knitter_Weaver", defaultActor: "ptg" },
    ],
    rootFiles: [
      { relative: "710954571003_COC Documents.xlsx", codes: ["COC"], label: "COC master document" },
      { relative: "710954571003_GM_SW_Statement Letter.pdf", codes: ["GM"], label: "Garment manufacturer statement" },
    ],
  },
  {
    id: "100027482",
    root: path.join(SOURCE, "Ralph Lauren", "Ralph Lauren", "100027482 (GTIFD20260414-01)"),
    bundle: { actors: new Set(["olam-au", "xdd", "gti"]) },
    tiers: [
      { folder: "Cotton Trader 1", defaultActor: "olam-au" },
      { folder: "Cotton Trader 2", defaultActor: "olam-us" },
      { folder: "Cotton Trader 3", defaultActor: "cargill" },
      { folder: "Spinner 1", defaultActor: "sii" },
      { folder: "Spinner 2", defaultActor: "xdd" },
      { folder: "Weaver", defaultActor: "gti" },
    ],
    rootFiles: [
      { relative: "COC Document 100027482 Update.xlsx", codes: ["COC"], label: "COC master document" },
    ],
  },
];

const UPSTREAM = {
  id: "upstream-aus-cotton",
  label: "Australian cotton origin file",
  root: path.join(SOURCE, "Ralph Lauren", "Ralph Lauren", "100X 澳棉"),
  files: [
    { relative: "澳棉/AFF00182 AUS COTTON.pdf", codes: ["CO"], label: "Australian cotton origin file" },
    { relative: "澳棉/Bale_by_Bale_Packing_List.pdf", codes: ["PL"], label: "Bale-by-bale packing list" },
    { relative: "澳棉/AFF00182 DOCS/COO Australia.pdf", codes: ["CO"], label: "Certificate of origin — Australia" },
    { relative: "澳棉/AFF00182 进口报关单.pdf", codes: ["CD"], label: "Import customs declaration" },
    { relative: "澳棉/AFF00182 入库报关单.pdf", codes: ["CD"], label: "Warehouse entry declaration" },
    { relative: "澳棉/DS-24036 聊城.pdf", codes: ["SC"], label: "Ginning / trade contract" },
    { relative: "澳棉/说明_18-03-2024_1308.pdf", codes: ["NOTE"], label: "Supporting note" },
    { relative: "澳棉/AFF00182 DOCS.pdf", codes: ["NOTE"], label: "Origin document bundle" },
    { relative: "卓茂 GTI/142403738965-正本.pdf", codes: ["INV"], label: "Invoice — original" },
    { relative: "卓茂 GTI/COO.pdf", codes: ["CO"], label: "Certificate of origin" },
    { relative: "卓茂 GTI/CUSTOMS.pdf", codes: ["CD"], label: "Customs declaration" },
    { relative: "卓茂 GTI/INV&PL 505006705.pdf", codes: ["INV", "PL"], label: "Invoice & packing list" },
    { relative: "卓茂 GTI/INV&PL 505110528.pdf", codes: ["INV", "PL"], label: "Invoice & packing list" },
    { relative: "卓茂 GTI/SC HT0377.pdf", codes: ["SC"], label: "Sales contract" },
    { relative: "大生 卓茂/Affidavit.pdf", codes: ["AVD"], label: "Affidavit" },
    { relative: "大生 卓茂/contract 0332.pdf", codes: ["SC"], label: "Sales contract" },
    { relative: "大生 卓茂/INV.pdf", codes: ["INV"], label: "Invoice" },
    { relative: "大生 卓茂/payment proof.png", codes: ["TT"], label: "Payment proof" },
    { relative: "大生 卓茂/PL Detail.pdf", codes: ["PL"], label: "Detailed packing list" },
  ],
};

const VERIFICATION = {
  id: "oritain-100027482",
  label: "Oritain fibre verification",
  files: [
    {
      source: path.join(
        SOURCE,
        "Ralph Lauren",
        "Ralph Lauren",
        "BAU Ralph Lauren Auditing program - Oritain Booking Tracker 2026 - May - PT Golden.xlsx",
      ),
      target: "verification/oritain-booking-tracker-100027482.xlsx",
      codes: ["VERIFICATION"],
      label: "Oritain booking tracker",
    },
  ],
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function actorFor(relativePath, tier) {
  const segments = relativePath.split(path.sep);
  for (const segment of segments) {
    if (tier.actors?.[segment]) return tier.actors[segment];
  }
  return tier.defaultActor ?? null;
}

function shouldBundle(product, actorId) {
  if (product.bundle === "all") return true;
  if (product.bundle?.actors) return product.bundle.actors.has(actorId);
  return false;
}

function hrefFor(relative) {
  return "/documents/" + relative.split(path.sep).map(encodeURIComponent).join("/");
}

async function main() {
  await rm(PUBLIC_DOCS, { recursive: true, force: true });
  await mkdir(PUBLIC_DOCS, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    products: {},
    upstream: [],
    verification: [],
  };

  for (const product of PRODUCTS) {
    const files = [];
    for (const tier of product.tiers) {
      const tierDir = path.join(product.root, tier.folder);
      let absoluteFiles = [];
      try {
        absoluteFiles = await walk(tierDir);
      } catch {
        continue;
      }
      for (const absolute of absoluteFiles) {
        const relativeToTier = path.relative(tierDir, absolute);
        const actorId = actorFor(relativeToTier, tier);
        if (!actorId) continue;
        const bundle = shouldBundle(product, actorId);
        const targetRelative = path.join(product.id, tier.folder, relativeToTier);
        let href = null;
        if (bundle) {
          const target = path.join(PUBLIC_DOCS, targetRelative);
          await mkdir(path.dirname(target), { recursive: true });
          await copyFile(absolute, target);
          href = hrefFor(targetRelative);
        }
        const info = await stat(absolute);
        const sha = crypto.createHash("sha256").update(`${absolute}:${info.size}`).digest("hex").slice(0, 16);
        files.push({
          tier: tier.folder,
          actor: actorId,
          name: path.basename(absolute),
          rel: relativeToTier.split(path.sep).join("/"),
          codes: parseCodes(path.basename(absolute)),
          href,
          bytes: info.size,
          sha,
        });
      }
    }
    for (const rootFile of product.rootFiles ?? []) {
      const absolute = path.join(product.root, rootFile.relative);
      try {
        const info = await stat(absolute);
        const targetRelative = path.join(product.id, path.basename(rootFile.relative));
        const target = path.join(PUBLIC_DOCS, targetRelative);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(absolute, target);
        files.push({
          tier: "root",
          actor: "root",
          name: path.basename(rootFile.relative),
          rel: rootFile.relative,
          codes: rootFile.codes,
          label: rootFile.label,
          href: hrefFor(targetRelative),
          bytes: info.size,
          sha: crypto.createHash("sha256").update(`${absolute}:${info.size}`).digest("hex").slice(0, 16),
        });
      } catch {
        // Optional file missing from the source set.
      }
    }
    manifest.products[product.id] = { files };
  }

  for (const file of UPSTREAM.files) {
    const absolute = path.join(UPSTREAM.root, file.relative);
    try {
      const info = await stat(absolute);
      const targetRelative = path.join("upstream", "aus-cotton", file.relative);
      const target = path.join(PUBLIC_DOCS, targetRelative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(absolute, target);
      manifest.upstream.push({
        id: UPSTREAM.id,
        name: path.basename(file.relative),
        rel: file.relative,
        codes: file.codes,
        label: file.label,
        href: hrefFor(targetRelative),
        bytes: info.size,
      });
    } catch {
      // Skip missing optional upstream document.
    }
  }

  for (const file of VERIFICATION.files) {
    try {
      const info = await stat(file.source);
      const target = path.join(PUBLIC_DOCS, file.target);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(file.source, target);
      manifest.verification.push({
        id: VERIFICATION.id,
        name: path.basename(file.source),
        codes: file.codes,
        label: file.label,
        href: hrefFor(file.target),
        bytes: info.size,
      });
    } catch {
      // Skip missing optional verification document.
    }
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  const total = Object.values(manifest.products).reduce((sum, product) => sum + product.files.length, 0);
  console.log(`Imported ${total} product files, ${manifest.upstream.length} upstream files, ${manifest.verification.length} verification files.`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
