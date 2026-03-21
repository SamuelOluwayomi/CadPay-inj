import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInjectiveWallet } from '@/lib/injective-wallet';
import { encrypt } from '@/utils/encryption';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { userId, businessName, email, authMethod } = await request.json();

        if (!userId || !businessName || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Initialize Supabase with Service Role to bypass RLS for initial creation
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Generate New Injective Wallet
        const { mnemonic, address } = generateInjectiveWallet();
        
        console.log(`🆕 Created Custodial Merchant Wallet: ${address} for ${businessName}`);

        // Encrypt credentials
        const encryptedKey = encrypt(mnemonic);

        // 3. Save to merchants table
        const { error: dbError } = await supabase
            .from('merchants')
            .upsert({
                id: userId,
                business_name: businessName,
                email: email,
                wallet_address: address,
                encrypted_private_key: encryptedKey,
                auth_method: authMethod || 'password',
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Merchant DB Upsert Error:', dbError);
            return NextResponse.json({ error: 'Failed to save merchant profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            address: address,
            message: 'Merchant wallet and profile created successfully'
        });

    } catch (error: any) {
        console.error('Merchant Wallet Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
