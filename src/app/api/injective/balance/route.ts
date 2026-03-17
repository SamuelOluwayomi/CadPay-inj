import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        // Using LCD endpoint but via server to avoid CORS/SSL issues in browser
        const response = await fetch(`https://testnet.lcd.injective.network/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uinj`);
        
        if (!response.ok) {
            // If the account doesn't exist yet, return 0 balance
            if (response.status === 404) {
                return NextResponse.json({ balance: { amount: "0" } });
            }
            return NextResponse.json({ error: 'Failed to fetch balance' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Balance Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
