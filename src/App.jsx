import React, { useEffect, useMemo, useState } from "react";

/**
 * Reglas confirmadas:
 * - Todos los pays/pasteles: 8 rebanadas
 * - Todas las rebanadas: ganancia fija = $10 (sin importar costo real)
 * - Admin sin seguridad
 * - Corte diario: 23:59
 * - Sin inventario: solo conteo de ventas (+1) y timestamp
 */

const SLICE_PROFIT = 10;

const PRODUCTS = [
  // Snacks
  { id: "galleta_chispas", name: "Galleta chispas", category: "Snacks", type: "unit", cost: 12, price: 15 },
  { id: "muffin", name: "Muffin", category: "Snacks", type: "unit", cost: 20, price: 25 },
  { id: "mini_dona", name: "Mini-dona", category: "Snacks", type: "unit", cost: 1, price: 2 },

  // Bebidas
  { id: "coca_600", name: "Coca 600 ml", category: "Bebidas", type: "unit", cost: 19.5, price: 20 },

  // Pasteles / pays (completo y rebanada)
  { id: "pay_limon", name: "Pay limón", category: "Pasteles", type: "cake", slices: 8, cost: 200, priceWhole: 250, priceSlice: 40 },
  { id: "pastel_chispas_choc", name: "Pastel chispas choc", category: "Pasteles", type: "cake", slices: 8, cost: 280, priceWhole: 330, priceSlice: 50 },

  // Chocoflan actualizado: completo 230 / rebanada 40
  { id: "chocoflan", name: "Chocoflan", category: "Pasteles", type: "cake", slices: 8, cost: 180, priceWhole: 230, priceSlice: 40 },

  { id: "zanahoria", name: "Pastel zanahoria", category: "Pasteles", type: "cake", slices: 8, cost: 290, priceWhole: 340, priceSlice: 55 },
  { id: "tuxedo", name: "Pastel tuxedo", category: "Pasteles", type: "cake", slices: 8, cost: 300, priceWhole: 350, priceSlice: 55 },

  // Pay frambuesa actualizado: completo 300 / rebanada 45
  { id: "pay_frambuesa", name: "Pay frambuesa", category: "Pasteles", type: "cake", slices: 8, cost: 250, priceWhole: 300, priceSlice: 45 },

  { id: "pastel_chocolate", name: "Pastel chocolate", category: "Pasteles", type: "cake", slices: 8, cost: 330, priceWhole: 380, priceSlice: 50 },
  { id: "queso_natural", name: "Queso natural", category: "Pasteles", type: "cake", slices: 8, cost: 230, priceWhole: 280, priceSlice: 40 },
];

const LS_KEY = "pasteles_app_sales_v1";

function loadSales() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveSales(sales) {
  localStorage.setItem(LS_KEY, JSON.stringify(sales));
}

