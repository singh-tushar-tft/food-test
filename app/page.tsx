"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, LayoutGrid, CheckCircle2, XCircle, Database, Activity, ChevronUp, Layers } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FOOD_TYPE: Record<string, string> = { V: "Veg", N: "Non-veg", NV: "Non-veg", E: "Egg" };

function num(v: any, d = 2) {
  const n = Number(v);
  return Number.isFinite(n) ? +n.toFixed(d) : "-";
}

export default function ComparePage() {
  const [bonApiKey, setBonApiKey] = useState("");
  const [query, setQuery] = useState("dal rice");
  const [companyId, setCompanyId] = useState("");
  const [bonVersion, setBonVersion] = useState("v2");
  const [limit, setLimit] = useState(10);
  const [strict, setStrict] = useState(false);
  const [debug, setDebug] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [fitData, setFitData] = useState<any>(null);
  const [bonData, setBonData] = useState<any>(null);
  const [fitItems, setFitItems] = useState<any[]>([]);
  const [bonItems, setBonItems] = useState<any[]>([]);
  
  const [fitError, setFitError] = useState("");
  const [bonError, setBonError] = useState("");
  const [fitTime, setFitTime] = useState(0);
  const [bonTime, setBonTime] = useState(0);

  const [expandedFit, setExpandedFit] = useState<Record<string, boolean>>({});
  const [expandedBon, setExpandedBon] = useState<Record<string, boolean>>({});
  
  const [bonDetailsCache, setBonDetailsCache] = useState<Record<string, any>>({});
  const [bonDetailsLoading, setBonDetailsLoading] = useState<Record<string, boolean>>({});

  const fitrofyUrl = `/proxy/fit/api/es/searchV2ByCompany?query=${encodeURIComponent(query)}&companyId=${encodeURIComponent(companyId)}${strict ? "&strict=true" : ""}${debug ? "&debug=true" : ""}`;
  const bonUrl = bonVersion === "v2" 
    ? `/proxy/bon/v2/search?value=${encodeURIComponent(query)}&limit=${limit}` 
    : `/proxy/bon/search?value=${encodeURIComponent(query)}`;

  const toggleFit = (id: string) => setExpandedFit(p => ({ ...p, [id]: !p[id] }));
  
  const toggleBon = async (uid: string) => {
    const isExpanding = !expandedBon[uid];
    setExpandedBon(p => ({ ...p, [uid]: isExpanding }));
    
    if (isExpanding && !bonDetailsCache[uid] && !bonDetailsLoading[uid]) {
      setBonDetailsLoading(p => ({ ...p, [uid]: true }));
      try {
        const t0 = performance.now();
        const res = await fetch(`/proxy/bon/food?food_item_id=${encodeURIComponent(uid)}`, {
          headers: { "x-api-key": bonApiKey }
        });
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { throw new Error(`Invalid JSON: ${text.slice(0, 50)}`); }
        const obj = Array.isArray(json) ? json[0] : json;
        setBonDetailsCache(p => ({ ...p, [uid]: { data: obj, raw: json, ms: Math.round(performance.now() - t0) } }));
      } catch (err: any) {
        setBonDetailsCache(p => ({ ...p, [uid]: { error: err.message } }));
      } finally {
        setBonDetailsLoading(p => ({ ...p, [uid]: false }));
      }
    }
  };

  const handleSearch = async () => {
    if (!bonApiKey) { alert("Bonhappetee API key is required"); return; }
    if (!query) { alert("Query is required"); return; }
    if (!companyId) { alert("Fitrofy company ID is required"); return; }

    setLoading(true);
    setHasSearched(true);
    setFitError("");
    setBonError("");
    setFitItems([]);
    setBonItems([]);
    setExpandedFit({});
    setExpandedBon({});

    const tFit0 = performance.now();
    const pFit: Promise<{ ok: boolean; status?: number; data?: any; error?: string }> = fetch(fitrofyUrl)
      .then(async r => {
        const text = await r.text();
        try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
        catch (e) { return { ok: false, error: `Invalid response: ${text.slice(0, 50)}`, data: null }; }
      })
      .catch(e => ({ ok: false, error: e.message, data: null }));
      
    const tBon0 = performance.now();
    const pBon: Promise<{ ok: boolean; status?: number; data?: any; error?: string }> = fetch(bonUrl, { headers: { "x-api-key": bonApiKey } })
      .then(async r => {
        const text = await r.text();
        try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
        catch (e) { return { ok: false, error: `Invalid response: ${text.slice(0, 50)}`, data: null }; }
      })
      .catch(e => ({ ok: false, error: e.message, data: null }));

    const [fitRes, bonRes] = await Promise.all([pFit, pBon]);
    
    setFitTime(Math.round(performance.now() - tFit0));
    setBonTime(Math.round(performance.now() - tBon0));

    // Process Fitrofy
    if (fitRes.error || !fitRes.ok || fitRes.data?.success === false) {
      setFitError(fitRes.error || fitRes.data?.message || "Failed to load Fitrofy data");
    } else {
      setFitData(fitRes.data);
      const hits = fitRes.data?.data?.hits || [];
      setFitItems(hits.map((h: any, i: number) => {
        const s = h._source || {};
        return {
          id: h._id || i.toString(),
          name: s.Food ?? "Unknown",
          calories: s.Calories, carbs: s.Carbs, protein: s.Protein, fat: s.Fat, fiber: s.Fiber,
          serving: `${s.portion ?? ""} ${s.portion_unit ?? ""}`.trim(),
          extra: [FOOD_TYPE[s.foodType] || s.foodType, s.Type].filter(Boolean).join(" · "),
          score: typeof h._score === "number" ? `score ${h._score.toFixed(3)}` : "",
          raw: h
        };
      }));
    }

    // Process Bonhappetee
    if (bonRes.error || !bonRes.ok) {
      setBonError(bonRes.error || bonRes.data?.message || "Failed to load Bonhappetee data");
    } else {
      setBonData(bonRes.data);
      const items = bonRes.data?.items || [];
      setBonItems(items.map((i: any, idx: number) => {
        const n = i.nutrients || {};
        return {
          id: i.food_unique_id || idx.toString(),
          uid: i.food_unique_id || "",
          name: i.food_name ?? "Unknown",
          calories: n.calories, carbs: n.carbs, protein: n.protein, fat: n.fats, fiber: n.fiber,
          serving: [i.serving_type, i.calories_calculated_for != null ? `(${num(i.calories_calculated_for, 1)} g)` : ""]
                     .filter(Boolean).join(" "),
          extra: [i.meal_type, (i.common_names && i.common_names !== i.food_name) ? `also: ${i.common_names}` : ""]
                     .filter(Boolean).join(" · "),
          score: i.food_id != null ? `id ${i.food_id}` : "",
        };
      }));
    }

    setLoading(false);
  };

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const fitSet = new Set(fitItems.map(i => norm(i.name)));
  const bonSet = new Set(bonItems.map(i => norm(i.name)));
  const both = fitItems.filter(i => bonSet.has(norm(i.name))).map(i => i.name);
  const onlyFit = fitItems.filter(i => !bonSet.has(norm(i.name))).map(i => i.name);
  const onlyBon = bonItems.filter(i => !fitSet.has(norm(i.name))).map(i => i.name);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-4 sm:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent inline-block">
            Food Search API Comparison
          </h1>
          <p className="text-neutral-500">
            Compare results from Fitrofy and Bonhappetee side by side.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm backdrop-blur-xl transition-all">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Bonhappetee API key *</label>
              <input type="text" value={bonApiKey} onChange={e => setBonApiKey(e.target.value)} placeholder="Paste your API key" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Query *</label>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. paneer bhurji" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Fitrofy Company ID *</label>
              <input type="text" value={companyId} onChange={e => setCompanyId(e.target.value)} placeholder="e.g. FIT10234" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Bonhappetee Endpoint</label>
              <select value={bonVersion} onChange={e => setBonVersion(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all">
                <option value="v2">v2 (/v2/search)</option>
                <option value="v1">v1 (/search)</option>
              </select>
            </div>
            {bonVersion === 'v2' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-neutral-700">Limit</label>
                <input type="number" min="1" max="100" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-neutral-100">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer group">
              <input type="checkbox" checked={strict} onChange={e => setStrict(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0 bg-neutral-100 border-neutral-300 transition-all cursor-pointer w-4 h-4" />
              <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors">Fitrofy strict match</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer group">
              <input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0 bg-neutral-100 border-neutral-300 transition-all cursor-pointer w-4 h-4" />
              <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors">Fitrofy debug diagnostics</span>
            </label>
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-[11px] font-mono text-neutral-500 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 truncate flex items-center gap-2">
              <span className="font-semibold text-emerald-600 shrink-0">FITROFY</span> {fitrofyUrl}
            </div>
            <div className="text-[11px] font-mono text-neutral-500 bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-100/50 truncate flex items-center gap-2">
              <span className="font-semibold text-amber-600 shrink-0">BONHAPPETEE</span> {bonUrl}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching..." : "Compare APIs"}
            </button>
          </div>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Fitrofy Column */}
              <div className="bg-white border border-emerald-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                <div className="bg-emerald-50/50 px-5 py-4 border-b border-emerald-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-emerald-700">Fitrofy</h2>
                      <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        {fitError ? (
                          <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed · {fitTime}ms</span>
                        ) : (
                          <><CheckCircle2 className="w-3 h-3 text-emerald-500"/> {fitData?.count ?? fitItems.length} results · {fitTime}ms {fitData?.strictMatchCount != null ? `· strict ${fitData.strictMatchCount}` : ""}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 flex-1 bg-neutral-50/30">
                  {fitError ? (
                    <div className="text-sm text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">{fitError}</div>
                  ) : fitItems.length === 0 ? (
                    <div className="text-sm text-neutral-500 p-8 text-center bg-white rounded-xl border border-dashed border-neutral-200">No confident matches found.</div>
                  ) : (
                    <div className="space-y-3">
                      {fitItems.map((item, idx) => (
                        <div key={item.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden transition-all hover:border-emerald-300/50 shadow-sm hover:shadow">
                          <button onClick={() => toggleFit(item.id)} className="w-full text-left p-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-[15px] truncate text-neutral-900">{item.name}</h3>
                                <span className="text-[10px] font-medium bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full shrink-0">#{idx + 1}</span>
                              </div>
                              <div className="text-xs text-neutral-500 font-medium">
                                <span className="text-neutral-900">{num(item.calories)}</span> kcal <span className="text-neutral-300 mx-1">|</span>
                                C <span className="text-neutral-900">{num(item.carbs)}</span>g <span className="text-neutral-300 mx-1">·</span>
                                P <span className="text-neutral-900">{num(item.protein)}</span>g <span className="text-neutral-300 mx-1">·</span>
                                F <span className="text-neutral-900">{num(item.fat)}</span>g
                              </div>
                              <div className="text-xs text-neutral-400 mt-2 flex gap-2 flex-wrap">
                                {item.serving && <span className="bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">{item.serving}</span>}
                                {item.extra && <span className="bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">{item.extra}</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-neutral-400 mt-1">
                              {expandedFit[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {expandedFit[item.id] && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="p-4 bg-neutral-50/80 border-t border-neutral-100 text-[13px] space-y-4">
                                  <div>
                                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Raw Data</h4>
                                    <pre className="bg-neutral-900 text-neutral-300 p-3 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
                                      {JSON.stringify(item.raw._source, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bonhappetee Column */}
              <div className="bg-white border border-amber-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                <div className="bg-amber-50/50 px-5 py-4 border-b border-amber-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-amber-700">Bonhappetee</h2>
                      <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        {bonError ? (
                          <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed · {bonTime}ms</span>
                        ) : (
                          <><CheckCircle2 className="w-3 h-3 text-amber-500"/> {bonData?.results ?? bonItems.length} results · {bonTime}ms</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 flex-1 bg-neutral-50/30">
                  {bonError ? (
                    <div className="text-sm text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">{bonError}</div>
                  ) : bonItems.length === 0 ? (
                    <div className="text-sm text-neutral-500 p-8 text-center bg-white rounded-xl border border-dashed border-neutral-200">No results found.</div>
                  ) : (
                    <div className="space-y-3">
                      {bonItems.map((item, idx) => (
                        <div key={item.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden transition-all hover:border-amber-300/50 shadow-sm hover:shadow">
                          <button onClick={() => toggleBon(item.uid)} className="w-full text-left p-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-[15px] truncate text-neutral-900">{item.name}</h3>
                                <span className="text-[10px] font-medium bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full shrink-0">#{idx + 1}</span>
                              </div>
                              <div className="text-xs text-neutral-500 font-medium">
                                <span className="text-neutral-900">{num(item.calories)}</span> kcal <span className="text-neutral-300 mx-1">|</span>
                                C <span className="text-neutral-900">{num(item.carbs)}</span>g <span className="text-neutral-300 mx-1">·</span>
                                P <span className="text-neutral-900">{num(item.protein)}</span>g <span className="text-neutral-300 mx-1">·</span>
                                F <span className="text-neutral-900">{num(item.fat)}</span>g
                              </div>
                              <div className="text-xs text-neutral-400 mt-2 flex gap-2 flex-wrap">
                                {item.serving && <span className="bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">{item.serving}</span>}
                                {item.extra && <span className="bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">{item.extra}</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-neutral-400 mt-1">
                              {expandedBon[item.uid] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {expandedBon[item.uid] && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="p-4 bg-neutral-50/80 border-t border-neutral-100 text-[13px]">
                                  {bonDetailsLoading[item.uid] ? (
                                    <div className="text-neutral-500 flex items-center justify-center py-4 gap-2">
                                      <Activity className="w-4 h-4 animate-spin" /> Loading details...
                                    </div>
                                  ) : bonDetailsCache[item.uid]?.error ? (
                                    <div className="text-red-500 p-3 bg-red-50 rounded-lg">{bonDetailsCache[item.uid].error}</div>
                                  ) : bonDetailsCache[item.uid]?.data ? (
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Detailed Data</h4>
                                        <pre className="bg-neutral-900 text-neutral-300 p-3 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
                                          {JSON.stringify(bonDetailsCache[item.uid].data, null, 2)}
                                        </pre>
                                      </div>
                                      <div className="text-[10px] text-neutral-400 text-right">Loaded in {bonDetailsCache[item.uid].ms}ms</div>
                                    </div>
                                  ) : null}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overlap Section */}
            {!fitError && !bonError && fitItems.length > 0 && bonItems.length > 0 && (
              <div className="bg-white border border-indigo-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-bold text-[15px]">Name Overlap Analysis</h2>
                </div>
                <p className="text-xs text-neutral-500 mb-5">Exact name matches only (case-insensitive). Different spellings will show up as separate items.</p>
                
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-700 mb-2 flex justify-between">
                      <span>In Both APIs</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md">{both.length} items</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {both.length ? both.map((n, i) => <span key={i} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">{n}</span>) : <span className="text-xs text-neutral-400">None</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-700 mb-2 flex justify-between">
                      <span>Only in Fitrofy</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md">{onlyFit.length} items</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {onlyFit.length ? onlyFit.map((n, i) => <span key={i} className="text-xs px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg">{n}</span>) : <span className="text-xs text-neutral-400">None</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-700 mb-2 flex justify-between">
                      <span>Only in Bonhappetee</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md">{onlyBon.length} items</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {onlyBon.length ? onlyBon.map((n, i) => <span key={i} className="text-xs px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg">{n}</span>) : <span className="text-xs text-neutral-400">None</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
