"use client";

import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const ADMIN_PASSWORD = "1234";
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type CountryStat = {
  country: string;
  countryCode: string;
  count: number;
  lastVisit: string;
};

type RecentVisit = {
  id: number;
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  path: string;
  visitedAt: string;
};

type MapPoint = {
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  city: string;
  count: number;
};

type Stats = {
  total: number;
  uniqueIps: number;
  firstVisit: string | null;
  countries: CountryStat[];
  recent: RecentVisit[];
  points: MapPoint[];
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🏳";
  const base = 127397;
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(base + c.charCodeAt(0)))
    .join("");
}

function WorldMap({ points }: { points: MapPoint[] }) {
  const maxCount = useMemo(() => {
    if (points.length === 0) return 1;
    return Math.max(...points.map((p) => p.count));
  }, [points]);

  return (
    <div
      style={{
        background: "#0b1d2e",
        borderRadius: 12,
        padding: 12,
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120, center: [0, 25] }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1e3a5f"
                stroke="#0f2744"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#2a4d75" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {points.map((p, idx) => {
          const radius = Math.max(2, Math.min(10, 2 + (p.count / maxCount) * 8));
          return (
            <Marker key={idx} coordinates={[p.longitude, p.latitude]}>
              <circle r={radius} fill="#ff6b6b" fillOpacity={0.85} stroke="#fff" strokeWidth={0.5} />
              <title>{`${p.city}, ${p.country}: ${p.count} visits`}</title>
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}

export default function AdminVisitsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch("/api/visit-stats", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setStats(data as Stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [authenticated]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  }

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <form
          onSubmit={handleLogin}
          style={{
            background: "#fff",
            padding: "32px 28px",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            width: 320,
          }}
        >
          <h2 style={{ margin: "0 0 20px", textAlign: "center", color: "#0f172a" }}>Admin Login</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              marginBottom: 16,
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 8,
              border: 0,
              background: "#0090B5",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>Visitor Statistics</h1>
        <button
          onClick={() => setAuthenticated(false)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
            color: "#475569",
          }}
        >
          Logout
        </button>
      </div>

      {loading && <div style={{ color: "#64748b" }}>Loading...</div>}

      {!loading && stats && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Total Visits</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#0090B5" }}>{stats.total.toLocaleString()}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Unique IPs</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#0090B5" }}>{stats.uniqueIps.toLocaleString()}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Countries</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#0090B5" }}>{stats.countries.length}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Tracking Since</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0090B5" }}>{formatDate(stats.firstVisit)}</div>
            </div>
          </div>

          {/* Big title like the screenshot */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 20,
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {stats.total.toLocaleString()} visits since {formatDate(stats.firstVisit)}
          </div>

          {/* Map + country table */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20, marginBottom: 24 }}>
            <WorldMap points={stats.points} />

            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #e2e8f0",
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#f1f5f9",
                }}
              >
                Country / Region Rank
              </div>
              <div style={{ maxHeight: 420, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                    <tr>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>No.</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Country</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Visits</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.countries.map((c, idx) => {
                      const percent = stats.total > 0 ? ((c.count / stats.total) * 100).toFixed(2) : "0.00";
                      return (
                        <tr key={idx}>
                          <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>{idx + 1}</td>
                          <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                            <span style={{ marginRight: 6 }}>{countryFlag(c.countryCode)}</span>
                            {c.country}
                          </td>
                          <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 600 }}>
                            {c.count.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right", color: "#64748b" }}>
                            {percent}%
                          </td>
                        </tr>
                      );
                    })}
                    {stats.countries.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                          No data yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent visits */}
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 700,
                color: "#0f172a",
                background: "#f1f5f9",
              }}
            >
              Recent Pageviews
            </div>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Time</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>IP</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Location</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Page</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                        {formatDateTime(r.visitedAt)}
                      </td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontFamily: "monospace" }}>{r.ip}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ marginRight: 4 }}>{countryFlag(r.countryCode)}</span>
                        {r.city && r.city !== "-" ? `${r.city}, ${r.country}` : r.country}
                      </td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#475569" }}>{r.path}</td>
                    </tr>
                  ))}
                  {stats.recent.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                        No recent visits
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
