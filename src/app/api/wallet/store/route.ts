import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/utils/encryption';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
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

        const { privateKey, address, email } = await request.json();

        if (!privateKey || !address) {
            return NextResponse.json({ error: 'Missing privateKey or address' }, { status: 400 });
        }

        // Encrypt with Server Key (Custodial)
        const encryptedKey = encrypt(privateKey);

        // 1. Update Profiles (Primary Source of Truth for App)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                encrypted_private_key: encryptedKey,
                wallet_address: address
            })
            .eq('id', user.id);

        if (profileError) {
            console.error('Failed to update profile:', profileError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        // 2. Update User Credentials (Legacy/Backup)
        // We try to update if a record exists with this email
        if (email) {
            await supabase
                .from('user_credentials')
                .update({ encrypted_private_key: encryptedKey })
                .eq('email', email);
        }

        return NextResponse.json({ success: true, encryptedKey });

    } catch (error: any) {
        console.error('Store Wallet Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
