// @ts-check
import { test, expect } from '@playwright/test';

test.describe('App Initial Load', () => {
  test('should have correct title and initial controls visible', async ({ page }) => {
    // Playwright uses baseURL from playwright.config.js, so page.goto('/') goes to http://localhost:8081/
    await page.goto('/');

    // 1. Check page title
    await expect(page).toHaveTitle('double-image-vue'); // Corrected expected title

    // 2. Check if initial controls are visible
    // Assuming MainControls component is rendered and in 'initial' stage
    // The "Select Template" button has id="pickPredefinedBtn"
    const selectTemplateButton = page.locator('#pickPredefinedBtn');
    await expect(selectTemplateButton).toBeVisible();
    await expect(selectTemplateButton).toHaveText('Select Template');

    // 3. Check if "Upload Template" button is visible
    const uploadTemplateButton = page.locator('#loadTemplateBtn');
    await expect(uploadTemplateButton).toBeVisible();
    await expect(uploadTemplateButton).toHaveText('Upload Template');

    // 4. Check that drawing-related buttons are not initially visible
    // e.g., "Save Drawing 1" button (id="save1Btn") should not exist or not be visible
    const saveDrawing1Button = page.locator('#save1Btn');
    await expect(saveDrawing1Button).not.toBeVisible(); 
  });

  test('clicking "Select Template" should show thumbnail picker', async ({ page }) => {
    await page.goto('/');

    const selectTemplateButton = page.locator('#pickPredefinedBtn');
    await selectTemplateButton.click();

    // Assuming ThumbnailPicker component becomes visible
    // Let's say ThumbnailPicker has a specific identifiable element, e.g., a class or id
    // For now, let's assume it has a class 'thumbnail-picker-container'
    // We need to know an actual selector for ThumbnailPicker's wrapper
    // For this example, let's assume ThumbnailPicker component itself has an ID or a unique child.
    // The actual ID is "predefinedThumbnailsContainer".
    const thumbnailPicker = page.locator('#predefinedThumbnailsContainer'); 
    await expect(thumbnailPicker).toBeVisible();
    
    // A better check might be for one of the template images within it
    // e.g., page.locator('img[alt="Simple Stick Figure"]')
    // For now, this test is a starting point.
  });
});
