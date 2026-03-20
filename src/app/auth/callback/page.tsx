'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        const processAuth = async () => {
            try {
                // Supabase automatically pulls the #access_token from the URL fragment
                // and establishes the session in local storage for us on the client.
                const { data, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error('❌ Auth callback error:', error);
                    router.push('/');
                } else if (data.session) {
                    console.log('✅ Auth successful. Session established, redirecting to Dashboard...');
                    
                    // Delay slightly to ensure local storage sync is completed across hooks
                    setTimeout(() => {
                        if (mounted) router.push('/dashboard');
                    }, 500);
                } else {
                    console.log('⚠️ No session found in callback, redirecting home.');
                    router.push('/');
                }
            } catch (err) {
                console.error('❌ Unexpected callback error:', err);
                if (mounted) router.push('/');
            }
        };

        processAuth();

        return () => {
            mounted = false;
        };
    }, [router]);

    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-black text-white px-4 text-center">
            {/* Simple Pulsing Logo / Loader */}
            <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-3xl flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(249,115,22,0.1)]">
                <img src="/icon.ico" alt="CadPay" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight">Authenticating...</h1>
            <p className="text-zinc-500 text-sm">Safely verifying your connection.</p>
        </div>
    );
}
