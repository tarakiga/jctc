import { useEffect, useCallback } from 'react';

type KeyCombo = string;
type Handler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    combo: KeyCombo;
    handler: Handler;
    description?: string;
}

export function useKeyboardShortcut(shortcuts: ShortcutConfig[]) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Ignore if focus is on an input or textarea, unless it's a global shortcut like escape
            const target = event.target as HTMLElement;
            if (
                (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
                event.key !== 'Escape'
            ) {
                return;
            }

            shortcuts.forEach(({ combo, handler }) => {
                const keys = combo.toLowerCase().split('+');
                const mainKey = keys[keys.length - 1];

                const isCtrl = keys.includes('ctrl');
                const isShift = keys.includes('shift');
                const isAlt = keys.includes('alt');
                const isMeta = keys.includes('meta') || keys.includes('cmd');

                if (
                    event.key.toLowerCase() === mainKey &&
                    event.ctrlKey === isCtrl &&
                    event.shiftKey === isShift &&
                    event.altKey === isAlt &&
                    event.metaKey === isMeta
                ) {
                    event.preventDefault();
                    handler(event);
                }
            });
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
