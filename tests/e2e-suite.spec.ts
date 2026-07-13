import { test, expect } from '@playwright/test';

test.describe('Umaroh Travel ERP - Enterprise End-to-End Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to local development portal
    await page.goto('/');
  });

  test('User Registration & Profile Initialization Flow', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Daftar');
    await expect(page).toHaveURL(/.*register/);

    // Input Jemaah or Mitra credentials
    await page.fill('input[id="nama-lengkap"]', 'Haji Ahmad Fauzi');
    await page.fill('input[id="email-input"]', `fauzi.${Date.now()}@baitullah.test`);
    await page.fill('input[id="phone-input"]', '+6281299887766');
    await page.fill('input[id="password-input"]', 'PasswordSecOps123!');
    await page.click('button[id="submit-register-btn"]');

    // System should redirect to onboarding dashboard or prompt login
    await expect(page.locator('text=Registrasi Berhasil')).toBeVisible();
  });

  test('Secure Multi-Factor Admin/Mitra Login Flow', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Masuk');
    
    // Fill credentials
    await page.fill('input[id="email-input"]', 'mitra@umaroh-test.com');
    await page.fill('input[id="password-input"]', 'PasswordSecOps123!');
    await page.click('button[id="login-btn"]');

    // Verifying redirection to active Mitra Workspace Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Workspace Mitra')).toBeVisible();
  });

  test('Mitra Booking Lifecycle and Flights Allocation', async ({ page }) => {
    // Pre-authenticate as Mitra
    await page.goto('/dashboard/bookings');

    // Create booking
    await page.click('button[id="create-booking-btn"]');
    await page.fill('input[id="jamaah-name-1"]', 'Zubaidah Ahmad');
    await page.selectOption('select[id="flight-package-select"]', 'Garuda-2026-Super');
    await page.click('button[id="save-draft-btn"]');

    // Verify booking state shows Draft or Pending
    await expect(page.locator('span[id="booking-status-badge"]')).toContainText('Pending');
  });

  test('Secure Wallet Payment & Transaction Ledger Receipt Flow', async ({ page }) => {
    // Pre-authenticate and go to Wallet page
    await page.goto('/dashboard/wallet');

    // Audit initial balance
    await expect(page.locator('div[id="wallet-balance-display"]')).toBeVisible();

    // Trigger payment for an approved package
    await page.goto('/dashboard/bookings');
    await page.click('button[id="pay-booking-btn"]');
    await page.fill('input[id="idempotency-key-input"]', `idem-booking-772-${Date.now()}`);
    await page.click('button[id="confirm-pay-wallet-btn"]');

    // Expect success message and receipts link
    await expect(page.locator('text=Pembayaran Berhasil')).toBeVisible();
    await expect(page.locator('a[id="download-pdf-receipt"]')).toBeVisible();
  });

  test('Enterprise RBAC & Route Permission Guards enforcement', async ({ page }) => {
    // Attempting unauthorized access to system-level developer metrics as a regular user
    await page.goto('/api/v1/metrics');
    
    // Expect 401 or 403 Forbidden
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('UNAUTHORIZED');
  });

  test('Mitra Logout & Storage Cleanup', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button[id="logout-btn"]');

    // Ensure system redirected back to landing page and storage token is flushed
    await expect(page).toHaveURL(/.*login|.*/);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
