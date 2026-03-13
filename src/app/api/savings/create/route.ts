import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/utils/encryption';
import { Mnemonic, PrivateKey } from '@injectivelabs/sdk-ts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { userId, name, durationMonths } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');

        // 1. Generate Injective Wallet
        console.log(`Generating Injective wallet for pot: ${name}`);
        const mnemonic = Mnemonic.generate();
        const privateKey = PrivateKey.fromMnemonic(mnemonic);
        const address = privateKey.toBech32();
        
        // We store the mnemonic as the private key for recovery/custodial signing
        const privateKeyHex = mnemonic; 

        console.log(`🆕 Created Injective Pot Address: ${address}`);

        // 2. Encrypt Mnemonic
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
        const { data, error: dbError } = await supabase
            .from('savings_pots')
            .insert({
                user_address: userId,
                name: name,
                address: address, // Injective Pot Address
                encrypted_private_key: encryptedKey,
                duration_months: durationMonths,
                status: 'active',
                balance: 0,
                unlock_time: Math.floor(Date.now() / 1000) + (durationMonths * 30 * 24 * 60 * 60),
            })
            .select()
            .single();

        if (dbError) {
            console.error('Failed to save pot to DB:', dbError);
            return NextResponse.json({ error: 'Database error', details: dbError }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            pot: data, // Return the full pot object
            message: 'Injective pot wallet created successfully'
        });

    } catch (error: any) {
        console.error('Pot Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
