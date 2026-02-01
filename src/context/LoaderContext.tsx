'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type LoaderContextType = {
    hasLoaded: boolean;
    setHasLoaded: (value: boolean) => void;
};

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
    const [hasLoaded, setHasLoaded] = useState(false);

    return (
        <LoaderContext.Provider value={{ hasLoaded, setHasLoaded }}>
            {children}
        </LoaderContext.Provider>
    );
}

export function useLoader() {
    const context = useContext(LoaderContext);
    if (context === undefined) {
        throw new Error('useLoader must be used within a LoaderProvider');
    }
    return context;
}
