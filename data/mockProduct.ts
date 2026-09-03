export type JourneyStage = {
  id: string; short: string; title: string; subtitle: string; description: string;
  facility: string; location: string; countryCode: string; material: string; process: string;
  status: "Verified" | "Documented"; evidence: string;
  position: { x: number; y: number };
  tone: "lime" | "mint" | "sky" | "sand" | "clay" | "stone";
};

export type DppBadge = {
  id: string; title: string; eyebrow: string; description: string; basis: string;
  tone: "forest" | "sun" | "ocean"; status: "Prototype";
};

export const mockProduct = {
  name: "Everyday Cotton Overshirt",
  style: "GTI-DPP-001",
  color: "Undyed Sand",
  season: "Core Collection 2026",
  manufacturer: "Golden Tekstil Indonesia",
  country: "Indonesia",
  orderRef: "PO-2608-0142",
  passportId: "DPP-01-2608-0142",
  lastUpdated: "28 August 2026",
  composition: [{
    percentage: 100,
    material: "Cotton",
    note: "Single-fibre construction is used in this prototype to make end-of-life sorting simpler. Origin is shown only to the deepest documented tier.",
  }],
  journey: [
    { id: "raw-material", short: "01", title: "Raw material", subtitle: "Cotton origin", description: "Cotton origin is documented to regional trader level for this prototype. Farm-level identity is not publicly claimed.", facility: "Kutch Cotton Collective", location: "Gujarat", countryCode: "IN", material: "Raw cotton lint", process: "Collection & consolidation", status: "Documented", evidence: "Supplier declaration · mock record", position: { x: 24, y: 44 }, tone: "lime" },
    { id: "cotton-processing", short: "02", title: "Cotton processing", subtitle: "Ginning & baling", description: "Seed cotton is cleaned, separated and compressed into traceable bales before spinning.", facility: "Saurashtra Fibre Works", location: "Rajkot, Gujarat", countryCode: "IN", material: "Cotton bale · CB-8421", process: "Ginning, cleaning & baling", status: "Verified", evidence: "Batch record · mock record", position: { x: 30, y: 49 }, tone: "mint" },
    { id: "yarn-processing", short: "03", title: "Yarn processing", subtitle: "Spinning", description: "Cotton fibres are blended, carded and spun into yarn. Yarn lot identity is carried forward to GTI receiving.", facility: "Nusa Yarn Partners", location: "Semarang, Central Java", countryCode: "ID", material: "Ne 30/1 cotton yarn", process: "Carded ring spinning", status: "Verified", evidence: "Yarn lot YL-260714 · mock record", position: { x: 69, y: 59 }, tone: "sky" },
    { id: "fabric-manufacturing", short: "04", title: "Fabric manufacturing", subtitle: "Weaving & finishing", description: "Yarn is woven and finished at the GTI textile facility. Production data is linked by fabric lot.", facility: "Golden Tekstil Indonesia · Textile Unit", location: "Bandung, West Java", countryCode: "ID", material: "Cotton twill · FL-2608-113", process: "Weaving, washing & finishing", status: "Verified", evidence: "Internal fabric lot · mock record", position: { x: 76, y: 67 }, tone: "sand" },
    { id: "garment-manufacturing", short: "05", title: "Garment manufacturing", subtitle: "Cut, make & trim", description: "Fabric rolls are cut, sewn, inspected and packed into finished overshirts at GTI.", facility: "Golden Tekstil Indonesia · Garment Unit", location: "Bandung, West Java", countryCode: "ID", material: "Finished overshirt", process: "Cutting, sewing, QA & packing", status: "Verified", evidence: "Production order GO-0142 · mock record", position: { x: 80, y: 72 }, tone: "clay" },
    { id: "shipment", short: "06", title: "Shipment", subtitle: "Distribution", description: "Packed products leave the manufacturing site as one documented shipment bound for the customer market.", facility: "Tanjung Priok Logistics Hub", location: "Jakarta, Indonesia", countryCode: "ID", material: "Carton CT-0142-01", process: "Outbound consolidation", status: "Documented", evidence: "Packing list PL-0142 · mock record", position: { x: 86, y: 63 }, tone: "stone" },
  ] satisfies JourneyStage[],
  badges: [
    { id: "traceability", title: "Traceability documented", eyebrow: "Supply chain", description: "Key product lots are connected from cotton processing through shipment in this prototype dataset.", basis: "Based on mock batch, yarn lot, fabric lot and production order records. Farm-level verification is not included.", tone: "forest", status: "Prototype" },
    { id: "mono-material", title: "Single fibre design", eyebrow: "Material", description: "The sample product uses one primary fibre, supporting simpler sorting at end of use.", basis: "Based on the prototype bill of materials: 100% cotton. This is not a third-party certification.", tone: "sun", status: "Prototype" },
    { id: "manufacturing", title: "Responsible production data", eyebrow: "Manufacturing", description: "Fabric and garment production records are represented at facility and lot level.", basis: "Based on mock GTI operational records. No external sustainability certification is claimed.", tone: "ocean", status: "Prototype" },
  ] satisfies DppBadge[],
};
