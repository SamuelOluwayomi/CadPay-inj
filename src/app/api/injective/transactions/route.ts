import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        console.log(`🔍 [Transactions] Fetching history for: ${address}`);

        // Use Injective Explorer API for Testnet
        const explorerUrl = `https://testnet.explorer.injective.network/api/v1/addresses/${address}/transactions`;
        
        const response = await fetch(explorerUrl, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 10 } // Cache for 10 seconds
        });

        if (!response.ok) {
            throw new Error(`Explorer API failed with status: ${response.status}`);
        }

        const data = await response.json();
        const txs = data.data || [];

        // Map Explorer data to our internal format
        const transactions = txs.map((tx: any) => ({
            signature: tx.hash,
            hash: tx.hash,
            timestamp: tx.block_timestamp ? new Date(tx.block_timestamp).getTime() : Date.now(),
            amount: 0, // Finding amounts in raw txs is complex, but signature is enough for list
            err: tx.code !== 0,
            slot: tx.block_number || 0
        }));

        const sortedTxs = transactions.sort((a: any, b: any) => b.timestamp - a.timestamp);

        return NextResponse.json({ transactions: sortedTxs });
    } catch (error: any) {
        console.error('Injective Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
