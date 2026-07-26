import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    const [totalRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM site_visits");
    const [startRows] = await pool.query<RowDataPacket[]>(
      "SELECT MIN(visited_at) AS first_visit FROM site_visits"
    );

    return NextResponse.json({
      total: (totalRows[0]?.total as number) ?? 0,
      firstVisit: startRows[0]?.first_visit ? new Date(startRows[0].first_visit as Date).toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to fetch public visit stats:", error);
    return NextResponse.json({ total: 0, firstVisit: null }, { status: 500 });
  }
}
