import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint that fetches a product page and extracts the og:image meta tag.
 * This runs server-side where we can make proper HTTP requests without CORS issues.
 * 
 * Usage: /api/proxy/og-image?url=https://www.revolve.com/marc-jacobs-...
 * Returns: Image bytes (proxied from the og:image URL)
 */
export async function GET(request: NextRequest) {
    const pageUrl = request.nextUrl.searchParams.get('url');
    if (!pageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Step 1: Fetch the product page
        const pageResponse = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!pageResponse.ok) {
            return NextResponse.json({ error: `Page fetch failed: ${pageResponse.status}` }, { status: 502 });
        }

        const html = await pageResponse.text();

        // Step 2: Extract og:image from HTML
        let imageUrl: string | null = null;

        // Try og:image
        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
            || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
        if (ogMatch) {
            imageUrl = ogMatch[1];
        }

        // Fallback: twitter:image
        if (!imageUrl) {
            const twMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i)
                || html.match(/content="([^"]+)"\s+(?:property|name)="twitter:image"/i);
            if (twMatch) {
                imageUrl = twMatch[1];
            }
        }

        // Fallback: first product image from JSON-LD
        if (!imageUrl) {
            const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
            if (jsonLdMatch) {
                try {
                    const ld = JSON.parse(jsonLdMatch[1]);
                    if (ld.image) {
                        imageUrl = Array.isArray(ld.image) ? ld.image[0] : (typeof ld.image === 'string' ? ld.image : ld.image.url);
                    }
                } catch { /* ignore parse errors */ }
            }
        }

        if (!imageUrl) {
            return NextResponse.json({ error: 'No og:image found on page' }, { status: 404 });
        }

        // Step 3: Fetch the actual image and proxy it 
        const imgResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': pageUrl,
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!imgResponse.ok) {
            // If we can't proxy the image, redirect to it directly (browser might be able to load it)
            return NextResponse.redirect(imageUrl);
        }

        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        const imageBuffer = await imgResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('og-image proxy error:', error);
        return NextResponse.json({ error: 'Failed to extract og:image' }, { status: 500 });
    }
}
