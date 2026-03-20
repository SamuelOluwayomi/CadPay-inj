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
        const explorerApi = new IndexerGrpcExplorerApi(endpoints.explorer || 'https://testnet.explorer.grpc-web.injective.network');

        // 3. Fetch the transaction history
        const txs = await explorerApi.fetchAccountTx({
            address: address, // Corrected from account
            limit: 15,
        });

        // The response structure is { txs: [], pagination: {} }
        const transactions = (txs.txs || []).map((tx: any) => {
            // Attempt to parse amount from messages (MsgSend)
            let amount = 0;
            try {
                const message = tx.messages?.[0];
                if (message && (message.type === 'cosmos-sdk/MsgSend' || message.type?.includes('MsgSend'))) {
                    const amountStr = message.value?.amount?.[0]?.amount || "0";
                    amount = Number(amountStr) / 1e18; // Convert from uinj to INJ
                }
            } catch (e) {
                console.warn("Failed to parse amount for tx:", tx.hash);
            }

            return {
                signature: tx.hash,
                hash: tx.hash,
                timestamp: tx.blockTimestamp ? new Date(tx.blockTimestamp).getTime() : Date.now(),
                amount: amount,
                err: tx.code !== 0,
                slot: tx.blockNumber || 0,
                viewUrl: `https://testnet.explorer.injective.network/transaction/${tx.hash}`
            };
        });

        return NextResponse.json({ 
            success: true,
            transactions: transactions 
        });

    } catch (error: any) {
        console.error('❌ Explorer API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
