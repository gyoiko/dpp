"use client";

import { ArrowLeft, ArrowRight, BadgeCheck, ChevronDown, Factory, FileCheck2, Leaf, MapPin, PackageCheck, Route, ScanLine, Shirt, Sparkles, Sprout, X } from "lucide-react";
import { useState } from "react";
import { DppBadge, JourneyStage, mockProduct } from "@/data/mockProduct";

type Tab = "journey" | "product" | "badges";
const stageIcons = [Sprout, Sparkles, Route, Factory, Shirt, PackageCheck];

function BrandMark() {
  return <div className="brand-mark" aria-label="Golden Tekstil Indonesia"><span className="brand-icon"><Leaf size={19} /></span><span><b>GOLDEN</b><small>TEKSTIL INDONESIA</small></span></div>;
}

function JourneyMap({ activeId, onSelect }: { activeId: string | null; onSelect: (stage: JourneyStage) => void }) {
  return <section className="journey-map" aria-label="Product journey map">
    <div className="map-topline"><span><Route size={14} /> PRODUCT JOURNEY</span><span className="map-live"><i /> 6 locations</span></div>
    <div className="map-canvas">
      <div className="land land-one" /><div className="land land-two" /><div className="land land-three" /><div className="map-grid" />
      <div className="route-line line-one" /><div className="route-line line-two" />
      {mockProduct.journey.map((stage, index) => <button key={stage.id} className={`map-point ${activeId === stage.id ? "active" : ""}`} style={{ left: `${stage.position.x}%`, top: `${stage.position.y}%` }} onClick={() => onSelect(stage)} aria-label={`Open ${stage.title}, ${stage.location}`}><span>{index + 1}</span><em>{stage.location.split(",")[0]}</em></button>)}
    </div>
    <div className="map-caption"><MapPin size={14} /> India → Indonesia <span>•</span> Mock route</div>
  </section>;
}

function Navigation({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [{ id: "journey" as Tab, label: "Journey", Icon: Route }, { id: "product" as Tab, label: "Product", Icon: Shirt }, { id: "badges" as Tab, label: "Badges", Icon: BadgeCheck }];
  return <nav className="tabs" aria-label="Product passport navigation">{items.map(({ id, label, Icon }) => <button key={id} onClick={() => setTab(id)} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined}><Icon size={18} /><span>{label}</span></button>)}</nav>;
}

function StageCard({ stage, index, open, onToggle }: { stage: JourneyStage; index: number; open: boolean; onToggle: () => void }) {
  const Icon = stageIcons[index];
  return <article id={`stage-${stage.id}`} className={`stage ${open ? "open" : ""}`}>
    <div className="timeline-node"><span>{index + 1}</span></div>
    <button className="stage-trigger" onClick={onToggle} aria-expanded={open}>
      <span className={`stage-icon ${stage.tone}`}><Icon size={21} /></span><span className="stage-title"><strong>{stage.title}</strong><small>{stage.subtitle}</small></span><span className="stage-action">{open ? <X size={17} /> : <ChevronDown size={18} />}</span>
    </button>
    {open && <div className="stage-detail">
      <p>{stage.description}</p>
      <div className="facility-row"><span className="facility-avatar">{stage.countryCode}</span><span><small>FACILITY / ORGANISATION</small><strong>{stage.facility}</strong><em><MapPin size={13} /> {stage.location}</em></span></div>
      <dl><div><dt>Material</dt><dd>{stage.material}</dd></div><div><dt>Process</dt><dd>{stage.process}</dd></div><div><dt>Traceability</dt><dd><span className={`status ${stage.status.toLowerCase()}`}>{stage.status}</span></dd></div><div><dt>Evidence</dt><dd>{stage.evidence}</dd></div></dl>
    </div>}
  </article>;
}

function JourneyTab({ openStage, selectStage }: { openStage: string | null; selectStage: (stage: JourneyStage) => void }) {
  return <div className="tab-content">
    <header className="section-intro"><span className="eyebrow">FOLLOW THE MAKING</span><h1>From fibre to finished piece.</h1><p>Explore the deepest documented journey available for this product.</p></header>
    <div className="section-label"><span>Steps & processes</span><span>{mockProduct.journey.length}</span></div>
    <div className="timeline">{mockProduct.journey.map((stage, index) => <StageCard key={stage.id} stage={stage} index={index} open={openStage === stage.id} onToggle={() => selectStage(stage)} />)}</div>
    <div className="transparency-note"><FileCheck2 size={19} /><div><strong>Transparency by design</strong><p>Unknown tiers stay hidden. This prototype does not infer farms, certifications, or impact claims.</p></div></div>
  </div>;
}

