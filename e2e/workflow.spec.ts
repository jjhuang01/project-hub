import { test, expect } from '@playwright/test';

test.describe('Project Hub Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8888');
    });

    test('should load home page with projects', async ({ page }) => {
        await expect(page).toHaveTitle(/Project Hub/);
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('All Projects')).toBeVisible();
    });

    test('should filter by category', async ({ page }) => {
        // Click "Work" in sidebar (adjust locator if needed)
        await page.getByRole('link', { name: 'Work (YQ)' }).click();
        
        // URL should update
        await expect(page).toHaveURL(/\?category=work/);
        
        // Wait for filtering content
        await page.waitForTimeout(1000); 
        
        // Check for specific work project existence instead of just header
        // Assuming 'yq-admin' is a work project
        await expect(page.getByText('yq-admin')).toBeVisible();
    });

    test('should open PM2 Manager', async ({ page }) => {
        const trigger = page.getByText('PM2 Manager');
        await trigger.click();

        // Modal header
        await expect(page.getByText('System Process Monitor')).toBeVisible();
        
        // Wait for fetch
        await page.waitForTimeout(2000);
        
        // Verify list is not empty (check for CPU label which appears in cards)
        await expect(page.getByText('CPU').first()).toBeVisible();
        // Check for project-hub-ui name specifically
        await expect(page.getByText('project-hub-ui')).toBeVisible();
    });
});
