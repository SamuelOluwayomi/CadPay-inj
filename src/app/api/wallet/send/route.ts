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

        const { recipient, amount, pin, service_name, plan_name } = await request.json();

        if (!recipient || !amount || !pin) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Initialize Supabase with service role for administrative tasks
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify session using user's token
        const authUser = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ).auth.getUser(authHeader.replace('Bearer ', ''));

        if (authUser.error || !authUser.data.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = authUser.data.user;

        // 2. Fetch profile data (encrypted key, stored pin, AND wallet address)
        const { data: profile, error: dbError } = await supabaseAdmin
            .from('profiles')
            .select('encrypted_private_key, pin, wallet_address')
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

        // 4. Decrypt the private key
        const mnemonicOrKey = decrypt(profile.encrypted_private_key);

        if (mnemonicOrKey === "random-mnemonic-not-recoverable") {
            return NextResponse.json({ 
                error: 'Legacy wallet detected. Please reset your account data in Security settings.' 
            }, { status: 400 });
        }

        console.log(`🚀 [Server-Side Send] Executing transfer for: ${user.email}`);

        // 5. Execute transfer
        const txHash = await transferInj({
            mnemonicOrKey,
            recipient,
            amount: Number(amount)
        });

        // 6. Create Receipt (Securely on backend)
        try {
            const injPrice = 25; // Fallback or fetch if needed
            await supabaseAdmin.from('receipts').insert({
                wallet_address: profile.wallet_address,
                service_name: service_name || 'External Transfer',
                plan_name: plan_name || 'Direct Transfer',
                amount_inj: Number(amount),
                amount_usd: Number(amount) * injPrice,
                tx_signature: txHash,
                status: 'completed',
                sender_address: profile.wallet_address,
                receiver_address: recipient
            });
        } catch (receiptErr) {
            console.error('⚠️ Transaction sent but receipt failed:', receiptErr);
        }

        return NextResponse.json({
            success: true,
            txHash
        });

    } catch (error: any) {
        console.error('❌ Server-Side Send Error:', error);
        return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
    }
}
