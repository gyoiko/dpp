"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Cog,
  Factory,
  FileCheck2,
  FileText,
  Leaf,
  MapPin,
  Layers,
  Route,
  ScanLine,
  Shirt,
  Sprout,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  type DppActor,
  type DppBadge,
  type DppProduct,
  type DppStage,
} from "@/data/dppData";
import TrackMap, { type MapStage } from "@/components/TrackMap";

type Tab = "journey" | "product" | "badges";
const stageIcons = [Sprout, Factory, Route, Cog, Layers, Shirt];

function badgeStatusClass(status: DppBadge["status"]) {
  return status === "Supported" ? "supported" : status === "Partial" ? "partial" : status === "Pending" ? "pending" : "not-documented";
}

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
  const Icon = stageIcons[index] ?? Route;
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
}: {
  product: DppProduct;
  openStages: Set<string>;
  selectStage: (stage: DppStage) => void;
}) {
  return (
    <div className="tab-content">
      <header className="section-intro">
        <span className="eyebrow">FOLLOW THE MAKING</span>
        <h1>From fibre to finished piece.</h1>
        <p>{product.fiber} · material {product.material} · PO {product.po}. Traced across {product.source.actors} verified supply-chain facilities.</p>
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

function ProductTab({ product }: { product: DppProduct }) {
  const [openComposition, setOpenComposition] = useState(true);
  return (
    <div className="tab-content product-tab">
      <div className="product-visual">
        <div className="shirt-art"><span /><i /><b /></div>
      </div>
      <header className="section-intro product-heading">
        <span className="eyebrow">PRODUCT PROFILE</span>
        <h1>{product.name}</h1>
      </header>
      <div className="section-label"><span>Product details</span></div>
      <dl className="product-specs">
        <div><dt>Material number</dt><dd>{product.material}</dd></div>
        <div><dt>Purchase order</dt><dd>{product.po}</dd></div>
        <div><dt>Style</dt><dd>{product.style}</dd></div>
        <div><dt>Fibre</dt><dd>{product.fiber}</dd></div>
        <div><dt>Order units</dt><dd>{product.orderUnits}</dd></div>
        <div><dt>Supplier</dt><dd>{product.manufacturer}</dd></div>
        <div><dt>Garment factory</dt><dd>{product.factory}</dd></div>
        <div><dt>Factory ID</dt><dd>{product.factoryId}</dd></div>
        <div><dt>Country of origin</dt><dd>{product.country}</dd></div>
        <div><dt>Ex-factory date</dt><dd>{product.exFactoryDate}</dd></div>
        <div><dt>Delivery country</dt><dd>{product.deliveryCountry}</dd></div>
        <div><dt>Brand</dt><dd>Ralph Lauren</dd></div>
      </dl>
      <div className="section-label composition-label"><span>Material composition</span><span>1</span></div>
      <button className="composition" onClick={() => setOpenComposition(!openComposition)} aria-expanded={openComposition}>
        <span className="material-swatch"><Sprout size={22} /></span>
        <span><strong>100%</strong><small>Cotton</small></span>
        {openComposition ? <X size={17} /> : <ChevronDown size={18} />}
      </button>
      {openComposition && <p className="composition-note">{product.composition[0].note}</p>}
      <div className="care-card" style={{ marginTop: "24px" }}>
        <Leaf size={22} />
        <div><strong>Designed for a longer life</strong><p>Wash cool, repair when possible, and pass it on when you are done.</p></div>
      </div>
    </div>
  );
}

function BadgeDetail({ badge, onBack }: { badge: DppBadge; onBack: () => void }) {
  return (
    <div className="detail-view">
      <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back to badges</button>
      <div className={`badge-hero ${badge.tone}`}><BadgeCheck size={38} /><span>{badge.eyebrow}</span></div>
      <span className={`badge-status ${badgeStatusClass(badge.status)}`}>{badge.status}</span>
      <h1>{badge.title}</h1>
      <p className="lead">{badge.description}</p>
      <div className="detail-rule" />
      <span className="eyebrow">WHAT THIS IS BASED ON</span>
      <p>{badge.basis}</p>
      <div className="evidence-list">
        {badge.evidence.map((item, index) => (
          <div className="evidence-actor" key={`${item.actorName}-${index}`}>
            <strong>{item.actorName}</strong>
            <div className="evidence-docs">
              {item.documents.map((document, documentIndex) =>
                document.href ? (
                  <a key={`${document.fileName}-${documentIndex}`} className="evidence-doc" href={document.href} target="_blank" rel="noreferrer">
                    <FileText size={10} /> {document.codes.join("+")}
                  </a>
                ) : (
                  <span key={`${document.fileName}-${documentIndex}`} className="evidence-doc">
                    {document.codes.join("+")} · {document.inherited ? "shared" : "archive"}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="evidence-box">
        <FileCheck2 size={21} />
        <div><strong>Evidence status</strong><p>Derived from the archived COC document set. This is not a third-party certification unless a verification file is listed above.</p></div>
      </div>
    </div>
  );
}

function BadgesTab({ product, onOpen }: { product: DppProduct; onOpen: (badge: DppBadge) => void }) {
  return (
    <div className="tab-content">
      <header className="section-intro">
        <span className="eyebrow">PRODUCT SIGNALS</span>
        <h1>What the evidence can support.</h1>
        <p>Signals are derived from archived documents, not marketing claims. Missing evidence stays visible.</p>
      </header>
      <div className="prototype-banner">
        <ScanLine size={18} />
        <span>{product.badges.filter((badge) => badge.status === "Supported").length} supported · {product.badges.filter((badge) => badge.status === "Partial").length} partial · {product.badges.filter((badge) => badge.status === "Pending").length} pending</span>
      </div>
      <div className="badge-grid">
        {product.badges.map((badge, index) => (
          <button key={badge.id} className="badge-card" onClick={() => onOpen(badge)}>
            <span className={`badge-art ${badge.tone}`}><BadgeCheck size={25} /><i>0{index + 1}</i></span>
            <span className="badge-copy">
              <small>{badge.eyebrow}</small>
              <strong>{badge.title}</strong>
              <p>{badge.description}</p>
              <span className={`badge-status ${badgeStatusClass(badge.status)}`}>{badge.status}</span>
            </span>
            <ArrowRight className="badge-arrow" size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DppApp({ product }: { product: DppProduct }) {
  const first = product.stages.find((stage) => stage.actors.length > 0) ?? product.stages[0];
  const [activeStageId, setActiveStageId] = useState(first.id);
  const [openStages, setOpenStages] = useState<Set<string>>(() => new Set([first.id]));
  const [tab, setTab] = useState<Tab>("journey");
  const [detailBadge, setDetailBadge] = useState<DppBadge | null>(null);

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
        : [{ id: stage.id, label: `${stage.location} (location not documented)`, coordinates: stage.coordinates, verified: false }],
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
        {!detailBadge && tab === "journey" && <TrackMap stages={mapStages} activeId={activeStageId} onSelect={selectStageFromMap} />}
        {!detailBadge && <Navigation tab={tab} setTab={(next) => { setTab(next); setDetailBadge(null); }} />}
        <div className="content-panel">
          {detailBadge ? (
            <BadgeDetail badge={detailBadge} onBack={() => setDetailBadge(null)} />
          ) : tab === "journey" ? (
            <JourneyTab product={product} openStages={openStages} selectStage={selectStage} />
          ) : tab === "product" ? (
            <ProductTab product={product} />
          ) : (
            <BadgesTab product={product} onOpen={setDetailBadge} />
          )}
        </div>
        <footer>
          <BrandMark />
          <p>Digital Product Passport · {product.passportId}</p>
          <small>Imported from COC archive · Updated {product.lastUpdated}</small>
        </footer>
      </section>
    </main>
  );
}
