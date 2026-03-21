"use client";

import { ReactNode, useState, useEffect } from 'react'
import { LoaderProvider } from '@/context/LoaderContext'
import { ToastProvider } from '@/context/ToastContext'
import { UserProvider } from '@/context/UserContext'
import { MerchantProvider } from '@/context/MerchantContext'

export function Providers({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <ToastProvider>
            <LoaderProvider>
                <UserProvider>
                    <MerchantProvider>
                        {mounted ? (
                            <>
                                {children}
                            </>
                        ) : (
                            <>{children}</>
                        )}
                    </MerchantProvider>
                </UserProvider>
            </LoaderProvider>
        </ToastProvider>
    )
}
