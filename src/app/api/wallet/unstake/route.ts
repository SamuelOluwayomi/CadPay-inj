import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstakeInj } from '@/lib/injective-wallet';
import { decrypt } from '@/utils/encryption';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, potId, txHash: clientTxHash } = body;

        if (!userId || !potId) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // 2. Get the pot info first to verify amounts etc.
        const { data: pot, error: potError } = await supabaseAdmin
            .from('savings_pots')
            .select('*')
            .eq('id', potId)
            .eq('user_id', userId)
            .single();

        if (potError || !pot) {
            return NextResponse.json({ success: false, error: "Pot not found" }, { status: 404 });
        }

        if (pot.status === 'unstaked') {
             return NextResponse.json({ success: false, error: "Already unstaked" }, { status: 400 });
        }

        let finalTxHash = clientTxHash;

        if (!finalTxHash) {
            // 1. Get User Profile to get encrypted mnemonic
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('encrypted_private_key, address')
                .eq('id', userId)
                .single();

            if (profileError || !profile || !profile.encrypted_private_key) {
                return NextResponse.json({ success: false, error: "Custodial setup not found. Ensure wallet is synced." }, { status: 400 });
            }

            const privateKey = decrypt(profile.encrypted_private_key);
            
            // 3. Unstake on-chain
            finalTxHash = await unstakeInj({
                mnemonicOrKey: privateKey,
                amount: Number(pot.amount)
            });
        }

        // 4. Update DB
        const { error: dbError } = await supabaseAdmin
            .from('savings_pots')
            .update({ status: 'unstaked', tx_hash: finalTxHash }) // update txHash to the undelegate tx
            .eq('id', potId);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, txHash: finalTxHash });
    } catch (e: any) {
        console.error("Unstaking error:", e);
        return NextResponse.json({ success: false, error: e.message || "Failed to break pot." }, { status: 500 });
    }
}
