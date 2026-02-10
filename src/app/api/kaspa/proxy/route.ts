import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Use nodejs runtime for fetch compatibility if needed, though edge is fine too.

const KASPA_API_BASE = 'https://api-tn10.kaspa.org';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
        return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    try {
        // Construct target URL
        // We need to handle potential query params in the endpoint itself if passed, 
        // or we can pass them separately. For simplicity, let's assume 'endpoint' contains the path
        // and any other params are forwarded.

        // Actually, a cleaner way for the hook is to pass the full path as 'endpoint'.
        // Let's strip the leading slash if present.
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const targetUrl = `${KASPA_API_BASE}/${cleanEndpoint}`;

        // Forward any other query parameters (like limit, offset)
        const targetUrlObj = new URL(targetUrl);
        searchParams.forEach((value, key) => {
            if (key !== 'endpoint') {
                targetUrlObj.searchParams.append(key, value);
            }
        });

        const response = await fetch(targetUrlObj.toString(), {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Kaspa API Error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Kaspa Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
