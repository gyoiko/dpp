"use client";

import {
  BadgeCheck,
  Boxes,
  ChevronDown,
  Cog,
  Droplets,
  Factory,
  FileCheck2,
  Leaf,
  Layers,
  MapPin,
  Route,
  Shirt,
  ShoppingBag,
  Sprout,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DPP_CERTIFICATIONS } from "@/data/certifications";
import {
  type DppActor,
  type DppProduct,
  type DppStage,
} from "@/data/dppData";
import TrackMap, { type MapStage } from "@/components/TrackMap";

type Tab = "journey" | "product" | "badges";
const stageIcons: Record<string, typeof Sprout> = {
  farm: Sprout,
  ginner: Factory,
  trader: Route,
  spinner: Cog,
  yarn_trader: Truck,
  fabric: Layers,
  dyeing: Droplets,
  garment: Shirt,
  customer: ShoppingBag,
  other: Boxes,
};

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Golden Tekstil Indonesia">
      <span className="brand-icon"><Leaf size={19} /></span>
      <span><b>GOLDEN</b><small>TEKSTIL INDONESIA</small></span>
    </div>
  );
}

function Navigation({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [
    { id: "journey" as Tab, label: "Journey", Icon: Route },
    { id: "product" as Tab, label: "Product", Icon: Shirt },
    { id: "badges" as Tab, label: "Badges", Icon: BadgeCheck },
  ];
  return (
    <nav className="tabs" aria-label="Product passport navigation">
      {items.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setTab(id)} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined}>
          <Icon size={18} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function ActorCard({ actor }: { actor: DppActor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`actor-card ${actor.status}`}>
      <button className="actor-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="actor-avatar">{actor.short}</span>
        <span className="actor-copy">
          <small>{actor.role}{actor.reference ? " · reference" : ""}</small>
          <strong>{actor.name}</strong>
          <em><MapPin size={11} /> {actor.city ? `${actor.city}, ` : ""}{actor.country}</em>
        </span>
        {open ? <X size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="actor-detail">
          {actor.address && <p className="actor-address">{actor.address}</p>}
          {actor.contact && <p className="actor-contact">{actor.contact}</p>}
          {actor.website && (
            <p className="actor-contact">
              <a href={actor.website} target="_blank" rel="noreferrer">{actor.website.replace(/^https?:\/\//, "")}</a>
            </p>
          )}
          {actor.note && <p className="actor-address">{actor.note}</p>}
        </div>
      )}
    </div>
  );
}

function StageCard({ stage, index, open, onToggle }: { stage: DppStage; index: number; open: boolean; onToggle: () => void }) {
  const Icon = stageIcons[stage.id] ?? Route;
  return (
    <article id={`stage-${stage.id}`} className={`stage ${open ? "open" : ""}`}>
      <div className="timeline-node"><span>{index + 1}</span></div>
      <button className="stage-trigger" onClick={onToggle} aria-expanded={open}>
        <span className={`stage-icon ${stage.tone}`}><Icon size={21} /></span>
        <span className="stage-title">
          <strong>{stage.title}</strong>
          <small>{stage.subtitle}</small>
        </span>
        <span className="stage-action">{open ? <X size={16} /> : <ChevronDown size={18} />}</span>
      </button>
      <div className="stage-detail-slide" aria-hidden={!open}>
        <div className="stage-detail-clip">
          <div className="stage-detail">
            <p>{stage.description}</p>
            {stage.actors.length ? (
              <div className="actor-list">
                {stage.actors.map((actor) => <ActorCard key={actor.id} actor={actor} />)}
              </div>
            ) : (
              <div className="stage-empty">
                <strong>Not documented in this dataset</strong>
                No supplier facility was claimed for this stage.
              </div>
            )}
            {stage.actors.length > 0 && (
              <div className="stage-summary">
                <span>{stage.actors.length} facility{stage.actors.length > 1 ? "s" : ""} verified</span>
                <span>Chain of Custody</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function JourneyTab({
  product,
  openStages,
  selectStage,
  heading,
  intro,
}: {
  product: DppProduct;
  openStages: Set<string>;
  selectStage: (stage: DppStage) => void;
  heading?: string;
  intro?: string;
}) {
  return (
    <div className="tab-content">
      <header className="section-intro">
        <span className="eyebrow">FOLLOW THE MAKING</span>
        <h1>{heading || "From fibre to finished piece."}</h1>
        <p>
          {intro ||
            `${product.fiber} · material ${product.material} · PO ${product.po}. Traced across ${product.source.actors} verified supply-chain facilities.`}
        </p>
      </header>
      <div className="section-label"><span>Steps &amp; processes</span><span>{product.stages.length}</span></div>
      <div className="timeline">
        {product.stages.map((stage, index) => (
          <StageCard key={stage.id} stage={stage} index={index} open={openStages.has(stage.id)} onToggle={() => selectStage(stage)} />
        ))}
      </div>
      <div className="transparency-note">
        <FileCheck2 size={19} />
        <div>
          <strong>Transparency by design</strong>
          <p>Every facility and partner involved in the transformation of this garment is verified along the chain of custody from fibre to finished goods.</p>
        </div>
      </div>
    </div>
  );
}

function CompositionRow({ item }: { item: DppProduct["composition"][number] }) {
  return (
    <div>
      <div className="composition composition-static">
        <span className="material-swatch"><Sprout size={22} /></span>
        <span><strong>{item.percentage}%</strong><small>{item.material}</small></span>
      </div>
      {item.note ? <p className="composition-note">{item.note}</p> : null}
    </div>
  );
}

function ProductTab({ product }: { product: DppProduct }) {
  return (
    <div className="tab-content product-tab">
      <div className={`product-visual${product.photo ? " has-photo" : ""}`}>
        {product.photo ? (
          <img className="product-photo" src={product.photo} alt={product.name} />
        ) : (
          <div className="shirt-art"><span /><i /><b /></div>
        )}
      </div>
      <header className="section-intro product-heading">
        <span className="eyebrow">PRODUCT PROFILE</span>
        <h1>{product.name}</h1>
      </header>
      <div className="section-label"><span>Material composition</span><span>{product.composition.length}</span></div>
      {product.composition.map((item, index) => (
        <CompositionRow key={`${item.material}-${index}`} item={item} />
      ))}
    </div>
  );
}

function BadgesTab() {
  return (
    <div className="tab-content">
      <header className="section-intro">
        <span className="eyebrow">PRODUCT SIGNALS</span>
        <h1>Certifications on file.</h1>
        <p>Certification marks referenced by this product passport.</p>
      </header>
      <div className="certification-grid">
        {DPP_CERTIFICATIONS.map((certification) => (
          <div key={certification.id} className="certification-card">
            <span className="certification-logo">
              <img src={certification.logo} alt={certification.label} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DppApp({
  product,
  heading,
  intro,
}: {
  product: DppProduct;
  heading?: string;
  intro?: string;
}) {
  const first = product.stages.find((stage) => stage.actors.length > 0) ?? product.stages[0];
  const [activeStageId, setActiveStageId] = useState(first.id);
  const [openStages, setOpenStages] = useState<Set<string>>(() => new Set([first.id]));
  const [tab, setTab] = useState<Tab>("journey");

  const selectStage = useCallback((stage: DppStage, forceOpen = false) => {
    setActiveStageId(stage.id);
    setOpenStages((current) => {
      const next = new Set(current);
      if (forceOpen) next.add(stage.id);
      else if (next.has(stage.id)) next.delete(stage.id);
      else next.add(stage.id);
      return next;
    });
  }, []);

  const selectStageFromMap = useCallback((stage: MapStage) => {
    const match = product.stages.find((item) => item.id === stage.id);
    if (match) selectStage(match, true);
  }, [product, selectStage]);

  const mapStages: MapStage[] = useMemo(() => product.stages.map((stage, index) => {
    const located = stage.actors.filter(
      (actor): actor is DppActor & { coordinates: [number, number] } => Boolean(actor.coordinates),
    );
    return {
      id: stage.id,
      step: index + 1,
      title: stage.title,
      location: stage.location,
      coordinates: stage.coordinates,
      documented: stage.actors.length > 0,
      points: located.length
        ? located.map((actor) => ({
            id: actor.id,
            label: `${actor.role} · ${actor.name}`,
            coordinates: actor.coordinates,
            verified: true,
          }))
        : [],
    };
  }), [product]);

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="dpp-card">
        <header className="topbar">
          <BrandMark />
        </header>
        {tab === "journey" && <TrackMap stages={mapStages} activeId={activeStageId} onSelect={selectStageFromMap} />}
        <Navigation tab={tab} setTab={setTab} />
        <div className="content-panel">
          {tab === "journey" ? (
            <JourneyTab product={product} openStages={openStages} selectStage={selectStage} heading={heading} intro={intro} />
          ) : tab === "product" ? (
            <ProductTab product={product} />
          ) : (
            <BadgesTab />
          )}
        </div>
        <footer>
          <BrandMark />
          <p>Digital Product Passport · {product.passportId}</p>
          <small>Source: {product.source.sourcePath} · Updated {product.lastUpdated}</small>
        </footer>
      </section>
    </main>
  );
}
