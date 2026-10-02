// Sidequest: locals offer niche experiences (fish with a pro, rebuild a bike with a mechanic); travellers request a spot.
import { useState } from "react";
import { moneyFmt } from "./lib/money";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { useShared } from "./lib/useShared";
import { addDays, prettyDate, todayISO } from "./lib/time";
import { CurrencySelect, Section, ShareBox, Stat, Stats } from "./ui/kit";

const T = "sidequest";
type Exp = { id: string; title: string; hours: number; price: number; max: number; includes: string; meet: string; slots: string[]; about: string };
type Host = { name: string; bio: string; city: string; phone: string; currency: string; langs: string; exps: Exp[] };
type Booking = { id: string; exp: string; slot: string; who: string; people: number; status: "requested" | "confirmed" | "done" | "cancelled"; paid: boolean };
const d = (n: number, t: string) => `${addDays(todayISO(), n)} ${t}`;
const SAMPLE: Host = {
  name: "Hamadi", city: "Kélibia", phone: "", currency: "EUR", langs: "Arabic, French, some English",
  bio: "Fisherman for 30 years, like my father. My boat is small, my coffee is strong, and I know where the fish are in October.",
  exps: [
    { id: "e1", title: "Dawn fishing on a traditional boat", hours: 4, price: 45, max: 4, includes: "Boat, rods, bait, mint tea, and we grill what we catch at the port", meet: "Kélibia fishing port, blue boat named Rym", about: "We leave before sunrise and fish the rocks below the fortress.", slots: [d(3, "05:30"), d(5, "05:30"), d(10, "05:30")] },
    { id: "e2", title: "Mend a fishing net with the old men of the port", hours: 2, price: 20, max: 6, includes: "Tea, a needle of your own to keep", meet: "Café du Port", about: "Learn the knots that have not changed in two hundred years.", slots: [d(4, "16:00"), d(11, "16:00")] },
  ],
};

function Front({ h }: { h: Host }) {
  const [sel, setSel] = useState<{ exp: string; slot: string } | null>(null);
  const [me, setMe] = useState({ name: "", people: "2", note: "" });
  const money = moneyFmt(h.currency);
  const e = h.exps.find(x => x.id === sel?.exp);
  return (
    <div className="stack">
      <section className="panel sq-host"><p className="eyebrow">Local experiences in {h.city}</p><h2>With {h.name}</h2><p>{h.bio}</p><p className="note">Speaks {h.langs}</p></section>
      {h.exps.map(x => (
        <Section key={x.id} title={x.title} aside={<span className="sq-price">{money(x.price)} <span className="note">per person</span></span>}>
          <p>{x.about}</p>
          <p className="note" style={{ marginTop: 6 }}>{x.hours} hours · up to {x.max} people · includes {x.includes.toLowerCase()} · meet at {x.meet}</p>
          <div className="row" style={{ gap: 6, marginTop: 10 }}>{x.slots.filter(s => s.slice(0, 10) >= todayISO()).map(s => <button key={s} className="btn small" aria-pressed={sel?.slot === s && sel.exp === x.id} style={sel?.slot === s && sel.exp === x.id ? { background: "var(--ink)", color: "var(--bg)" } : undefined} onClick={() => setSel({ exp: x.id, slot: s })}>{prettyDate(s.slice(0, 10))} {s.slice(11)}</button>)}</div>
        </Section>))}
      {e && sel && <Section title={`Request: ${e.title}`}>
        <div className="row"><label className="field"><span>Your name</span><input className="input" value={me.name} onChange={x => setMe({ ...me, name: x.target.value })} /></label><label className="field" style={{ flex: "0 0 100px" }}><span>People</span><input className="input num" value={me.people} onChange={x => setMe({ ...me, people: x.target.value })} /></label></div>
        <label className="field" style={{ marginTop: 10 }}><span>Anything the host should know</span><input className="input" value={me.note} onChange={x => setMe({ ...me, note: x.target.value })} /></label>
        <p style={{ marginTop: 10 }}>Total {money(e.price * (parseInt(me.people) || 1))}, paid to {h.name} on the day.</p>
        <a className="btn primary" style={{ marginTop: 10 }} aria-disabled={!me.name.trim()} href={me.name.trim() ? waLink(`Hello ${h.name}, I'd like to book "${e.title}" on ${prettyDate(sel.slot.slice(0, 10))} at ${sel.slot.slice(11)} for ${me.people} people. ${me.note} ${me.name}`, h.phone) : undefined} target="_blank" rel="noreferrer">Send request on WhatsApp</a>
      </Section>}
    </div>
  );
}

