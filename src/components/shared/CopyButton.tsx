'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon } from '@phosphor-icons/react';

export default function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`ml-4 p-2 rounded-lg transition-all duration-200 ${copied
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'text-orange-500 hover:text-orange-400 hover:bg-white/5'
                }`}
            title="Copy Address"
        >
            {copied ? <CheckIcon size={20} weight="bold" /> : <CopyIcon size={20} />}
        </button>
    );
}
