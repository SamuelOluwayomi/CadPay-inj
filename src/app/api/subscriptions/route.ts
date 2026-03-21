import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { 
            userId, 
            merchantId, 
            serviceId, 
            serviceName, 
            planName, 
            priceUsd, 
            priceInj 
        } = await request.json();

        if (!userId || !serviceId || !serviceName || !planName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('user_subscriptions')
            .insert([{
                user_id: userId,
                merchant_id: merchantId || null,
                service_id: serviceId,
                service_name: serviceName,
                plan_name: planName,
                price_usd: priceUsd,
                price_inj: priceInj,
                status: 'active',
                next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error recording subscription:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const merchantId = searchParams.get('merchantId');

    try {
        let query = supabase.from('user_subscriptions').select('*');

        if (userId) {
            query = query.eq('user_id', userId);
        } else if (merchantId) {
            if (merchantId === 'admin') {
                // Fetch all subscriptions where merchant_id is NULL or 'admin'
                query = query.is('merchant_id', null);
            } else {
                query = query.eq('merchant_id', merchantId);
            }
        } else {
            return NextResponse.json({ error: 'User ID or Merchant ID missing' }, { status: 400 });
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