export default function Sidequest() {
  const shared = useShared<Host>();
  const [h, setH] = useStored<Host>(T, "host", SAMPLE);
  const [bookings, setBookings] = useStored<Booking[]>(T, "bookings", [{ id: "b1", exp: "e1", slot: SAMPLE.exps[0].slots[0], who: "Julia (Germany)", people: 2, status: "confirmed", paid: false }, { id: "b2", exp: "e2", slot: SAMPLE.exps[1].slots[0], who: "Tom and Ana", people: 2, status: "requested", paid: false }]);
  const [tab, setTab] = useState<"manage" | "preview">("manage");
  const [nb, setNb] = useState({ exp: "e1", slot: "", who: "", people: "1" });
  const css = <style>{`.sq-host h2{font-size:clamp(34px,5vw,54px)}.sq-price{font-family:var(--serif);font-size:24px}.sq-slot{display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}`}</style>;
  if (shared.loading) return <p className="empty-note">Opening…</p>;
  if (shared.data) return <>{css}<Front h={shared.data} /></>;
  const money = moneyFmt(h.currency);
  const setE = (id: string, p: Partial<Exp>) => setH({ ...h, exps: h.exps.map(x => (x.id === id ? { ...x, ...p } : x)) });
  const booked = (exp: string, slot: string) => bookings.filter(b => b.exp === exp && b.slot === slot && b.status !== "cancelled").reduce((a, b) => a + b.people, 0);
  const earned = bookings.filter(b => b.paid).reduce((a, b) => a + (h.exps.find(e => e.id === b.exp)?.price ?? 0) * b.people, 0);

  return (
    <div className="stack">{css}
      <Section title={`${h.name}'s experiences`} aside={<div className="seg-mini"><button aria-pressed={tab === "manage"} onClick={() => setTab("manage")}>Manage</button><button aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Guest view</button></div>}>
        <Stats><Stat value={h.exps.length} label="Experiences" /><Stat value={h.exps.flatMap(e => e.slots).filter(s => s.slice(0, 10) >= todayISO()).length} label="Upcoming dates" /><Stat value={bookings.filter(b => b.status === "requested").length} label="Requests to answer" tone="warn" /><Stat value={money(earned)} label="Earned" tone="good" /></Stats>
      </Section>
      {tab === "preview" ? <Front h={h} /> : <>
        <div className="grid2">
          <Section title="About you">
            <div className="stack" style={{ gap: 10 }}>
              <div className="row"><label className="field"><span>Name</span><input className="input" value={h.name} onChange={e => setH({ ...h, name: e.target.value })} /></label><label className="field"><span>Town</span><input className="input" value={h.city} onChange={e => setH({ ...h, city: e.target.value })} /></label></div>
              <label className="field"><span>A few lines about you</span><textarea className="input" rows={3} value={h.bio} onChange={e => setH({ ...h, bio: e.target.value })} /></label>
              <div className="row"><label className="field"><span>Languages</span><input className="input" value={h.langs} onChange={e => setH({ ...h, langs: e.target.value })} /></label><label className="field"><span>WhatsApp</span><input className="input" value={h.phone} onChange={e => setH({ ...h, phone: e.target.value })} /></label><CurrencySelect id="sq-cur" value={h.currency} onChange={c => setH({ ...h, currency: c })} /></div>
            </div>
          </Section>
          <Section title="Share with travellers"><ShareBox slug={T} data={h} label="Copy my page link" message={`Local experiences in ${h.city} with ${h.name}:`} /><p className="note" style={{ marginTop: 8 }}>Put the QR code in your guesthouse, café or on Instagram.</p></Section>
        </div>
        {h.exps.map(e => (
          <Section key={e.id} title={e.title} aside={<button className="btn ghost small danger" onClick={() => setH({ ...h, exps: h.exps.filter(x => x.id !== e.id) })}>Delete</button>}>
            <div className="row"><label className="field" style={{ flexGrow: 3 }}><span>Title</span><input className="input" value={e.title} onChange={x => setE(e.id, { title: x.target.value })} /></label><label className="field"><span>Hours</span><input className="input num" value={e.hours} onChange={x => setE(e.id, { hours: parseFloat(x.target.value) || 0 })} /></label><label className="field"><span>Price per person</span><input className="input num" value={e.price} onChange={x => setE(e.id, { price: parseFloat(x.target.value) || 0 })} /></label><label className="field"><span>Max people</span><input className="input num" value={e.max} onChange={x => setE(e.id, { max: parseInt(x.target.value) || 1 })} /></label></div>
            <div className="row" style={{ marginTop: 8 }}><label className="field"><span>What happens</span><input className="input" value={e.about} onChange={x => setE(e.id, { about: x.target.value })} /></label><label className="field"><span>Included</span><input className="input" value={e.includes} onChange={x => setE(e.id, { includes: x.target.value })} /></label><label className="field"><span>Meeting point</span><input className="input" value={e.meet} onChange={x => setE(e.id, { meet: x.target.value })} /></label></div>
            <p className="eyebrow" style={{ margin: "12px 0 6px" }}>Dates</p>
            {e.slots.map(s => { const n = booked(e.id, s); return <div key={s} className="sq-slot"><span style={{ width: 150 }}>{prettyDate(s.slice(0, 10))} {s.slice(11)}</span><span className={"pill " + (n >= e.max ? "bad" : n ? "warn" : "")}>{n}/{e.max} booked</span>{bookings.filter(b => b.exp === e.id && b.slot === s && b.status !== "cancelled").map(b => <span key={b.id} className="note">{b.who} ({b.people})</span>)}<button className="btn ghost small danger" style={{ marginLeft: "auto" }} onClick={() => setE(e.id, { slots: e.slots.filter(x => x !== s) })}>×</button></div>; })}
            <form className="row" style={{ marginTop: 8 }} onSubmit={x => { x.preventDefault(); const f = x.currentTarget; const dt = (f.elements.namedItem("d") as HTMLInputElement).value, tm = (f.elements.namedItem("t") as HTMLInputElement).value; if (dt && tm) setE(e.id, { slots: [...e.slots, `${dt} ${tm}`].sort() }); }}><input name="d" type="date" className="input" aria-label="Date" /><input name="t" type="time" className="input" aria-label="Time" defaultValue="09:00" /><button className="btn small" type="submit">Add date</button></form>
          </Section>))}
        <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setH({ ...h, exps: [...h.exps, { id: uid(), title: "New experience", hours: 2, price: 30, max: 4, includes: "", meet: "", about: "", slots: [] }] })}>Add an experience</button>
        <Section title="Bookings">
          {bookings.map(b => <div key={b.id} className="sq-slot"><span style={{ flex: 1 }}><strong>{b.who}</strong> · {h.exps.find(e => e.id === b.exp)?.title} · {prettyDate(b.slot.slice(0, 10))} · {b.people} people</span>
            <select className="input" style={{ width: "auto" }} aria-label="Status" value={b.status} onChange={e => setBookings(bookings.map(x => x.id === b.id ? { ...x, status: e.target.value as Booking["status"] } : x))}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select>
            <label className="check note"><input type="checkbox" checked={b.paid} onChange={e => setBookings(bookings.map(x => x.id === b.id ? { ...x, paid: e.target.checked } : x))} />Paid</label></div>)}
          <form className="row" style={{ marginTop: 10 }} onSubmit={e => { e.preventDefault(); if (!nb.who.trim() || !nb.slot) return; setBookings([...bookings, { id: uid(), exp: nb.exp, slot: nb.slot, who: nb.who.trim(), people: parseInt(nb.people) || 1, status: "requested", paid: false }]); setNb({ ...nb, who: "" }); }}>
            <select className="input" aria-label="Experience" value={nb.exp} onChange={e => setNb({ ...nb, exp: e.target.value, slot: "" })}>{h.exps.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
            <select className="input" aria-label="Date" value={nb.slot} onChange={e => setNb({ ...nb, slot: e.target.value })}><option value="">Date</option>{h.exps.find(x => x.id === nb.exp)?.slots.map(s => <option key={s} value={s}>{prettyDate(s.slice(0, 10))} {s.slice(11)}</option>)}</select>
            <input className="input" style={{ flex: 1 }} aria-label="Who" placeholder="Who" value={nb.who} onChange={e => setNb({ ...nb, who: e.target.value })} /><input className="input num" style={{ width: 70 }} aria-label="People" value={nb.people} onChange={e => setNb({ ...nb, people: e.target.value })} /><button className="btn small" type="submit">Log booking</button>
          </form>
        </Section>
      </>}
    </div>
  );
}
