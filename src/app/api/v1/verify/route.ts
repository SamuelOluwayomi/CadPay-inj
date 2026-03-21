import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Public Subscription Verification API
 * GET /api/v1/verify?apiKey=...&address=...&serviceId=...
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const userAddress = searchParams.get('address');
    const serviceId = searchParams.get('serviceId');

    if (!apiKey || !userAddress || !serviceId) {
        return NextResponse.json({ 
            error: 'Missing parameters. Required: apiKey, address, serviceId' 
        }, { status: 400 });
    }

    try {
        // 1. Verify API Key and Get Merchant ID
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, name')
            .eq('api_key', apiKey)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // 2. Check for Active Subscription
        // We look for a subscription where profile.authority == userAddress
        // and service_id == serviceId and merchant_id == merchant.id
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                status,
                plan_name,
                next_billing_date,
                profiles:user_id (
                    authority
                )
            `)
            .eq('merchant_id', merchant.id)
            .eq('service_id', serviceId)
            .eq('status', 'active')
            .single();

        // Join filtering in Postgrest is tricky, so we filter the profile authority in the response or query
        // Using a better query to filter by profile authority
        const { data: activeSub, error: activeError } = await supabase
            .from('user_subscriptions')
            .select('*, profiles!inner(authority)')
            .eq('merchant_id', merchant.id)
            .eq('service_id', serviceId)
            .eq('status', 'active')
            .eq('profiles.authority', userAddress)
            .single();

        if (activeError || !activeSub) {
            return NextResponse.json({ 
                verified: false, 
                message: 'No active subscription found for this user/service.' 
            });
        }

        return NextResponse.json({
            verified: true,
            merchant: merchant.name,
            serviceId: serviceId,
            plan: activeSub.plan_name,
            status: activeSub.status,
            expiresAt: activeSub.next_billing_date
        });

    } catch (error: any) {
        console.error('API Verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
