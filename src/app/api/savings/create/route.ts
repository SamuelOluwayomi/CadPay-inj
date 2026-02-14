import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/utils/encryption';
// @ts-ignore
const kaspa = require('@kaspa/core-lib');

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { userId, name, durationMonths } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');

        // 1. Generate a Unique Wallet for this Pot
        const privateKey = new kaspa.PrivateKey();
        const address = privateKey.toAddress(kaspa.Networks.testnet).toString();
        const privateKeyHex = privateKey.toString();

        console.log(`🆕 Created Pot Address: ${address}`);

        // 2. Encrypt Private Key
        const encryptedKey = encrypt(privateKeyHex);

        // 3. Verify Auth & Database Connection
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader || '' } }
            }
        );

        // 4. Save to savings_pots table
        const { error: dbError } = await supabase
            .from('savings_pots')
            .insert({
                user_address: userId,
                name: name,
                address: address, // Pot Address
                encrypted_private_key: encryptedKey,
                duration_months: durationMonths,
                status: 'active'
            });

        if (dbError) {
            console.error('Failed to save pot to DB:', dbError);
            return NextResponse.json({ error: 'Database error', details: dbError }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            address: address,
            message: 'Pot wallet created successfully'
        });

    } catch (error: any) {
        console.error('Pot Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
