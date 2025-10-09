// mini-cursos-react.js — React 18 (ESM por CDN, sin Babel/CLI)
// Requiere: que app.js defina window.COURSES antes de cargar este archivo.
// Uso: en index.html crea <div id="mini-cursos-react"></div>
//      y abajo de app.js: <script type="module" src="mini-cursos-react.js"></script>

import React, { useEffect, useMemo, useState } from "https://esm.run/react@18";
import { createRoot } from "https://esm.run/react-dom/client@18";

// Helpers
const toArray = (obj) => Object.entries(obj || {}).map(([id, c]) => ({ id, ...c }));
const safeNum = (v, d=0) => Number.isFinite(+v) ? +v : d;

// Debounce input
function useDebounced(value, delay=220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const LS_KEY = "miniCursosReact:v1";
const loadState = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const saveState = (st) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch {}
};

function MiniCursosReact() {
  const cursosAll = useMemo(() => toArray(window.COURSES || {}), []);
  const st = useMemo(() => loadState(), []);
  const [q, setQ] = useState(st.q || "");
  const qLive = useDebounced(q, 220);

  const [sort, setSort] = useState(st.sort || "name_asc"); // name_asc|name_desc|weeks_asc|weeks_desc
  const [minWeeks, setMinWeeks] = useState(safeNum(st.minWeeks ?? 1, 1));
  const [maxWeeks, setMaxWeeks] = useState(safeNum(st.maxWeeks ?? 999, 999));
  const [pageSize, setPageSize] = useState(safeNum(st.pageSize ?? 9, 9));
  const [page, setPage] = useState(safeNum(st.page ?? 1, 1));

  // Guardar estado
  useEffect(() => {
    saveState({ q: qLive, sort, minWeeks, maxWeeks, pageSize, page });
  }, [qLive, sort, minWeeks, maxWeeks, pageSize, page]);

  // Filtro + orden
  const filtered = useMemo(() => {
    const term = (qLive || "").trim().toLowerCase();
    let arr = cursosAll.filter(c => {
      const name = (c.name || "").toLowerCase();
      const id = (c.id || "").toLowerCase();
      const w = safeNum(c.weeks ?? 16, 16);
      const passText = !term || name.includes(term) || id.includes(term);
      const passWeeks = w >= minWeeks && w <= maxWeeks;
      return passText && passWeeks;
    });
    switch (sort) {
      case "name_asc":  arr.sort((a,b)=> (a.name||a.id||"").localeCompare(b.name||b.id||"")); break;
      case "name_desc": arr.sort((a,b)=> (b.name||b.id||"").localeCompare(a.name||a.id||"")); break;
      case "weeks_asc": arr.sort((a,b)=> safeNum(a.weeks??16,16) - safeNum(b.weeks??16,16)); break;
      case "weeks_desc":arr.sort((a,b)=> safeNum(b.weeks??16,16) - safeNum(a.weeks??16,16)); break;
    }
    return arr;
  }, [cursosAll, qLive, minWeeks, maxWeeks, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [qLive, sort, minWeeks, maxWeeks, pageSize]); // reset paginación

  const start = (Math.min(page, totalPages) - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return (
    <>
      {/* Controles */}
      <div className="mcp-wrap" data-aos="fade-up" style={{
        background: "var(--panel,#0f172a)", border: "1px solid var(--border,#253046)",
        borderRadius: 14, padding: 14, marginBottom: 12
      }}>
        <div className="row gy-2 align-items-center">
          {/* Buscar */}
          <div className="col-12 col-md-5 d-flex align-items-center gap-2">
            <input
              className="form-control form-control-sm"
              placeholder="Buscar curso por nombre o ID…"
              value={q}
              onChange={(e)=> setQ(e.target.value)}
              style={{ background:"#0d1426", border:"1px solid var(--border,#253046)", color:"#fff" }}
            />
            <button className="btn btn-sm"
              onClick={()=>setQ("")}
              title="Limpiar"
              style={{ border:"1px solid var(--border,#253046)", background:"#0d1426", color:"#fff" }}
            >✕</button>
          </div>

          {/* Orden */}
          <div className="col-6 col-md-3">
            <select className="form-select form-select-sm"
                    value={sort} onChange={(e)=> setSort(e.target.value)}
                    style={{ background:"#0d1426", border:"1px solid var(--border,#253046)", color:"#fff" }}>
              <option value="name_asc">Nombre A→Z</option>
              <option value="name_desc">Nombre Z→A</option>
              <option value="weeks_asc">Semanas ↑</option>
              <option value="weeks_desc">Semanas ↓</option>
            </select>
          </div>

          {/* Rango semanas */}
          <div className="col-6 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <input type="number" min="1" step="1"
                     className="form-control form-control-sm"
                     value={minWeeks}
                     onChange={(e)=> setMinWeeks(safeNum(e.target.value,1))}
                     placeholder="Mín semanas"
                     style={{ background:"#0d1426", border:"1px solid var(--border,#253046)", color:"#fff", maxWidth:120 }} />
              <span style={{ color:"#9aa5b1" }}>—</span>
              <input type="number" min="1" step="1"
                     className="form-control form-control-sm"
                     value={maxWeeks}
                     onChange={(e)=> setMaxWeeks(safeNum(e.target.value,999))}
                     placeholder="Máx semanas"
                     style={{ background:"#0d1426", border:"1px solid var(--border,#253046)", color:"#fff", maxWidth:120 }} />
              <button className="btn btn-sm"
                      onClick={()=>{ setMinWeeks(1); setMaxWeeks(999); }}
                      title="Rango por defecto"
                      style={{ border:"1px solid var(--border,#253046)", background:"#0d1426", color:"#fff" }}
              >↺</button>
            </div>
          </div>

          {/* Estado */}
          <div className="col-12 d-flex justify-content-between align-items-center">
            <div style={{ color:"#aab2c5", fontSize: ".9rem" }}>
              Mostrando <strong>{paged.length}</strong> de
              <strong> {filtered.length}</strong> resultados (total {cursosAll.length})
            </div>
            <div className="d-none d-md-block">
              <span style={{
                border:"1px solid rgba(255,255,255,.18)", borderRadius:999, padding:".2rem .6rem",
                fontSize:".8rem", color:"#ffd1a1", background:"rgba(255,180,80,.14)"
              }}>React mini</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length ? (
        <div className="row g-3">
          {paged.map((c, i) => (
            <div key={c.id} className="col-12 col-md-6 col-lg-4">
              <div className="card project-card h-100" data-aos="fade-up" data-aos-delay={40 + i*50}>
                <div className="card-body">
                  <h5 className="card-title">
                    <i className={"bi " + ((c.icon || "bi-book") + " me-2")}></i>{c.name || c.id}
                  </h5>
                  <p className="card-text m-0">
                    <span style={{ color:"#9aa5b1" }}>Semanas:</span> <strong>{c.weeks || 16}</strong>
                  </p>
                  <p className="card-text">
                    <span style={{ color:"#9aa5b1" }}>ID:</span> <code>{c.id}</code>
                  </p>
                  <a className="btn btn-sm btn-accent"
                     href={"curso.html?course=" + encodeURIComponent(c.id)}>
                    Entrar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color:"#9aa5b1" }}>Sin resultados con “{qLive}”.</div>
      )}

      {/* Paginación */}
      {!!filtered.length && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm" style={btnS()}
              onClick={()=> setPage(1)} disabled={page===1}>«</button>
            <button className="btn btn-sm" style={btnS()}
              onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page===1}>‹</button>
            <span style={{ color:"#9aa5b1" }}>Pág. {page} / {totalPages || 1}</span>
            <button className="btn btn-sm" style={btnS()}
              onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>›</button>
            <button className="btn btn-sm" style={btnS()}
              onClick={()=> setPage(totalPages)} disabled={page>=totalPages}>»</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ color:"#9aa5b1" }}>Por página</span>
            <select className="form-select form-select-sm"
              value={pageSize}
              onChange={(e)=> setPageSize(safeNum(e.target.value, 9))}
              style={{ background:"#0d1426", border:"1px solid var(--border,#253046)", color:"#fff" }}>
              <option>6</option><option>9</option><option>12</option><option>18</option>
            </select>
          </div>
        </div>
      )}
    </>
  );

  function btnS() {
    return { border:"1px solid var(--border,#253046)", background:"#0d1426", color:"#fff", minWidth:40 };
  }
}

// Montaje
const mountEl = document.getElementById("mini-cursos-react");
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<MiniCursosReact />);
}
