import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transferInj } from '@/lib/injective-wallet';
import { decrypt } from '@/utils/encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipient, amount, pin } = await request.json();

        if (!recipient || !amount || !pin) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Initialize Supabase with the user's auth context
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } }
            }
        );

        // 1. Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch profile data (encrypted key and stored pin)
        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .select('encrypted_private_key, pin')
            .eq('id', user.id)
            .single();

        if (dbError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // 3. Verify PIN
        if (profile.pin !== pin) {
            return NextResponse.json({ error: 'Invalid security PIN' }, { status: 403 });
        }

        if (!profile.encrypted_private_key) {
            return NextResponse.json({ error: 'Custodial wallet not found for this account' }, { status: 404 });
        }

        // 4. Decrypt the private key hex (stored as mnemonic field in creation)
        const mnemonicOrKey = decrypt(profile.encrypted_private_key);

        // Safety check for legacy broken wallets
        if (mnemonicOrKey === "random-mnemonic-not-recoverable") {
            return NextResponse.json({ 
                error: 'Legacy wallet detected. Please reset your account data in Security settings to generate a valid wallet.' 
            }, { status: 400 });
        }

        console.log(`🚀 [Server-Side Send] Executing transfer for: ${user.email}`);

        // 5. Execute transfer
        // transferInj handles both mnemonic (sentences) and hex keys (64 chars)
        const txHash = await transferInj({
            mnemonicOrKey,
            recipient,
            amount: Number(amount)
        });

        return NextResponse.json({
            success: true,
            txHash
        });

    } catch (error: any) {
        console.error('❌ Server-Side Send Error:', error);
        return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
    }
}
