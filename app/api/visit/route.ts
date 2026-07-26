import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return req.ip ?? "127.0.0.1";
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return true;
  }
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function lookupIpLocation(ip: string): Promise<{
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}> {
  if (isPrivateIp(ip)) {
    return { country: "Local", country_code: "LO", region: "-", city: "-", latitude: null, longitude: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "rdcdb-visit-tracker/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("ipapi failed");
    const data = await res.json();
    return {
      country: data.country_name ?? data.country ?? null,
      country_code: data.country_code ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    };
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error("ip-api failed");
      const data = await res.json();
      if (data.status === "success") {
        return {
          country: data.country ?? null,
          country_code: data.countryCode ?? null,
          region: data.regionName ?? null,
          city: data.city ?? null,
          latitude: data.lat ?? null,
          longitude: data.lon ?? null,
        };
      }
      throw new Error("lookup failed");
    } catch {
      return { country: "Unknown", country_code: "UN", region: "-", city: "-", latitude: null, longitude: null };
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "";
    const referer = req.headers.get("referer") ?? "";
    let path = "/";
    try {
      const body = await req.json();
      path = typeof body.path === "string" ? body.path : "/";
    } catch {
      // ignore invalid body
    }

    const pool = getPool();

    // Try to reuse existing location for this IP to reduce external API calls.
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT country, country_code, region, city, latitude, longitude FROM site_visits WHERE ip = ? AND country IS NOT NULL ORDER BY visited_at DESC LIMIT 1",
      [ip]
    );

    let location;
    if (existing && existing.length > 0) {
      const row = existing[0];
      location = {
        country: row.country as string | null,
        country_code: row.country_code as string | null,
        region: row.region as string | null,
        city: row.city as string | null,
        latitude: row.latitude as number | null,
        longitude: row.longitude as number | null,
      };
    } else {
      location = await lookupIpLocation(ip);
    }

    await pool.execute(
      "INSERT INTO site_visits (ip, country, country_code, region, city, latitude, longitude, user_agent, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        ip,
        location.country,
        location.country_code,
        location.region,
        location.city,
        location.latitude,
        location.longitude,
        userAgent,
        path,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record visit:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
