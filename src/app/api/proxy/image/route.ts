import { NextRequest, NextResponse } from "next/server";

/**
 * Image proxy for Instagram CDN URLs.
 *
 * Instagram's CDN blocks images loaded from third-party domains.
 * This route fetches the image server-side with proper headers
 * and streams it back to the client from our own domain.
 *
 * Usage: /api/proxy/image?url=<encoded-instagram-cdn-url>
 */

const ALLOWED_HOSTS = [
  "instagram.com",
  "cdninstagram.com",
  "fbcdn.net",
  "scontent.cdninstagram.com",
  "scontent-",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(
      (host) =>
        parsed.hostname.endsWith(host) || parsed.hostname.includes(host),
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);

  if (!isAllowedUrl(decodedUrl)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(decodedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
