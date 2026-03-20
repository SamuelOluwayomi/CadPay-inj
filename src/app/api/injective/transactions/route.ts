import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        // Using Sentry LCD endpoint which is more reliable for L1 events
        // Fetching both sent and received transactions
        const [sentRes, receivedRes] = await Promise.all([
            fetch(`https://testnet.sentry.lcd.injective.network/cosmos/tx/v1beta1/txs?events=message.sender='${address}'`),
            fetch(`https://testnet.sentry.lcd.injective.network/cosmos/tx/v1beta1/txs?events=transfer.recipient='${address}'`)
        ]);

        const sentData = sentRes.ok ? await sentRes.json() : { tx_responses: [] };
        const receivedData = receivedRes.ok ? await receivedRes.json() : { tx_responses: [] };

        const allTxs = [...(sentData.tx_responses || []), ...(receivedData.tx_responses || [])];
        
        // Map to uniform structure
        const transactions = allTxs.map((tx: any) => ({
            signature: tx.txhash,
            hash: tx.txhash,
            timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
            amount: 0, // Injective LCD doesn't give simple amount in the list, would need parsing
            err: tx.code !== 0,
            slot: parseInt(tx.height) || 0
        }));

        // Deduplicate and sort
        const uniqueTxs = Array.from(new Map(transactions.map(item => [item.signature, item])).values())
            .sort((a: any, b: any) => b.timestamp - a.timestamp);

        return NextResponse.json({ transactions: uniqueTxs });
    } catch (error: any) {
        console.error('Injective Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
