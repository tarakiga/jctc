'use client'

import { useState } from 'react'

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
]

export function LanguageSwitcher() {
    const [currentLang, setCurrentLang] = useState('en')
    const [isOpen, setIsOpen] = useState(false)

    const changeLanguage = (langCode: string) => {
        setCurrentLang(langCode)
        setIsOpen(false)
        // Store preference
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred-language', langCode)
        }
        // TODO: Integrate with next-i18next when installed
        // router.push(router.pathname, router.asPath, { locale: langCode })
    }

    const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="text-lg" aria-hidden="true">{currentLanguage.flag}</span>
                <span>{currentLanguage.code.toUpperCase()}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1"
                        role="listbox"
                        aria-label="Language options"
                    >
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left ${currentLang === lang.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-900'
                                    }`}
                                role="option"
                                aria-selected={currentLang === lang.code}
                            >
                                <span className="text-xl" aria-hidden="true">{lang.flag}</span>
                                <span className="flex-1 font-medium">{lang.name}</span>
                                {currentLang === lang.code && (
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