function ProductTab() {
  const [openComposition, setOpenComposition] = useState(true);
  return <div className="tab-content product-tab">
    <div className="product-visual"><div className="shirt-art"><span /><i /><b /></div><span className="product-chip">Prototype sample</span><p>GTI / 001</p></div>
    <header className="section-intro product-heading"><span className="eyebrow">PRODUCT PROFILE</span><h1>{mockProduct.name}</h1><p>{mockProduct.style} · {mockProduct.color}</p></header>
    <div className="section-label"><span>Product details</span></div>
    <dl className="product-specs"><div><dt>Style code</dt><dd>{mockProduct.style}</dd></div><div><dt>Season</dt><dd>{mockProduct.season}</dd></div><div><dt>Manufacturer</dt><dd>{mockProduct.manufacturer}</dd></div><div><dt>Made in</dt><dd>{mockProduct.country}</dd></div><div><dt>Order reference</dt><dd>{mockProduct.orderRef}</dd></div></dl>
    <div className="section-label composition-label"><span>Material composition</span><span>1</span></div>
    <button className="composition" onClick={() => setOpenComposition(!openComposition)} aria-expanded={openComposition}><span className="material-swatch"><Sprout size={22} /></span><span><strong>100%</strong><small>Cotton</small></span>{openComposition ? <X size={17} /> : <ChevronDown size={18} />}</button>
    {openComposition && <p className="composition-note">{mockProduct.composition[0].note}</p>}
    <div className="care-card"><Leaf size={22} /><div><strong>Designed for a longer life</strong><p>Wash cool, repair when possible, and pass it on when you are done.</p></div></div>
  </div>;
}

function BadgeDetail({ badge, onBack }: { badge: DppBadge; onBack: () => void }) {
  return <div className="detail-view"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back to badges</button><div className={`badge-hero ${badge.tone}`}><BadgeCheck size={38} /><span>{badge.eyebrow}</span></div><span className="prototype-pill">{badge.status} data</span><h1>{badge.title}</h1><p className="lead">{badge.description}</p><div className="detail-rule" /><span className="eyebrow">WHAT THIS IS BASED ON</span><p>{badge.basis}</p><div className="evidence-box"><FileCheck2 size={21} /><div><strong>Evidence status</strong><p>Demonstration record only — not a public certification or audited claim.</p></div></div></div>;
}

function BadgesTab({ onOpen }: { onOpen: (badge: DppBadge) => void }) {
  return <div className="tab-content"><header className="section-intro"><span className="eyebrow">PRODUCT SIGNALS</span><h1>What the data can support.</h1><p>Clear, evidence-led signals—without overstating what is known.</p></header><div className="prototype-banner"><ScanLine size={18} /><span>All badges below use prototype data</span></div><div className="badge-grid">{mockProduct.badges.map((badge, index) => <button key={badge.id} className="badge-card" onClick={() => onOpen(badge)}><span className={`badge-art ${badge.tone}`}><BadgeCheck size={25} /><i>0{index + 1}</i></span><span className="badge-copy"><small>{badge.eyebrow}</small><strong>{badge.title}</strong><p>{badge.description}</p></span><ArrowRight className="badge-arrow" size={18} /></button>)}</div></div>;
}

export default function DppApp() {
  const [tab, setTab] = useState<Tab>("journey");
  const [openStage, setOpenStage] = useState<string | null>("fabric-manufacturing");
  const [detailBadge, setDetailBadge] = useState<DppBadge | null>(null);
  const selectStage = (stage: JourneyStage, fromMap = false) => { const next = openStage === stage.id && !fromMap ? null : stage.id; setOpenStage(next); if (fromMap) requestAnimationFrame(() => document.getElementById(`stage-${stage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })); };
  const changeTab = (next: Tab) => { setTab(next); setDetailBadge(null); };
  return <main className="page-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><section className="dpp-card"><header className="topbar"><BrandMark /><span className="verified-chip"><BadgeCheck size={14} /> DPP prototype</span></header>{!detailBadge && tab === "journey" && <JourneyMap activeId={openStage} onSelect={(stage) => selectStage(stage, true)} />}{!detailBadge && <Navigation tab={tab} setTab={changeTab} />}<div className="content-panel">{detailBadge ? <BadgeDetail badge={detailBadge} onBack={() => setDetailBadge(null)} /> : tab === "journey" ? <JourneyTab openStage={openStage} selectStage={selectStage} /> : tab === "product" ? <ProductTab /> : <BadgesTab onOpen={setDetailBadge} />}</div><footer><BrandMark /><p>Digital Product Passport · {mockProduct.passportId}</p><small>Mock data for demonstration · Updated {mockProduct.lastUpdated}</small></footer></section><aside className="desktop-note"><span>01</span><p>Scan-ready product transparency</p><i /></aside></main>;
}
