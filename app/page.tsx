"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getEntityCategoryColor, PRIMARY_COLOR } from "@/lib/entity-category-colors";

type StatusOption = { value: string; label: string };
type DrugItem = { drug_id: string; drug_name: string; status: string | null };
type ChemicalItem = { entity_id: string; name: string };

function formatVisitorDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

type ChemicalEntityCategory = "cold_compound" | "ligand" | "linker" | "chelator" | "radionuclide";
type SearchTabKey = "rdc" | ChemicalEntityCategory;

function makeAlphaColor(hex: string, alphaHex: string) {
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

function getChemicalLabel(category: ChemicalEntityCategory) {
  switch (category) {
    case "cold_compound":
      return "Cold Compound";
    case "ligand":
      return "Ligand";
    case "linker":
      return "Linker";
    case "chelator":
      return "Chelator";
    case "radionuclide":
      return "Radionuclide";
    default:
      return category;
  }
}

function TileMenu({ activeKey, onSelect }: { activeKey: SearchTabKey; onSelect: (key: SearchTabKey) => void }) {
  const items = useMemo<Array<{ key: SearchTabKey; label: string; imageSrc: string }>>(
    () => [
      { key: "rdc", label: "Search for RDC", imageSrc: "/RDC.svg" },
      { key: "cold_compound", label: "Search for Cold Compound", imageSrc: "/cold_compound.svg" },
      { key: "ligand", label: "Search for Ligand", imageSrc: "/Ligand.svg" },
      { key: "linker", label: "Search for Linker", imageSrc: "/linker.svg" },
      { key: "chelator", label: "Search for Chelator", imageSrc: "/chelator.svg" },
      { key: "radionuclide", label: "Search for Radionuclide", imageSrc: "/radionuclide.svg" },
    ],
    []
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {items.map((it) => {
        const color =
          it.key === "rdc" ? PRIMARY_COLOR : getEntityCategoryColor(it.key as ChemicalEntityCategory);
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect(it.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 140,
              padding: "12px 10px 14px",
              borderRadius: 8,
              border: `3px solid ${color}`,
              background: makeAlphaColor(color, it.key === activeKey ? "33" : "1A"),
              textDecoration: "none",
              color,
              boxShadow: "none",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 84,
                height: 84,
                display: "block",
                backgroundImage: `url('${it.imageSrc}')`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
              }}
            />
            <span style={{ fontSize: 16, lineHeight: 1.2, color }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomePageContent() {
  // Top fuzzy search
  const [q, setQ] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Bottom dependent selects
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [namesLoading, setNamesLoading] = useState(false);
  const [namesByStatus, setNamesByStatus] = useState<DrugItem[]>([]);
  const [selectedDrugName, setSelectedDrugName] = useState("");

  // Chemical entity search state
  const [chemicalQ, setChemicalQ] = useState("");
  const [chemicalItems, setChemicalItems] = useState<ChemicalItem[]>([]);
  const [chemicalLoading, setChemicalLoading] = useState(false);

  // Visitor stats
  const [visitorTotal, setVisitorTotal] = useState<number>(0);
  const [visitorSince, setVisitorSince] = useState<string | null>(null);

  const activeTabParam = searchParams.get("tab");
  const activeTab: SearchTabKey =
    activeTabParam === "rdc" ||
    activeTabParam === "cold_compound" ||
    activeTabParam === "ligand" ||
    activeTabParam === "linker" ||
    activeTabParam === "chelator" ||
    activeTabParam === "radionuclide"
      ? (activeTabParam as SearchTabKey)
      : "rdc";

  const isRdcMode = activeTab === "rdc";

  // Load status dict on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatusLoading(true);
      try {
        const res = await fetch(`/api/rdc/init`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          const opts: StatusOption[] = (data?.dicts?.status ?? []) as StatusOption[];
          setStatusOptions(opts);
        }
      } catch (e) {
        // ignore in UI
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load visitor stats on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/visit-public", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setVisitorTotal(data.total ?? 0);
          setVisitorSince(data.firstVisit ?? null);
        }
      } catch (e) {
        // ignore in UI
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset chemical search when tab changes
  useEffect(() => {
    setChemicalQ("");
    setChemicalItems([]);
    setChemicalLoading(false);
  }, [activeTab]);

  function doSearch(keywordOverride?: string) {
    const keyword = (keywordOverride ?? q).trim();
    if (!keyword) return;
    const params = new URLSearchParams({ q: keyword });
    router.push(`/rdc/search?${params.toString()}`);
  }

  async function onStatusChange(value: string) {
    setSelectedStatus(value);
    setSelectedDrugName("");
    setNamesByStatus([]);
    if (!value) return;
    setNamesLoading(true);
    try {
      const params = new URLSearchParams({ status: value, limit: "200" });
      const res = await fetch(`/api/rdc/by-status?${params}`, { cache: "no-store" });
      const data = await res.json();
      setNamesByStatus((data?.items ?? []) as DrugItem[]);
    } catch (e) {
      // ignore in UI
    } finally {
      setNamesLoading(false);
    }
  }

  function resetStatus() {
    setSelectedStatus("");
    setNamesByStatus([]);
    setSelectedDrugName("");
  }

  async function doChemicalSearch(keywordOverride?: string) {
    if (activeTab === "rdc") return;
    const entityCategory = activeTab as ChemicalEntityCategory;
    const keyword = (keywordOverride ?? chemicalQ).trim();
    if (!keyword) return;

    setChemicalLoading(true);
    try {
      const params = new URLSearchParams({
        entity_category: entityCategory,
        q: keyword,
        limit: "20",
      });
      const res = await fetch(`/api/chemical/search?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        // Ignore errors here instead of showing an alert on the homepage.
        setChemicalItems([]);
        return;
      }
      const data = await res.json();
      setChemicalItems((data?.items ?? []) as ChemicalItem[]);
    } catch {
      // ignore in UI
      setChemicalItems([]);
    } finally {
      setChemicalLoading(false);
    }
  }

  return (
    <main style={{ padding: "24px" }}>
      <h1 style={{ margin: 0, marginBottom: 12 }}>RDC Portal</h1>
      <p style={{ marginTop: 0, color: "#475569" }}>Quickly find radiopharmaceutical drug conjugates (RDCs) and related entities.</p>

      {/* Top: six submenu tiles */}
      <TileMenu
        activeKey={activeTab}
        onSelect={(key) => {
          if (key === "rdc") {
            router.push("/");
          } else {
            router.push(`/?tab=${key}`);
          }
        }}
      />

      {isRdcMode ? (
        <>
          {/* Search for RDC name */}
          <section
            style={{
              marginTop: 18,
              border: "1px solid #0090B5",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Search for RDC:</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                aria-label="RDC Name"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                placeholder="Enter an RDC name and press Enter to search"
                style={{
                  flex: 1,
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
              <button
                onClick={() => doSearch()}
                disabled={!q.trim()}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: 0,
                  background: "#0090B5",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: !q.trim() ? 0.6 : 1,
                }}
              >
                Search
              </button>
            </div>
          </section>

          {/* Search by Status */}
          <section
            style={{
              marginTop: 18,
              border: "1px solid #0090B5",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Search for RDC Entries by Status:</h3>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              Tip: Select a status first, then choose an RDC name.
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <select
                aria-label="Select status"
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                disabled={statusLoading}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  background: "#fff",
                }}
              >
                <option value="">Step 1: Select a status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={resetStatus}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: 0,
                  background: "#0090B5",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                aria-label="Select RDC name"
                value={selectedDrugName}
                onChange={(e) => setSelectedDrugName(e.target.value)}
                disabled={!selectedStatus || namesLoading}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  background: "#fff",
                }}
              >
                <option value="">Step 2: Select an RDC name</option>
                {namesByStatus.map((it) => (
                  <option key={it.drug_id} value={it.drug_name}>
                    {it.drug_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => doSearch(selectedDrugName)}
                disabled={!selectedDrugName}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: 0,
                  background: "#0090B5",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: selectedDrugName ? 1 : 0.6,
                }}
              >
                Search
              </button>
            </div>
          </section>
        </>
      ) : (
        (() => {
          const entityCategory = activeTab as ChemicalEntityCategory;
          const label = getChemicalLabel(entityCategory);
          const accentColor = getEntityCategoryColor(entityCategory);
          const supportsSynonymSearch = entityCategory === "radionuclide";
          return (
            <section
              style={{
                marginTop: 18,
                border: `1px solid ${accentColor}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>{`Search for ${label}:`}</h3>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                {supportsSynonymSearch
                  ? `Tip: Enter a ${label} name or synonym, press Enter to search, then click a result to view details.`
                  : `Tip: Enter a ${label} name, press Enter to search, then click a result to view details.`}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  aria-label={`${label} Name`}
                  value={chemicalQ}
                  onChange={(e) => setChemicalQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doChemicalSearch();
                  }}
                  placeholder={
                    supportsSynonymSearch
                      ? `Enter a ${label} name or synonym and press Enter to search`
                      : `Enter a ${label} name and press Enter to search`
                  }
                  style={{
                    flex: 1,
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => doChemicalSearch()}
                  disabled={!chemicalQ.trim() || chemicalLoading}
                  style={{
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 8,
                    border: 0,
                    background: accentColor,
                    color: "#fff",
                    cursor: "pointer",
                    opacity: !chemicalQ.trim() || chemicalLoading ? 0.6 : 1,
                  }}
                >
                  {chemicalLoading ? "Searching..." : "Search"}
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                {!chemicalLoading && chemicalItems.length === 0 && chemicalQ.trim() && (
                  <div style={{ fontSize: 12, color: "#94a3b8", padding: 4 }}>No result.</div>
                )}
                {chemicalItems.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0" }}>
                    {chemicalItems.map((item) => (
                      <li key={item.entity_id} style={{ marginBottom: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/chemical/${entityCategory}/${encodeURIComponent(item.entity_id)}`
                            )
                          }
                          style={{
                            width: "100%",
                            textAlign: "left",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            padding: "8px 10px",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: 500, color: "#0f172a" }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{item.entity_id}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })()
      )}

      <footer
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 40,
          marginTop: 42,
          padding: "0 12px 28px",
          color: "#6b7280",
        }}
      >
        <section>
          <h2
            style={{
              margin: "0 0 10px",
              paddingBottom: 2,
              borderBottom: "1px solid #008b8b",
              color: "#008b8b",
              fontSize: 20,
              lineHeight: 1.2,
            }}
          >
            Citation
          </h2>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 10px",
              paddingBottom: 2,
              borderBottom: "1px solid #008b8b",
              color: "#008b8b",
              fontSize: 20,
              lineHeight: 1.2,
            }}
          >
            Visitor Map
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            <strong>{visitorTotal.toLocaleString()}</strong> visitors since{" "}
            {visitorSince ? formatVisitorDate(visitorSince) : "-"}
          </p>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 10px",
              paddingBottom: 2,
              borderBottom: "1px solid #008b8b",
              color: "#008b8b",
              fontSize: 20,
              lineHeight: 1.2,
            }}
          >
            Correspondence
          </h2>
          <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.35 }}>
            <p style={{ margin: 0 }}>
              <strong>Wenhai Huang</strong> (hwh@hmc.edu.cn)
              <br />
              School of Pharmacy, Hangzhou Medical-College{" "}
              <a
                href="https://www.hmc.edu.cn/"
                target="_blank"
                rel="noreferrer"
                aria-label="Open School of Pharmacy, Hangzhou Medical-College"
                style={{ color: "#008b8b", textDecoration: "none", fontWeight: 700 }}
              >
                ↗
              </a>
            </p>
            <p style={{ margin: 0 }}>
              <strong>Mingfei Wu</strong> (wumf@hmc.edu.cn){" "}
              <a
                href="https://www.hmc.edu.cn/"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Hangzhou Medical-College"
                style={{ color: "#008b8b", textDecoration: "none", fontWeight: 700 }}
              >
                ↗
              </a>
            </p>
            <p style={{ margin: 0 }}>
              <strong>Prof. Luo FANG</strong> (fangluo@zjcc.org.cn)
              <br />
              Pharmacy Department of Zhejiang Cancer Hospital{" "}
              <a
                href="https://www.zchospital.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Pharmacy Department of Zhejiang Cancer Hospital"
                style={{ color: "#008b8b", textDecoration: "none", fontWeight: 700 }}
              >
                ↗
              </a>
            </p>
          </div>
        </section>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
