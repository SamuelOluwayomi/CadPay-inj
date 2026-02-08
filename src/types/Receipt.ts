export interface Receipt {
    id: string;
    wallet_address: string;
    service_name: string;
    plan_name: string;
    amount_kas: number;
    amount_usd: number;
    tx_signature: string;
    timestamp: string;
    status: 'completed' | 'failed';
    merchant_wallet: string;
}
