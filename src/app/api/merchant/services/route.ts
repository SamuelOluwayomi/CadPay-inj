import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { 
            merchantId, 
            name, 
            category, 
            description, 
            imageUrl, 
            color,
            priceBasic,
            pricePro,
            priceEnterprise,
            featuresBasic,
            featuresPro,
            featuresEnterprise
        } = await request.json();

        if (!merchantId || !name || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('merchant_services')
            .insert([{
                merchant_id: merchantId,
                name,
                category,
                description,
                image_url: imageUrl,
                color: color || '#F97316',
                price_basic: priceBasic || 0.00,
                price_pro: pricePro || 0.00,
                price_enterprise: priceEnterprise || 0.00,
                features_basic: featuresBasic || [],
                features_pro: featuresPro || [],
                features_enterprise: featuresEnterprise || []
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating merchant service:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    try {
        let query = supabase.from('merchant_services').select(`
            *,
            merchants:merchant_id (
                wallet_address
            )
        `);
        
        if (merchantId) {
            query = query.eq('merchant_id', merchantId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the data
        const flattenedData = data.map(s => ({
            ...s,
            merchant_wallet: (s.merchants as any)?.wallet_address
        }));

        return NextResponse.json(flattenedData);
    } catch (error: any) {
        console.error('Error fetching services:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
