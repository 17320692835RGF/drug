import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();

    const [totalRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM site_visits");
    const total = (totalRows[0]?.total as number) ?? 0;

    const [uniqueRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT ip) AS unique_ips FROM site_visits"
    );
    const uniqueIps = (uniqueRows[0]?.unique_ips as number) ?? 0;

    const [startRows] = await pool.query<RowDataPacket[]>(
      "SELECT MIN(visited_at) AS first_visit FROM site_visits"
    );
    const firstVisit = startRows[0]?.first_visit as Date | null;

    const [countryRows] = await pool.query<RowDataPacket[]>(
      `SELECT country, country_code, COUNT(*) AS count, MAX(visited_at) AS last_visit
       FROM site_visits
       WHERE country IS NOT NULL AND country != ''
       GROUP BY country, country_code
       ORDER BY count DESC
       LIMIT 100`
    );

    const [recentRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, ip, country, country_code, city, path, latitude, longitude, visited_at
       FROM site_visits
       ORDER BY visited_at DESC
       LIMIT 20`
    );

    const [pointsRows] = await pool.query<RowDataPacket[]>(
      `SELECT latitude, longitude, country, country_code, city, COUNT(*) AS count
       FROM site_visits
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       GROUP BY latitude, longitude, country, country_code, city
       ORDER BY count DESC
       LIMIT 500`
    );

    const payload = {
      total,
      uniqueIps,
      firstVisit: firstVisit ? new Date(firstVisit).toISOString() : null,
      countries: countryRows.map((r) => ({
        country: (r.country as string) ?? "Unknown",
        countryCode: (r.country_code as string) ?? "UN",
        count: r.count as number,
        lastVisit: new Date(r.last_visit as Date).toISOString(),
      })),
      recent: recentRows.map((r) => ({
        id: r.id as number,
        ip: r.ip as string,
        country: (r.country as string) ?? "Unknown",
        countryCode: (r.country_code as string) ?? "UN",
        city: (r.city as string) ?? "-",
        path: r.path as string,
        latitude: (r.latitude as number | null) ?? null,
        longitude: (r.longitude as number | null) ?? null,
        visitedAt: new Date(r.visited_at as Date).toISOString(),
      })),
      points: pointsRows.map((r) => ({
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        country: (r.country as string) ?? "Unknown",
        countryCode: (r.country_code as string) ?? "UN",
        city: (r.city as string) ?? "-",
        count: r.count as number,
      })),
    };
    const response = NextResponse.json(payload);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Failed to fetch visit stats:", error);
    const response = NextResponse.json(
      { total: 0, uniqueIps: 0, firstVisit: null, countries: [], recent: [], points: [] },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  }
}
