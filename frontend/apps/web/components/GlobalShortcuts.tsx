'use client';

import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function GlobalShortcuts() {
    const router = useRouter();
    const [magicKey, setMagicKey] = useState<string | null>(null);

    // Reset magic key after 1 second
    useEffect(() => {
        if (magicKey) {
            const timer = setTimeout(() => setMagicKey(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [magicKey]);

    useKeyboardShortcut([
        // Global Navigation (G then ...)
        {
            combo: 'g',
            handler: () => setMagicKey('g'),
        },
        {
            combo: 'd',
            handler: () => {
                if (magicKey === 'g') {
                    router.push('/');
                    setMagicKey(null);
                }
            },
        },
        {
            combo: 'c',
            handler: () => {
                if (magicKey === 'g') {
                    router.push('/cases');
                    setMagicKey(null);
                }
            },
        },
        {
            combo: 'e',
            handler: () => {
                if (magicKey === 'g') {
                    router.push('/evidence');
                    setMagicKey(null);
                }
            },
        },
        {
            combo: 'i',
            handler: () => {
                if (magicKey === 'g') {
                    router.push('/intelligence');
                    setMagicKey(null);
                }
            },
        },
        {
            combo: 's',
            handler: () => {
                if (magicKey === 'g') {
                    router.push('/admin'); // Assuming settings is admin for now
                    setMagicKey(null);
                }
            },
        },
        // Global Search
        {
            combo: 'ctrl+k',
            handler: () => {
                // Trigger global search focus - dispatch a custom event
                window.dispatchEvent(new CustomEvent('open-global-search'));
            },
        },
        // Help
        {
            combo: '?',
            handler: () => {
                // Could toggle a help modal
                console.log('Show help');
            },
        },
    ]);

    return null;
}
