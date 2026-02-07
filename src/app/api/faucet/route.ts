import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Faucet API - Fund Request System
 * Creates a fund request in the database instead of signing server-side
 * Admin will approve requests from the admin dashboard using KasWare
 */
export async function POST(request: Request) {
    try {
        const { address } = await request.json();

        // Validate address
        if (!address || typeof address !== 'string') {
            return NextResponse.json(
                { error: 'Invalid wallet address' },
                { status: 400 }
            );
        }

        // Check if user already has a pending request
        const { data: existingRequest } = await supabase
            .from('fund_requests')
            .select('id, status')
            .eq('user_address', address)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            return NextResponse.json(
                {
                    error: 'You already have a pending fund request. Please wait for approval.',
                    requestId: existingRequest.id
                },
                { status: 429 }
            );
        }

        // Create new fund request
        const { data: newRequest, error: insertError } = await supabase
            .from('fund_requests')
            .insert([
                {
                    user_address: address,
                    amount: 10000000000, // 100 KAS in sompi
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Failed to create fund request:', insertError);
            return NextResponse.json(
                { error: 'Failed to create fund request' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Fund request submitted! Waiting for admin approval.',
            requestId: newRequest.id,
            amount: 100, // KAS
            status: 'pending'
        });

    } catch (error: any) {
        console.error('Faucet API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
