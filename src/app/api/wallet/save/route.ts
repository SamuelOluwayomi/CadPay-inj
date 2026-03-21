import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stakeInj } from '@/lib/injective-wallet';
import { decrypt } from '@/utils/encryption';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { userId, potName, amount, lockupMonths, txHash: clientTxHash } = await request.json();

        let finalTxHash = clientTxHash;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        if (!finalTxHash) {
            // 1. Fetch encrypted key
            const { data, error } = await supabase
                .from('profiles')
                .select('encrypted_private_key')
                .eq('id', userId)
                .single();

            if (!data?.encrypted_private_key) throw new Error("Wallet not found or non-custodial wallet trying to use server route.");

            // 2. Decrypt the key
            const rawHexKey = decrypt(data.encrypted_private_key);

            // 3. Stake the INJ on the blockchain!
            finalTxHash = await stakeInj({
                mnemonicOrKey: rawHexKey,
                amount: Number(amount)
            });
        }

        // 1. Calculate the exact unlock date
        const unlockDate = new Date();
        unlockDate.setMonth(unlockDate.getMonth() + Number(lockupMonths));

        // 4. Save the Pot to the database
        await supabase.from('savings_pots').insert({
            user_id: userId,
            name: potName,
            amount: Number(amount),
            tx_hash: finalTxHash,
            status: 'locked',
            unlock_date: unlockDate.toISOString()
        });

        return NextResponse.json({ success: true, txHash: finalTxHash });

    } catch (error: any) {
        console.error("❌ Staking Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
