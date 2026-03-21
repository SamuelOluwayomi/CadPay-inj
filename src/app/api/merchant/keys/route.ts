import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


function generateApiKey() {
    return `cp_${require('crypto').randomBytes(24).toString('hex')}`;
}

export async function POST(request: Request) {
    try {
        const { merchantId } = await request.json();

        if (!merchantId) {
            return NextResponse.json({ error: 'Merchant ID missing' }, { status: 400 });
        }

        const newKey = generateApiKey();

        const { data, error } = await supabase
            .from('merchants')
            .update({ api_key: newKey })
            .eq('id', merchantId)
            .select('api_key')
            .single();

        if (error) throw error;

        return NextResponse.json({ apiKey: data.api_key });
    } catch (error: any) {
        console.error('Error updating API key:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
        return NextResponse.json({ error: 'Merchant ID missing' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('merchants')
            .select('api_key')
            .eq('id', merchantId)
            .single();

        if (error) throw error;

        return NextResponse.json({ apiKey: data.api_key });
    } catch (error: any) {
        console.error('Error fetching API key:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
