import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Switch to Node.js runtime for better debugging

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        const targetUrl = `https://testnet.lcd.injective.network/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uinj`;
        console.log(`[Proxy] Fetching balance from: ${targetUrl}`);

        const response = await fetch(targetUrl);

        if (!response.ok) {
            console.error(`[Proxy] Upstream Error: ${response.status} ${response.statusText}`);
            throw new Error(`Injective API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // Convert uinj to INJ in the response if needed, or just pass it through
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[Proxy] Internal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