function nowISO() {
  return new Date().toISOString();
}
function startOfDayLocal(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDayLocal(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
function formatMoney(n) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
function formatDateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function productById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
function profitForSale(sale) {
  const p = productById(sale.productId);
  if (!p) return 0;

  if (p.type === "unit") return (p.price ?? 0) - (p.cost ?? 0);

  if (p.type === "cake") {
    if (sale.mode === "slice") return SLICE_PROFIT;
    if (sale.mode === "whole") return (p.priceWhole ?? 0) - (p.cost ?? 0);
  }
  return 0;
}
function revenueForSale(sale) {
  const p = productById(sale.productId);
  if (!p) return 0;

  if (p.type === "unit") return p.price ?? 0;
  if (p.type === "cake") return sale.mode === "slice" ? (p.priceSlice ?? 0) : (p.priceWhole ?? 0);
  return 0;
}
function labelForSale(sale) {
  const p = productById(sale.productId);
  if (!p) return sale.productId;
  if (p.type === "cake") return `${p.name} — ${sale.mode === "slice" ? "Rebanada" : "Completo"}`;
  return p.name;
}
function toLocalTimeString(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const styles = {
  page: { padding: 16, maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 800 },
  sub: { color: "#475569", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 },
  card: { background: "white", borderRadius: 14, padding: 12, boxShadow: "0 10px 24px rgba(2,6,23,0.06)" },
  sectionTitle: { fontWeight: 800, marginBottom: 8 },
  btn: { border: "1px solid #e2e8f0", background: "white", borderRadius: 12, padding: "10px 12px", cursor: "pointer" },
  btnPrimary: { border: "1px solid #0f172a", background: "#0f172a", color: "white", borderRadius: 12, padding: "10px 12px", cursor: "pointer" },
  btnDanger: { border: "1px solid #ef4444", background: "#fff", color: "#ef4444", borderRadius: 12, padding: "10px 12px", cursor: "pointer" },
  pills: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#0f172a", background: "#fff" },
  divider: { height: 1, background: "#e2e8f0", margin: "10px 0" },
  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  input: { border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", width: "100%" },
  small: { fontSize: 12, color: "#64748b" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0", padding: "8px 6px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px 6px", fontSize: 13, verticalAlign: "top" },
};

function Stat({ label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function App() {
  const [sales, setSales] = useState(() => loadSales());
  const [activeDay, setActiveDay] = useState(() => formatDateKeyLocal(new Date()));
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterMode, setFilterMode] = useState("ALL");
  const [showOnlyToday, setShowOnlyToday] = useState(true);

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  const dayRange = useMemo(() => {
    const [y, m, d] = activeDay.split("-").map(Number);
    const base = new Date(y, m - 1, d);
    return { start: startOfDayLocal(base), end: endOfDayLocal(base) };
  }, [activeDay]);

  const salesInDay = useMemo(() => {
    return sales.filter((s) => {
      const t = new Date(s.ts);
      return t >= dayRange.start && t <= dayRange.end;
    });
  }, [sales, dayRange]);

  const filteredSales = useMemo(() => {
    const base = showOnlyToday ? salesInDay : sales;
    return base
      .filter((s) => {
        if (filterProduct !== "ALL" && s.productId !== filterProduct) return false;
        if (filterMode !== "ALL") {
          if (filterMode === "slice" && s.mode !== "slice") return false;
          if (filterMode === "whole" && s.mode !== "whole") return false;
          if (filterMode === "unit" && s.mode !== "unit") return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [sales, salesInDay, filterProduct, filterMode, showOnlyToday]);

  const summary = useMemo(() => {
    const list = salesInDay;
    let revenue = 0;
    let profit = 0;

    const byProduct = new Map();
    const byHour = new Map();

    let snacks = 0,
      bebidas = 0,
      slices = 0,
      wholes = 0;

    for (const s of list) {
      revenue += revenueForSale(s);
      profit += profitForSale(s);

      byProduct.set(s.productId, (byProduct.get(s.productId) ?? 0) + 1);

      const d = new Date(s.ts);
      const h = d.getHours();
      byHour.set(h, (byHour.get(h) ?? 0) + 1);

      const p = productById(s.productId);
      if (!p) continue;
      if (p.category === "Snacks") snacks += 1;
      else if (p.category === "Bebidas") bebidas += 1;
      else if (p.category === "Pasteles") {
        if (s.mode === "slice") slices += 1;
        if (s.mode === "whole") wholes += 1;
      }
    }

    let top = null;
    for (const [pid, c] of byProduct.entries()) {
      if (!top || c > top.count) top = { pid, count: c };
    }

    let peak = null;
    for (const [hour, count] of byHour.entries()) {
      if (!peak || count > peak.count) peak = { hour, count };
    }

    return { revenue, profit, top, peak, snacks, bebidas, slices, wholes, total: list.length };
  }, [salesInDay]);

  function addSale(productId, mode) {
    const sale = { id: crypto.randomUUID(), productId, mode, ts: nowISO() };
    setSales((prev) => [...prev, sale]);
  }

  function undoLast() {
    const list = salesInDay.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (list.length === 0) return;
    const lastId = list[0].id;
    setSales((prev) => prev.filter((s) => s.id !== lastId));
  }

  function clearDay() {
    if (!confirm(`¿Borrar TODAS las ventas del día ${activeDay}?`)) return;
    setSales((prev) =>
      prev.filter((s) => {
        const t = new Date(s.ts);
        return !(t >= dayRange.start && t <= dayRange.end);
      })
    );
  }

  const snacks = PRODUCTS.filter((p) => p.category === "Snacks");
  const bebidas = PRODUCTS.filter((p) => p.category === "Bebidas");
  const pasteles = PRODUCTS.filter((p) => p.category === "Pasteles");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Pasteles & Cocas — Botones de venta</div>
          <div style={styles.sub}>+1 por venta · Registro con hora · Resumen diario (corte 11:59pm) · Guardado local</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={styles.btn} onClick={undoLast}>Deshacer última (del día)</button>
          <button style={styles.btnDanger} onClick={clearDay}>Borrar día</button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Botones (+1)</div>

          <div style={styles.divider} />

          <div style={styles.sectionTitle}>Snacks</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {snacks.map((p) => (
              <button key={p.id} style={styles.btnPrimary} onClick={() => addSale(p.id, "unit")}>
                {p.name} +1
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  Venta {formatMoney(p.price)} · Gan {formatMoney(p.price - p.cost)}
                </div>
              </button>
            ))}
          </div>

          <div style={styles.divider} />

          <div style={styles.sectionTitle}>Bebidas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {bebidas.map((p) => (
              <button key={p.id} style={styles.btnPrimary} onClick={() => addSale(p.id, "unit")}>
                {p.name} +1
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  Venta {formatMoney(p.price)} · Gan {formatMoney(p.price - p.cost)}
                </div>
              </button>
            ))}
          </div>

          <div style={styles.divider} />

          <div style={styles.sectionTitle}>Pasteles / Pays</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {pasteles.map((p) => (
              <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={styles.small}>
                  8 rebanadas · Rebanada: {formatMoney(p.priceSlice)} (ganancia fija {formatMoney(SLICE_PROFIT)})
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button style={styles.btnPrimary} onClick={() => addSale(p.id, "slice")}>Rebanada +1</button>
                  <button style={styles.btn} onClick={() => addSale(p.id, "whole")}>Completo +1</button>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={styles.pill}>Completo: {formatMoney(p.priceWhole)} · Gan {formatMoney(p.priceWhole - p.cost)}</span>
                  <span style={styles.pill}>Costo: {formatMoney(p.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Resumen del día</div>

            <div style={styles.row}>
              <div style={{ minWidth: 220 }}>
                <div style={styles.small}>Día</div>
                <input style={styles.input} type="date" value={activeDay} onChange={(e) => setActiveDay(e.target.value)} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.small}>Ver</div>
                <div style={styles.pills}>
                  <button style={showOnlyToday ? styles.btnPrimary : styles.btn} onClick={() => setShowOnlyToday(true)}>Dia</button>
                  <button style={!showOnlyToday ? styles.btnPrimary : styles.btn} onClick={() => setShowOnlyToday(false)}>Historial</button>
                </div>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              <Stat label="Ventas (día)" value={summary.total} />
              <Stat label="Ingresos (día)" value={formatMoney(summary.revenue)} />
              <Stat label="Ganancia (día)" value={formatMoney(summary.profit)} />
              <Stat label="Pico (día)" value={summary.peak ? `${String(summary.peak.hour).padStart(2, "0")}:00 (${summary.peak.count})` : "—"} />
              <Stat label="Rebanadas (día)" value={summary.slices} />
              <Stat label="Completos (día)" value={summary.wholes} />
              <Stat label="Snacks (día)" value={summary.snacks} />
              <Stat label="Bebidas (día)" value={summary.bebidas} />
            </div>

            <div style={styles.divider} />

            <div style={styles.small}>
              {summary.top ? `Top producto (día): ${productById(summary.top.pid)?.name ?? summary.top.pid} — ${summary.top.count}` : "Sin ventas en este día."}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionTitle}>Historial</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={styles.small}>Filtro producto</div>
                <select style={styles.input} value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                  <option value="ALL">Todos</option>
                  {PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={styles.small}>Filtro tipo</div>
                <select style={styles.input} value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                  <option value="ALL">Todos</option>
                  <option value="slice">Rebanadas</option>
                  <option value="whole">Completos</option>
                  <option value="unit">Unitarios (snacks/bebidas)</option>
                </select>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={{ maxHeight: 420, overflow: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha/Hora</th>
                    <th style={styles.th}>Venta</th>
                    <th style={styles.th}>Ingreso</th>
                    <th style={styles.th}>Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td style={styles.td} colSpan={4}><span style={styles.small}>No hay ventas con esos filtros.</span></td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id}>
                        <td style={styles.td}>{toLocalTimeString(s.ts)}</td>
                        <td style={styles.td}>{labelForSale(s)}</td>
                        <td style={styles.td}>{formatMoney(revenueForSale(s))}</td>
                        <td style={styles.td}>{formatMoney(profitForSale(s))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.divider} />

            <div style={styles.small}>
              Tip: si alguien se equivoca, usa <b>Deshacer última (del día)</b>. Los datos se guardan en esta computadora (localStorage).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
