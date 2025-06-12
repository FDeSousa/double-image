// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Full Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the page before each test in this suite
    await page.goto('/');
  });

  test('should allow user to select template, make two drawings, and see comparison results', async ({ page }) => {
    // 1. Select a template
    await page.locator('#pickPredefinedBtn').click();
    // Assuming the first thumbnail is "Simple Stick"
    // Need a robust selector for the thumbnail items
    // If .thumbnail-item is the clickable element:
    await page.locator('.thumbnail-item').first().click(); 
    
    // Verify stage is drawing1
    // We need a way to check the current stage. If it's reflected in a visible element's text or attribute:
    // For now, assume MainControls has an element that shows the stage, e.g., a status display
    // Or, check button visibility changes. "Save Drawing 1" button should be visible.
    await expect(page.locator('#save1Btn')).toBeVisible();

    // 2. Make first drawing
    const canvas = page.locator('#drawingCanvas');
    const canvasBoundingBox = await canvas.boundingBox();
    if (!canvasBoundingBox) throw new Error('Canvas not found or not visible');

    await page.mouse.move(canvasBoundingBox.x + canvasBoundingBox.width / 2, canvasBoundingBox.y + canvasBoundingBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBoundingBox.x + canvasBoundingBox.width / 2 + 50, canvasBoundingBox.y + canvasBoundingBox.height / 2 + 50);
    await page.mouse.up();

    // 3. Save Drawing 1
    await page.locator('#save1Btn').click();
    // Verify stage is readyForDrawing2 (e.g., "Start Drawing 2" button is visible)
    await expect(page.locator('#start2Btn')).toBeVisible(); // Corrected ID

    // 4. Start Drawing 2
    await page.locator('#start2Btn').click(); // Corrected ID
    // Verify stage is drawing2 (e.g., "Save Drawing 2" button is visible)
    await expect(page.locator('#save2Btn')).toBeVisible();

    // 5. Make second drawing
    await page.mouse.move(canvasBoundingBox.x + canvasBoundingBox.width / 3, canvasBoundingBox.y + canvasBoundingBox.height / 3);
    await page.mouse.down();
    await page.mouse.move(canvasBoundingBox.x + canvasBoundingBox.width / 3 + 30, canvasBoundingBox.y + canvasBoundingBox.height / 3 + 30);
    await page.mouse.up();

    // 6. Save Drawing 2
    await page.locator('#save2Btn').click();
    
    // Verify stage is compared
    // Check for comparison results display
    // Example: Check for the "Overall Score" text.
    // This assumes the score display area has a class or ID.
    // Let's assume the div containing "Overall Score:" has class 'average-score'
    // and the score itself is in a <p> tag within it.
    const overallScoreText = page.locator('.average-score p');
    await expect(overallScoreText).toBeVisible({ timeout: 10000 }); // Increased timeout for comparison
    await expect(overallScoreText).toContainText('%'); // Check if it contains a percentage

    // Verify combined image display controls are visible
    await expect(page.locator('text=Display Layers on Main Canvas:')).toBeVisible();
    await expect(page.locator('label:has-text("Template") input[type="checkbox"]')).toBeVisible();
  });
});
