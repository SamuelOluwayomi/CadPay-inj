import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInjectiveWallet } from '@/lib/injective-wallet';
import { encrypt } from '@/utils/encryption';

// Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        // 1. Authenticate User via Supabase Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Generate New Injective Wallet
        const { mnemonic, address } = generateInjectiveWallet();
        
        console.log(`🆕 Created Custodial Injective Wallet: ${address}`);

        // Encrypt credentials
        const encryptedKey = encrypt(mnemonic);

        // 4. Save to Supabase
        const { error: dbError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                wallet_address: address,
                encrypted_private_key: encryptedKey,
                email: user.email,
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('DB Upsert Error:', dbError);
            return NextResponse.json({ error: 'Failed to save wallet to profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            address: address,
            message: 'Custodial Injective wallet created successfully'
        });

    } catch (error: any) {
        console.error('Wallet Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
