import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet, Users, ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Check,
  AlertCircle, ChevronRight, Pencil, X, Send, PiggyBank,
  Repeat, CalendarClock, LayoutGrid, LogOut,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "./supabaseClient";

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtGBP = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const daysUntil = (iso) => {
  if (!iso) return Infinity;
  const d = new Date(iso + "T00:00:00");
  const t = new Date(todayISO() + "T00:00:00");
  return Math.round((d - t) / 86400000);
};

const addInterval = (dateStr, frequency) => {
  const d = new Date(dateStr + "T00:00:00");
  switch (frequency) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "fortnightly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
};

const isOverdue = (item) => item.status !== "paid" && item.dueDate && item.dueDate < todayISO();

const FREQ_LABEL = {
  weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly",
  quarterly: "Quarterly", yearly: "Yearly",
};

const emptyData = () => ({
  balance: 0,
  balanceUpdated: todayISO(),
  titheAccrued: 0,
  clients: [],
  income: [],
  expenses: [],
  tithePayments: [],
});

/* ---------------------------------------------------------------------- */
/* Supabase load / save                                                    */
/* ---------------------------------------------------------------------- */

async function loadRemoteData(userId) {
  const { data, error } = await supabase
    .from("finance_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function saveRemoteData(userId, payload) {
  const { error } = await supabase
    .from("finance_data")
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

/* ---------------------------------------------------------------------- */
/* Root component                                                          */
/* ---------------------------------------------------------------------- */

export default function FinanceTracker({ session }) {
  const userId = session.user.id;
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState("overview");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const remote = await loadRemoteData(userId);
        setData(remote ? { ...emptyData(), ...remote } : emptyData());
      } catch (e) {
        console.error("Load failed", e);
        setData(emptyData());
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!loaded || !data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveRemoteData(userId, data);
        setSaveError("");
      } catch (e) {
        console.error("Save failed", e);
        setSaveError("Couldn't save — check your connection.");
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded, userId]);

  if (!loaded || !data) {
    return (
      <div style={styles.loadingWrap}>
        <Fonts />
        <div style={styles.loadingCard}>
          <Wallet size={22} style={{ opacity: 0.5 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 0.4 }}>
            OPENING LEDGER…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fin-app" style={styles.app}>
      <Fonts />
      <Sidebar tab={tab} setTab={setTab} onReset={() => resetAll(userId, setData)} email={session.user.email} />
      <main style={styles.main}>
        <TopBar saveError={saveError} />
        <div style={styles.content}>
          {tab === "overview" && <Overview data={data} setData={setData} setTab={setTab} />}
          {tab === "clients" && <Clients data={data} setData={setData} />}
          {tab === "income" && <Ledger kind="income" data={data} setData={setData} />}
          {tab === "expenses" && <Ledger kind="expenses" data={data} setData={setData} />}
        </div>
      </main>
    </div>
  );
}

async function resetAll(userId, setData) {
  if (!window.confirm("Reset all finance data? This can't be undone.")) return;
  try {
    await saveRemoteData(userId, emptyData());
  } catch (e) {
    console.error(e);
  }
  setData(emptyData());
}

/* ---------------------------------------------------------------------- */
/* Fonts / tokens                                                          */
/* ---------------------------------------------------------------------- */

function Fonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

      .fin-app {
        --paper: #F3F4EE;
        --paper-raised: #FBFBF8;
        --ink: #16211A;
        --ink-soft: #4B554E;
        --line: #D8D9CE;
        --pine: #2F4D36;
        --pine-deep: #1D3323;
        --gold: #A9793A;
        --gold-soft: #F1E4CC;
        --brick: #A6432E;
        --brick-soft: #F3DCD5;
        --slate: #435568;
        --slate-soft: #DDE3E9;
        --font-display: 'Fraunces', serif;
        --font-body: 'IBM Plex Sans', sans-serif;
        --font-mono: 'IBM Plex Mono', monospace;
      }
      .fin-app * { box-sizing: border-box; }
      .fin-btn { cursor: pointer; transition: all .15s ease; }
      .fin-btn:hover { transform: translateY(-1px); }
      .fin-btn:active { transform: translateY(0); }
      .fin-row:hover { background: var(--paper); }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--pine); outline-offset: 1px; }
      .fin-card { transition: box-shadow .15s ease; }
    `}</style>
  );
}

/* ---------------------------------------------------------------------- */
/* Layout: Sidebar / TopBar                                                */
/* ---------------------------------------------------------------------- */

function Sidebar({ tab, setTab, onReset, email }) {
  const items = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "clients", label: "Clients", icon: Users },
    { id: "income", label: "Income", icon: ArrowDownCircle },
    { id: "expenses", label: "Expenses", icon: ArrowUpCircle },
  ];
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandMark}>
        <div style={styles.brandGlyph}>£</div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "#F3F4EE" }}>
            Ledger
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, color: "#8FA391" }}>
            PERSONAL FINANCES
          </div>
        </div>
      </div>

      <nav style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="fin-btn"
              style={{
                ...styles.navItem,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                color: active ? "#F3F4EE" : "#9AA69C",
                fontWeight: active ? 600 : 400,
                borderLeft: active ? "2px solid #C9A15E" : "2px solid transparent",
              }}
            >
              <Icon size={16} />
              {it.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#8FA391", marginBottom: 8, wordBreak: "break-all" }}>
          {email}
        </div>
        <button className="fin-btn" onClick={onReset} style={styles.resetBtn}>
          Reset all data
        </button>
        <button className="fin-btn" onClick={() => supabase.auth.signOut()} style={{ ...styles.resetBtn, marginTop: 8, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function TopBar({ saveError }) {
  return (
    <div style={styles.topbar}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)" }}>Personal &amp; client finances</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: saveError ? "var(--brick)" : "var(--ink-soft)" }}>
        {saveError || new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Overview                                                                 */
/* ---------------------------------------------------------------------- */

function Overview({ data, setData, setTab }) {
  const income = data.income;
  const expenses = data.expenses;

  const within = (item, days) => {
    if (!item.dueDate) return false;
    return daysUntil(item.dueDate) <= days;
  };

  const upcoming30Income = income.filter((i) => i.status !== "paid" && within(i, 30));
  const upcoming30Expenses = expenses.filter((e) => e.status !== "paid" && within(e, 30));
  const sum = (arr) => arr.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const expectedIncome30 = sum(upcoming30Income);
  const expectedExpenses30 = sum(upcoming30Expenses);
  const net30 = expectedIncome30 - expectedExpenses30;
  const projected = (Number(data.balance) || 0) + net30;

  const overdueItems = [...income, ...expenses].filter(isOverdue);

  const followUps = data.clients
    .filter((c) => c.followUpDate)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  const upcomingCombined = [...income, ...expenses]
    .filter((i) => i.status !== "paid" && i.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const chartData = useMemo(() => buildMonthly(income, expenses), [data]);

  const titheOwed = (Number(data.titheAccrued) || 0) - sum(data.tithePayments);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <LedgerTape data={data} setData={setData} projected={projected} net30={net30} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatCard icon={ArrowDownCircle} label="Expected income · 30 days" value={fmtGBP(expectedIncome30)} sub={`${upcoming30Income.length} item${upcoming30Income.length === 1 ? "" : "s"}`} tone="pine" />
        <StatCard icon={ArrowUpCircle} label="Expected expenses · 30 days" value={fmtGBP(expectedExpenses30)} sub={`${upcoming30Expenses.length} item${upcoming30Expenses.length === 1 ? "" : "s"}`} tone="brick" />
        <StatCard icon={net30 >= 0 ? ArrowDownCircle : ArrowUpCircle} label="Net · 30 days" value={(net30 >= 0 ? "+" : "") + fmtGBP(net30)} sub="income minus expenses" tone={net30 >= 0 ? "pine" : "brick"} />
      </div>

      <TitheCard data={data} setData={setData} owed={titheOwed} />

      <div style={{ ...styles.card, padding: "18px 20px 8px" }}>
        <div style={styles.cardHeader}>Income vs expenses — next 6 months</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E4D9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: "#4B554E" }} axisLine={{ stroke: "#D8D9CE" }} tickLine={false} />
              <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 10, fill: "#4B554E" }} axisLine={false} tickLine={false} width={46} />
              <Tooltip formatter={(v) => fmtGBP(v)} contentStyle={{ fontFamily: "IBM Plex Sans", fontSize: 12, borderRadius: 8, border: "1px solid #D8D9CE" }} />
              <Legend wrapperStyle={{ fontFamily: "IBM Plex Sans", fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="var(--pine)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#A6432E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>Upcoming</div>
          {upcomingCombined.length === 0 && <EmptyRow text="Nothing due. You're clear." />}
          {upcomingCombined.map((item) => (
            <div key={item.id} style={styles.miniRow}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.description || "Untitled"}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>
                  {fmtDateShort(item.dueDate)} · {isOverdue(item) ? "overdue" : `in ${Math.max(daysUntil(item.dueDate), 0)}d`}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13.5 }}>{fmtGBP(item.amount)}</div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>Client follow-ups</div>
          {followUps.length === 0 && <EmptyRow text="No follow-ups scheduled." />}
          {followUps.map((c) => {
            const overdue = c.followUpDate < todayISO();
            return (
              <div key={c.id} style={styles.miniRow}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{c.followUpNote || "—"}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: overdue ? "var(--brick)" : "var(--ink-soft)", whiteSpace: "nowrap" }}>
                  {overdue ? "due" : ""} {fmtDateShort(c.followUpDate)}
                </div>
              </div>
            );
          })}
          <button className="fin-btn" onClick={() => setTab("clients")} style={styles.linkBtn}>
            Manage clients <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {overdueItems.length > 0 && (
        <div style={{ ...styles.card, borderColor: "var(--brick)", background: "var(--brick-soft)" }}>
          <div style={{ ...styles.cardHeader, color: "var(--brick)" }}>
            <AlertCircle size={14} style={{ marginRight: 6, marginBottom: -2 }} />
            {overdueItems.length} overdue item{overdueItems.length === 1 ? "" : "s"}
          </div>
          {overdueItems.slice(0, 5).map((item) => (
            <div key={item.id} style={styles.miniRow}>
              <span style={{ fontSize: 13 }}>{item.description}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{fmtGBP(item.amount)} · was due {fmtDateShort(item.dueDate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildMonthly(income, expenses) {
  const months = [];
  const base = new Date();
  base.setDate(1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), income: 0, expenses: 0 });
  }
  const bucket = (arr, field) => {
    arr.forEach((item) => {
      if (!item.dueDate) return;
      const d = new Date(item.dueDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((mm) => mm.key === key);
      if (m) m[field] += Number(item.amount) || 0;
    });
  };
  bucket(income, "income");
  bucket(expenses, "expenses");
  return months;
}

function LedgerTape({ data, setData, projected, net30 }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(data.balance);

  const save = () => {
    setData((d) => ({ ...d, balance: Number(val) || 0, balanceUpdated: todayISO() }));
    setEditing(false);
  };

  return (
    <div style={{ ...styles.tape, borderColor: "var(--pine)" }}>
      <div style={styles.tapePerforation} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1.2, color: "var(--ink-soft)", textTransform: "uppercase" }}>
            Current balance · updated {fmtDateShort(data.balanceUpdated)}
          </div>
          {!editing ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
                {fmtGBP(data.balance)}
              </div>
              <button className="fin-btn" onClick={() => { setVal(data.balance); setEditing(true); }} style={styles.iconGhost}>
                <Pencil size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <input autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} style={{ ...styles.input, fontFamily: "var(--font-mono)", fontSize: 20, width: 160 }} />
              <button className="fin-btn" onClick={save} style={styles.iconGhost}><Check size={16} /></button>
              <button className="fin-btn" onClick={() => setEditing(false)} style={styles.iconGhost}><X size={16} /></button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1.2, color: "var(--ink-soft)", textTransform: "uppercase" }}>
            Projected in 30 days
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, marginTop: 4, color: net30 >= 0 ? "var(--pine)" : "var(--brick)" }}>
            {fmtGBP(projected)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>
            {net30 >= 0 ? "▲" : "▼"} {fmtGBP(Math.abs(net30))} net
          </div>
        </div>
      </div>
    </div>
  );
}

function TitheCard({ data, setData, owed }) {
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const log = () => {
    if (!amount || Number(amount) <= 0) return;
    setData((d) => ({ ...d, tithePayments: [...d.tithePayments, { id: uid(), amount: Number(amount), date: todayISO() }] }));
    setAmount("");
    setOpen(false);
  };

  return (
    <div style={{ ...styles.card, borderColor: "var(--gold)", background: "var(--gold-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PiggyBank size={18} color="var(--gold)" />
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, color: "#7A5A28", textTransform: "uppercase" }}>
              Tithe reserve · 10% of paid client income
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600 }}>
              {fmtGBP(Math.max(owed, 0))} outstanding
            </div>
          </div>
        </div>
        {!open ? (
          <button className="fin-btn" onClick={() => setOpen(true)} style={styles.secondaryBtn}>Log a tithe payment</button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input autoFocus type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && log()} style={{ ...styles.input, width: 110 }} />
            <button className="fin-btn" onClick={log} style={styles.primaryBtn}>Log</button>
            <button className="fin-btn" onClick={() => setOpen(false)} style={styles.iconGhost}><X size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }) {
  const color = tone === "pine" ? "var(--pine)" : tone === "brick" ? "var(--brick)" : "var(--slate)";
  return (
    <div className="fin-card" style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
        <Icon size={15} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-soft)" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <div style={{ padding: "14px 0", fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>{text}</div>;
}

/* ---------------------------------------------------------------------- */
/* Clients                                                                  */
/* ---------------------------------------------------------------------- */

function Clients({ data, setData }) {
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("all"); // all | prospect | active

  const addOrUpdate = (client) => {
    setData((d) => {
      const exists = d.clients.some((c) => c.id === client.id);
      return { ...d, clients: exists ? d.clients.map((c) => (c.id === client.id ? client : c)) : [...d.clients, client] };
    });
    setForm(null);
  };

  const remove = (id) => {
    if (!window.confirm("Delete this client? Linked income entries will stay but lose the client link.")) return;
    setData((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== id),
      income: d.income.map((i) => (i.clientId === id ? { ...i, clientId: null } : i)),
    }));
  };

  const visibleClients = data.clients.filter((c) => {
    const status = c.status || "active";
    return filter === "all" || status === filter;
  });

  const prospectCount = data.clients.filter((c) => (c.status || "active") === "prospect").length;
  const activeCount = data.clients.filter((c) => (c.status || "active") === "active").length;

  return (
    <div>
      <SectionHeader
        title="Clients"
        sub="Freelance clients, compensation, and where things stand"
        action={<button className="fin-btn" style={styles.primaryBtn} onClick={() => setForm({})}><Plus size={14} /> Add client</button>}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <FilterPill label={`All (${data.clients.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label={`Prospects (${prospectCount})`} active={filter === "prospect"} onClick={() => setFilter("prospect")} />
        <FilterPill label={`Active (${activeCount})`} active={filter === "active"} onClick={() => setFilter("active")} />
      </div>

      {form && <ClientForm initial={form} onSave={addOrUpdate} onCancel={() => setForm(null)} />}

      {visibleClients.length === 0 && !form && <div style={styles.card}><EmptyRow text="Nothing here yet." /></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginTop: 14 }}>
        {visibleClients.map((c) => {
          const overdue = c.followUpDate && c.followUpDate < todayISO();
          const linkedIncome = data.income.filter((i) => i.clientId === c.id);
          const status = c.status || "active";
          return (
            <div key={c.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>{c.name}</div>
                    <StatusPill status={status} />
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--pine)", marginTop: 2 }}>
                    {fmtGBP(c.compensationAmount)} · {FREQ_LABEL[c.frequency] || "One-off"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="fin-btn" style={styles.iconGhost} onClick={() => setForm(c)}><Pencil size={14} /></button>
                  <button className="fin-btn" style={styles.iconGhost} onClick={() => remove(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>

              {c.notes && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>{c.notes}</div>}

              {c.followUpDate && (
                <div style={{ marginTop: 10, fontSize: 12.5, padding: "6px 10px", borderRadius: 6, background: overdue ? "var(--brick-soft)" : "var(--paper)", color: overdue ? "var(--brick)" : "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
                  <CalendarClock size={13} />
                  Follow up {fmtDate(c.followUpDate)}{c.followUpNote ? ` — ${c.followUpNote}` : ""}
                </div>
              )}

              {linkedIncome.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>
                  {linkedIncome.length} linked income item{linkedIncome.length === 1 ? "" : "s"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      className="fin-btn"
      onClick={onClick}
      style={{
        fontSize: 12.5, fontFamily: "var(--font-body)", padding: "6px 12px", borderRadius: 20,
        border: "1px solid var(--line)", background: active ? "var(--pine)" : "var(--paper-raised)",
        color: active ? "#fff" : "var(--ink-soft)",
      }}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }) {
  const isProspect = status === "prospect";
  return (
    <span style={{
      fontSize: 10.5, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 20,
      background: isProspect ? "var(--gold-soft)" : "#DCEBDD",
      color: isProspect ? "#7A5A28" : "var(--pine-deep)",
    }}>
      {isProspect ? "Prospect" : "Active"}
    </span>
  );
}

function ClientForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || "");
  const [amount, setAmount] = useState(initial.compensationAmount ?? "");
  const [frequency, setFrequency] = useState(initial.frequency || "monthly");
  const [notes, setNotes] = useState(initial.notes || "");
  const [followUpDate, setFollowUpDate] = useState(initial.followUpDate || "");
  const [followUpNote, setFollowUpNote] = useState(initial.followUpNote || "");
  const [status, setStatus] = useState(initial.status || "prospect");

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: initial.id || uid(),
      name: name.trim(),
      compensationAmount: Number(amount) || 0,
      frequency,
      notes: notes.trim(),
      followUpDate,
      followUpNote: followUpNote.trim(),
      status,
    });
  };

  return (
    <div style={{ ...styles.card, marginBottom: 14, background: "var(--paper-raised)" }}>
      <div style={styles.formGrid}>
        <Field label="Client name"><input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Refresh Health Club" /></Field>
        <Field label="Status">
          <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
          </select>
        </Field>
        <Field label="Compensation (£)"><input type="number" style={styles.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Frequency">
          <select style={styles.input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="one-off">One-off</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Follow-up date"><input type="date" style={styles.input} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></Field>
        <Field label="Follow-up note" span={2}><input style={styles.input} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="e.g. call early September" /></Field>
        <Field label="Notes" span={2}><textarea style={{ ...styles.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Retainer details, contacts, anything worth remembering" /></Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="fin-btn" style={styles.primaryBtn} onClick={save}>Save client</button>
        <button className="fin-btn" style={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Income / Expenses shared ledger                                         */
/* ---------------------------------------------------------------------- */

function Ledger({ kind, data, setData }) {
  const [form, setForm] = useState(null);
  const isIncome = kind === "income";
  const items = data[kind].slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const addOrUpdate = (item) => {
    setData((d) => {
      const exists = d[kind].some((i) => i.id === item.id);
      return { ...d, [kind]: exists ? d[kind].map((i) => (i.id === item.id ? item : i)) : [...d[kind], item] };
    });
    setForm(null);
  };

  const remove = (id) => setData((d) => ({ ...d, [kind]: d[kind].filter((i) => i.id !== id) }));

  const setStatus = (item, status) => {
    setData((d) => {
      let next = { ...item, status };
      let titheAccrued = d.titheAccrued;
      if (isIncome && status === "paid" && item.tithe) {
        titheAccrued = (Number(d.titheAccrued) || 0) + Number(item.amount) * 0.1;
      }
      if (item.type === "recurring" && status === "paid") {
        next = { ...next, status: "pending", dueDate: addInterval(item.dueDate, item.frequency) };
      }
      return { ...d, titheAccrued, [kind]: d[kind].map((i) => (i.id === item.id ? next : i)) };
    });
  };

  return (
    <div>
      <SectionHeader
        title={isIncome ? "Income" : "Expenses"}
        sub="Recurring or standalone"
        action={<button className="fin-btn" style={styles.primaryBtn} onClick={() => setForm({})}><Plus size={14} /> Add {isIncome ? "income" : "expense"}</button>}
      />

      {form && <ItemForm kind={kind} initial={form} clients={data.clients} onSave={addOrUpdate} onCancel={() => setForm(null)} />}

      <div style={{ ...styles.card, padding: 0, overflow: "hidden", marginTop: 14 }}>
        {items.length === 0 && <div style={{ padding: 18 }}><EmptyRow text={`No ${isIncome ? "income" : "expenses"} yet.`} /></div>}
        {items.map((item) => {
          const client = data.clients.find((c) => c.id === item.clientId);
          const overdue = isOverdue(item);
          return (
            <div key={item.id} className="fin-row" style={styles.ledgerRow}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.description || "Untitled"}</span>
                  {item.type === "recurring" && <span style={styles.pill}><Repeat size={10} /> {FREQ_LABEL[item.frequency]}</span>}
                  {client && <span style={{ ...styles.pill, color: "var(--pine)" }}>{client.name}</span>}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: overdue ? "var(--brick)" : "var(--ink-soft)" }}>
                  {overdue ? "Overdue · " : ""}Due {fmtDate(item.dueDate)}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 15 }}>{fmtGBP(item.amount)}</span>
                <StatusBadge status={overdue ? "overdue" : item.status} />
                <div style={{ display: "flex", gap: 4 }}>
                  {isIncome && item.status === "pending" && (
                    <button className="fin-btn" style={styles.iconGhost} title="Mark sent" onClick={() => setStatus(item, "sent")}><Send size={13} /></button>
                  )}
                  {item.status !== "paid" && (
                    <button className="fin-btn" style={styles.iconGhost} title="Mark paid" onClick={() => setStatus(item, "paid")}><Check size={14} /></button>
                  )}
                  <button className="fin-btn" style={styles.iconGhost} title="Edit" onClick={() => setForm(item)}><Pencil size={13} /></button>
                  <button className="fin-btn" style={styles.iconGhost} title="Delete" onClick={() => remove(item.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending", bg: "var(--slate-soft)", fg: "var(--slate)" },
    sent: { label: "Sent", bg: "var(--gold-soft)", fg: "#7A5A28" },
    paid: { label: "Paid", bg: "#DCEBDD", fg: "var(--pine-deep)" },
    overdue: { label: "Overdue", bg: "var(--brick-soft)", fg: "var(--brick)" },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function ItemForm({ kind, initial, clients, onSave, onCancel }) {
  const isIncome = kind === "income";
  const [description, setDescription] = useState(initial.description || "");
  const [amount, setAmount] = useState(initial.amount ?? "");
  const [type, setType] = useState(initial.type || "standalone");
  const [frequency, setFrequency] = useState(initial.frequency || "monthly");
  const [dueDate, setDueDate] = useState(initial.dueDate || todayISO());
  const [clientId, setClientId] = useState(initial.clientId || "");
  const [tithe, setTithe] = useState(initial.tithe ?? true);
  const [category, setCategory] = useState(initial.category || "");

  const save = () => {
    if (!description.trim() || !amount) return;
    onSave({
      id: initial.id || uid(),
      description: description.trim(),
      amount: Number(amount),
      type,
      frequency: type === "recurring" ? frequency : null,
      dueDate,
      status: initial.status || "pending",
      clientId: isIncome ? (clientId || null) : undefined,
      tithe: isIncome ? !!(clientId && tithe) : false,
      category: !isIncome ? category.trim() : undefined,
    });
  };

  return (
    <div style={{ ...styles.card, marginBottom: 14, background: "var(--paper-raised)" }}>
      <div style={styles.formGrid}>
        <Field label="Description" span={2}><input style={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isIncome ? "e.g. Refresh Health Club retainer" : "e.g. Adobe subscription"} /></Field>
        <Field label="Amount (£)"><input type="number" style={styles.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>

        <Field label="Type">
          <select style={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="standalone">Standalone</option>
            <option value="recurring">Recurring</option>
          </select>
        </Field>
        {type === "recurring" && (
          <Field label="Frequency">
            <select style={styles.input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
        )}
        <Field label={type === "recurring" ? "Next due date" : "Due date"}>
          <input type="date" style={styles.input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        {isIncome && (
          <Field label="Client (optional)">
            <select style={styles.input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {!isIncome && <Field label="Category"><input style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. tools, travel, materials" /></Field>}

        {isIncome && clientId && (
          <Field label="Tithe">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, height: 38 }}>
              <input type="checkbox" checked={tithe} onChange={(e) => setTithe(e.target.checked)} />
              Set aside 10% when paid
            </label>
          </Field>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="fin-btn" style={styles.primaryBtn} onClick={save}>Save</button>
        <button className="fin-btn" style={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Small shared bits                                                        */
/* ---------------------------------------------------------------------- */

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : "span 1" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Styles                                                                    */
/* ---------------------------------------------------------------------- */

const styles = {
  app: { display: "flex", minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--font-body)" },
  loadingWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F3F4EE" },
  loadingCard: { display: "flex", alignItems: "center", gap: 10, color: "#4B554E" },
  sidebar: { width: 210, background: "var(--pine-deep)", padding: "22px 16px", display: "flex", flexDirection: "column", flexShrink: 0 },
  brandMark: { display: "flex", alignItems: "center", gap: 10 },
  brandGlyph: { width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#C9A15E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 6, border: "none", fontFamily: "var(--font-body)", fontSize: 13.5, textAlign: "left" },
  resetBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#9AA69C", fontSize: 11.5, padding: "7px 10px", borderRadius: 6, width: "100%" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: "1px solid var(--line)", background: "var(--paper-raised)" },
  content: { padding: 24, overflowY: "auto" },
  card: { background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px" },
  cardHeader: { fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 6 },
  tape: { background: "var(--paper-raised)", border: "1px solid", borderRadius: 10, padding: "22px 26px", position: "relative" },
  tapePerforation: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundImage: "radial-gradient(circle, var(--paper) 1.5px, transparent 1.6px)", backgroundSize: "10px 3px", backgroundRepeat: "repeat-x" },
  miniRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" },
  ledgerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line)", gap: 12 },
  linkBtn: { background: "none", border: "none", color: "var(--pine)", fontSize: 12.5, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 3, marginTop: 10, padding: 0 },
  pill: { fontSize: 10.5, fontFamily: "var(--font-mono)", background: "var(--paper)", color: "var(--ink-soft)", padding: "2px 7px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 3 },
  input: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "var(--font-body)", fontSize: 13.5, background: "#fff", color: "var(--ink)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--pine)", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 7, fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500 },
  secondaryBtn: { background: "transparent", border: "1px solid var(--line)", color: "var(--ink)", padding: "8px 14px", borderRadius: 7, fontSize: 13, fontFamily: "var(--font-body)" },
  iconGhost: { background: "transparent", border: "1px solid var(--line)", borderRadius: 6, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" },
};
