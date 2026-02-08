// src/types/global.d.ts

interface Window {
    kasware?: {
        requestAccounts: () => Promise<string[]>;
        getAccounts: () => Promise<string[]>;
        getNetwork: () => Promise<string>;
        switchNetwork: (network: string) => Promise<string>;
        signMessage: (message: string) => Promise<string>;
        signTransaction: (tx: string) => Promise<string>;
        getBalance: () => Promise<{ total: number; confirmed: number; unconfirmed: number }>;
        sendKaspa: (toAddress: string, amountSompi: number) => Promise<string>;
        on: (event: string, handler: (data: any) => void) => void;
    };
}
