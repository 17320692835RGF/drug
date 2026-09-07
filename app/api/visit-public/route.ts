import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const [totalRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM site_visits");
    const [startRows] = await pool.query<RowDataPacket[]>(
      "SELECT MIN(visited_at) AS first_visit FROM site_visits"
    );

    const response = NextResponse.json({
      total: (totalRows[0]?.total as number) ?? 0,
      firstVisit: startRows[0]?.first_visit ? new Date(startRows[0].first_visit as Date).toISOString() : null,
    });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Failed to fetch public visit stats:", error);
    const response = NextResponse.json({ total: 0, firstVisit: null }, { status: 500 });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  }
}
