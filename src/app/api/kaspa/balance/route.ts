import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for speed

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        // The server fetches data (CORS doesn't apply here)
        const response = await fetch(`https://api-tn10.kaspa.org/addresses/${address}/balance`);

        if (!response.ok) {
            throw new Error(`Kaspa API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
