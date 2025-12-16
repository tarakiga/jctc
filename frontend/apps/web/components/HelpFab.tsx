'use client';

import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function HelpFab() {
    // In development, the guide runs on port 8001 (separate from frontend 3000/3001)
    // In production, it should be served at /guide/ via reverse proxy
    const guideUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:8001/guide/'
        : '/guide/';

    return (
        <Link
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 p-3 bg-black text-white rounded-full shadow-xl hover:scale-110 hover:shadow-2xl transition-all duration-300 group print:hidden"
            aria-label="Open User Guide"
        >
            <HelpCircle className="w-8 h-8" strokeWidth={1.5} />
            <span className="sr-only">Help & User Guide</span>

            {/* Simple Custom Tooltip */}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                User Guide
            </span>
        </Link>
    );
}
