/**
 * Accessibility testing utilities using axe-core
 * Only runs in development mode
 */

'use client'

import React, { useEffect } from 'react'

let axe: any = null

// Dynamically import axe-core only in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    import('@axe-core/react').then((module) => {
        axe = module.default
    })
}

/**
 * Accessibility monitor component
 * Place this in your root layout to enable automatic accessibility testing
 */
export function AccessibilityMonitor() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && axe) {
            const React = require('react')
            const ReactDOM = require('react-dom')

            axe(React, ReactDOM, 1000, {
                rules: [
                    // Enable all rules
                ]
            })

            console.log('🔍 Axe accessibility testing enabled')
        }
    }, [])

    return null
}

/**
 * Manual accessibility testing function
 * Run this in the browser console to test a specific element
 */
export async function testAccessibility(element?: HTMLElement) {
    if (typeof window === 'undefined') return

    const { default: axeCore } = await import('axe-core')

    const results = await axeCore.run(element || document.body)

    console.group('♿ Accessibility Test Results')
    console.log('Violations:', results.violations.length)
    console.log('Passes:', results.passes.length)
    console.log('Incomplete:', results.incomplete.length)

    if (results.violations.length > 0) {
        console.group('🔴 Violations')
        results.violations.forEach((violation, index) => {
            console.group(`${index + 1}. ${violation.help}`)
            console.log('Impact:', violation.impact)
            console.log('Description:', violation.description)
            console.log('Help URL:', violation.helpUrl)
            console.log('Affected elements:', violation.nodes.length)
            violation.nodes.forEach((node) => {
                console.log('  -', node.html)
                console.log('    Fix:', node.failureSummary)
            })
            console.groupEnd()
        })
        console.groupEnd()
    }

    if (results.incomplete.length > 0) {
        console.group('⚠️ Incomplete (needs manual review)')
        results.incomplete.forEach((item) => {
            console.log(`- ${item.help}`)
        })
        console.groupEnd()
    }

    console.groupEnd()

    return results
}

// Make available globally for console access
if (typeof window !== 'undefined') {
    ; (window as any).testAccessibility = testAccessibility
}
