import { NextResponse } from 'next/server';
import { IndexerGrpcExplorerApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        console.log(`🔍 [Transactions] Fetching history via SDK for: ${address}`);

        // 1. Grab the official Testnet endpoints
        const endpoints = getNetworkEndpoints(Network.TestnetSentry);

        // 2. Initialize the official Explorer API wrapper
        const explorerApi = new IndexerGrpcExplorerApi(endpoints.explorer);

        // 3. Fetch the transaction history
        const txs = await explorerApi.fetchAccountTx({
            account: address,
            limit: 15,
        });

        const transactions = (txs.items || []).map((tx: any) => ({
            signature: tx.hash,
            hash: tx.hash,
            timestamp: tx.blockTimestamp ? new Date(tx.blockTimestamp).getTime() : Date.now(),
            amount: 0, 
            err: tx.code !== 0,
            slot: tx.blockNumber || 0
        }));

        return NextResponse.json({ 
            success: true,
            transactions: transactions 
        });

    } catch (error: any) {
        console.error('❌ Explorer API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
