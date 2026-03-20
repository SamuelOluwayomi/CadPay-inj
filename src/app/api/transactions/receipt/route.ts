import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Initialize Supabase with the SERVICE_ROLE_KEY to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify the user session first using the provided auth token
        const { data: { user }, error: authError } = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ).auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Insert the receipt
        const { data, error: insertError } = await supabase
            .from('receipts')
            .insert([{
                ...body,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Proxy Receipt Insert Error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ Receipt Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create receipt' }, { status: 500 });
    }
}
