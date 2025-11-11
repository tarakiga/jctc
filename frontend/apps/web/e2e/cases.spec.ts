import { test, expect } from '@playwright/test'

test.describe('Cases Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@jctc.gov')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('User can view cases list', async ({ page }) => {
    await page.goto('/cases')
    await expect(page).toHaveTitle(/Cases/)
    await expect(page.locator('h2')).toContainText('Cases')
    
    // Check if cases are loaded
    await expect(page.locator('[data-testid="case-card"]').first()).toBeVisible()
  })

  test('User can search cases', async ({ page }) => {
    await page.goto('/cases')
    
    // Search for a case
    await page.fill('[placeholder*="Search"]', 'Business Email')
    await page.waitForTimeout(500) // Debounce
    
    // Verify filtered results
    const caseCards = page.locator('[data-testid="case-card"]')
    await expect(caseCards.first()).toContainText('Business Email')
  })

  test('User can filter cases by status', async ({ page }) => {
    await page.goto('/cases')
    
    // Select status filter
    await page.selectOption('[name="status-filter"]', 'OPEN')
    
    // Verify only OPEN cases are shown
    const statusBadges = page.locator('[data-testid="status-badge"]')
    await expect(statusBadges.first()).toContainText('Open')
  })

  test('User can create new case', async ({ page }) => {
    await page.goto('/cases/new')
    
    // Fill in form
    await page.fill('[name="title"]', 'Test Case ' + Date.now())
    await page.fill('[name="description"]', 'This is a test case description')
    await page.selectOption('[name="severity"]', '3')
    await page.selectOption('[name="case_type"]', 'FRAUD')
    await page.fill('[name="date_reported"]', '2025-01-15')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to case detail
    await expect(page).toHaveURL(/\/cases\/[\w-]+/)
    await expect(page.locator('h2')).toContainText('JCTC-')
  })

  test('User can view case details', async ({ page }) => {
    await page.goto('/cases')
    
    // Click first case
    await page.locator('[data-testid="case-card"]').first().click()
    
    // Verify case detail page
    await expect(page.locator('h2')).toContainText('JCTC-')
    await expect(page.locator('[role="tablist"]')).toBeVisible()
  })

  test('User can navigate between tabs', async ({ page }) => {
    await page.goto('/cases/1')
    
    // Click evidence tab
    await page.click('[role="tab"]:has-text("Evidence")')
    await expect(page.locator('[role="tabpanel"]')).toBeVisible()
    
    // Click timeline tab
    await page.click('[role="tab"]:has-text("Timeline")')
    await expect(page.locator('[role="tabpanel"]')).toBeVisible()
  })

  test('User sees error for invalid case ID', async ({ page }) => {
    await page.goto('/cases/invalid-id-123')
    
    // Should show error message
    await expect(page.locator('text=Case Not Found')).toBeVisible()
    await expect(page.locator('text=Back to Cases')).toBeVisible()
  })

  test('User can filter cases by severity', async ({ page }) => {
    await page.goto('/cases')
    
    // Select critical severity
    await page.selectOption('[name="severity-filter"]', '5')
    
    // Verify critical badge is shown
    const severityBadges = page.locator('[data-testid="severity-badge"]')
    await expect(severityBadges.first()).toContainText('Critical')
  })
})
