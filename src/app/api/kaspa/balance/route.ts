import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Switch to Node.js runtime for better debugging

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        const targetUrl = `https://api-tn10.kaspa.org/addresses/${address}/balance`;
        console.log(`[Proxy] Fetching balance from: ${targetUrl}`);

        const response = await fetch(targetUrl);

        if (!response.ok) {
            console.error(`[Proxy] Upstream Error: ${response.status} ${response.statusText}`);
            throw new Error(`Kaspa API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[Proxy] Internal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
