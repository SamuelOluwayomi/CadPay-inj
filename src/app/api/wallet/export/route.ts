import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/utils/encryption';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Fetch encrypted private key from profile
        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .select('encrypted_private_key')
            .eq('id', user.id)
            .single();

        if (dbError || !profile?.encrypted_private_key) {
            return NextResponse.json({ error: 'No custodial wallet found for this account' }, { status: 404 });
        }

        // Decrypt the mnemonic
        const mnemonic = decrypt(profile.encrypted_private_key);

        console.log(`🔐 Exported custodial wallet for user: ${user.email}`);

        return NextResponse.json({
            success: true,
            mnemonic: mnemonic
        });

    } catch (error: any) {
        console.error('Wallet Export Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
