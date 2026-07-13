# Kế hoạch Kiểm thử Tự động - KLTN Co-Living Platform

## Tổng quan

Dự án: KLTN Co-Living Platform
Phiên bản: 1.0
Ngày tạo: 06/07/2026
Công cụ kiểm thử: Postman, Playwright/Cypress

---

## 1. Chiến lược Kiểm thử

### 1.1 Phạm vi Kiểm thử

#### API Testing (Postman)
- Tất cả REST API endpoints
- Authentication & Authorization
- CRUD operations
- Error handling
- Validation

#### E2E Testing (Playwright/Cypress)
- User flows quan trọng
- Booking process
- Contract signing
- Payment proof submission
- Resource booking

### 1.2 Môi trường Kiểm thử

| Môi trường | URL | Database | Purpose |
|------------|-----|----------|---------|
| Development | localhost:3000 | Dev DB | Development |
| Staging | staging.kltn-coliving.com | Staging DB | Pre-production |
| Production | kltn-coliving.com | Prod DB | Production |

---

## 2. API Testing với Postman

### 2.1 Thiết lập Postman Collection

#### Environment Variables
```json
{
  "baseUrl": "http://localhost:3000/api",
  "authToken": "{{authToken}}",
  "testUserId": "{{testUserId}}",
  "testRoomId": "{{testRoomId}}",
  "testContractId": "{{testContractId}}"
}
```

#### Pre-request Script (Authentication)
```javascript
// Auto-inject auth token if available
if (pm.environment.get("authToken")) {
  pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${pm.environment.get("authToken")}`
  });
}
```

### 2.2 Test Collections

#### Collection 1: Authentication API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| AUTH-001 | POST | /auth/register | 201 | Đăng ký user mới thành công |
| AUTH-002 | POST | /auth/register | 400 | Đăng ký với email đã tồn tại |
| AUTH-003 | POST | /auth/login | 200 | Đăng nhập thành công |
| AUTH-004 | POST | /auth/login | 401 | Đăng nhập với sai mật khẩu |
| AUTH-005 | POST | /auth/phone/request-otp | 200 | Yêu cầu OTP qua số điện thoại |
| AUTH-006 | POST | /auth/phone/verify-otp | 200 | Xác thực OTP thành công |
| AUTH-007 | GET | /auth/me | 200 | Lấy thông tin user hiện tại |
| AUTH-008 | GET | /auth/me | 401 | Lấy thông tin khi chưa đăng nhập |
| AUTH-009 | POST | /auth/logout | 200 | Đăng xuất thành công |

**Postman Test Script Example (AUTH-003):**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property("token");
    pm.environment.set("authToken", jsonData.data.token);
});

pm.test("Response has user data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.user).to.have.property("id");
    pm.expect(jsonData.data.user).to.have.property("email");
});
```

---

#### Collection 2: Rooms API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| ROOM-001 | GET | /rooms | 200 | Lấy danh sách tất cả phòng |
| ROOM-002 | GET | /rooms?id={roomId} | 200 | Lấy chi tiết phòng theo ID |
| ROOM-003 | GET | /rooms?id={invalidId} | 404 | Lấy phòng với ID không tồn tại |
| ROOM-004 | GET | /rooms?district={district} | 200 | Lọc phòng theo quận |
| ROOM-005 | GET | /rooms?minPrice={price}&maxPrice={price} | 200 | Lọc phòng theo giá |
| ROOM-006 | POST | /rooms | 201 | Tạo phòng mới (Host only) |
| ROOM-007 | PUT | /rooms/{id} | 200 | Cập nhật thông tin phòng |
| ROOM-008 | DELETE | /rooms/{id} | 200 | Xóa phòng (Host only) |
| ROOM-009 | POST | /rooms-upload | 200 | Upload ảnh phòng |

**Postman Test Script Example (ROOM-001):**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.be.an("array");
});

pm.test("Each room has required fields", function () {
    var jsonData = pm.response.json();
    jsonData.data.forEach(room => {
        pm.expect(room).to.have.property("id");
        pm.expect(room).to.have.property("title");
        pm.expect(room).to.have.property("priceValue");
    });
});
```

---

#### Collection 3: Bookings API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| BOOK-001 | POST | /bookings | 201 | Tạo booking mới |
| BOOK-002 | POST | /bookings | 400 | Tạo booking với ngày không hợp lệ |
| BOOK-003 | GET | /bookings | 200 | Lấy danh sách booking của user |
| BOOK-004 | GET | /bookings/{id} | 200 | Lấy chi tiết booking |
| BOOK-005 | PUT | /bookings/{id} | 200 | Cập nhật booking |
| BOOK-006 | DELETE | /bookings/{id} | 200 | Hủy booking |
| BOOK-007 | POST | /bookings/{id}/evaluation | 201 | Đánh giá booking |

---

#### Collection 4: Contracts API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| CONT-001 | POST | /contracts | 201 | Tạo hợp đồng mới |
| CONT-002 | GET | /contracts | 200 | Lấy danh sách hợp đồng |
| CONT-003 | GET | /contracts/{id} | 200 | Lấy chi tiết hợp đồng |
| CONT-004 | POST | /contracts/{id}/sign | 200 | Ký hợp đồng (Host) |
| CONT-005 | POST | /contracts/{id}/sign | 200 | Ký hợp đồng (Renter) |
| CONT-006 | POST | /contracts/{id}/deposit | 200 | Thanh toán cọc |
| CONT-007 | POST | /contracts/{id}/handover | 200 | Xác nhận bàn giao |
| CONT-008 | POST | /contracts/{id}/renew | 200 | Gia hạn hợp đồng |
| CONT-009 | POST | /contracts/{id}/terminate | 200 | Chấm dứt hợp đồng |

---

#### Collection 5: Utility Bills API (Mới)

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| UTIL-001 | POST | /contracts/{id}/utility-bills | 201 | Tạo hóa đơn điện nước (Host) |
| UTIL-002 | GET | /contracts/{id}/utility-bills | 200 | Lấy danh sách hóa đơn |
| UTIL-003 | POST | /utility-bills/{id}/proof | 200 | Gửi minh chứng thanh toán (Tenant) |
| UTIL-004 | PUT | /utility-bills/{id}/approve | 200 | Phê duyệt thanh toán (Host) |
| UTIL-005 | POST | /contracts/{id}/utility-bills | 403 | Tạo hóa đơn khi không phải Host |
| UTIL-006 | POST | /utility-bills/{id}/proof | 403 | Gửi minh chứng khi không phải Tenant |

**Postman Test Script Example (UTIL-001):**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Bill created with correct data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property("month");
    pm.expect(jsonData.data).to.have.property("year");
    pm.expect(jsonData.data).to.have.property("totalCost");
    pm.expect(jsonData.data.status).to.eql("PENDING");
});

pm.test("Cost calculation is correct", function () {
    var jsonData = pm.response.json();
    const expectedCost = jsonData.data.electricityCost + jsonData.data.waterCost;
    pm.expect(jsonData.data.totalCost).to.eql(expectedCost);
});
```

---

#### Collection 6: Shared Resources API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| RES-001 | GET | /rooms/{id}/shared-resources | 200 | Lấy danh sách tài nguyên chung |
| RES-002 | POST | /host/resources | 201 | Tạo tài nguyên mới (Host) |
| RES-003 | PUT | /host/resources/{id} | 200 | Cập nhật tài nguyên |
| RES-004 | DELETE | /host/resources/{id} | 200 | Xóa tài nguyên |
| RES-005 | POST | /rooms/{id}/shared-resources/bookings | 201 | Đặt tài nguyên |
| RES-006 | GET | /host/bookings | 200 | Lấy danh sách booking (Host) |

---

#### Collection 7: Reviews API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| REV-001 | POST | /reviews | 201 | Tạo đánh giá mới |
| REV-002 | GET | /reviews?roomId={roomId} | 200 | Lấy đánh giá theo phòng |
| REV-003 | GET | /reviews/{id} | 200 | Lấy chi tiết đánh giá |
| REV-004 | PUT | /reviews/{id} | 200 | Cập nhật đánh giá |
| REV-005 | DELETE | /reviews/{id} | 200 | Xóa đánh giá |

---

#### Collection 8: Favorites API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| FAV-001 | POST | /favorites/{roomId} | 201 | Thêm phòng vào yêu thích |
| FAV-002 | GET | /favorites | 200 | Lấy danh sách yêu thích |
| FAV-003 | DELETE | /favorites/{roomId} | 200 | Xóa khỏi Danh sách yêu thích |

---

#### Collection 9: Admin API

| Test Case | Method | Endpoint | Expected Status | Description |
|-----------|--------|----------|-----------------|-------------|
| ADM-001 | GET | /admin/users | 200 | Lấy danh sách user (Admin) |
| ADM-002 | PUT | /admin/users/{id} | 200 | Cập nhật user (Admin) |
| ADM-003 | GET | /admin/rooms | 200 | Lấy danh sách phòng (Admin) |
| ADM-004 | PUT | /admin/rooms/{id} | 200 | Phê duyệt phòng (Admin) |
| ADM-005 | GET | /admin/reviews | 200 | Lấy danh sách đánh giá (Admin) |
| ADM-006 | PUT | /admin/reviews/{id} | 200 | Ẩn/hiện đánh giá (Admin) |
| ADM-007 | GET | /admin/logs | 200 | Lấy log hoạt động (Admin) |
| ADM-008 | GET | /admin/stats/users | 200 | Thống kê user (Admin) |
| ADM-009 | GET | /admin/stats/rooms | 200 | Thống kê phòng (Admin) |

---

### 2.3 Postman Newman Automation

#### Cài đặt Newman
```bash
npm install -g newman
npm install -g newman-reporter-html
```

#### Chạy test tự động
```bash
# Chạy tất cả collections
newman run KLTN-Coliving.postman_collection.json -e environment.json

# Chạy với báo cáo HTML
newman run KLTN-Coliving.postman_collection.json -e environment.json --reporters html --reporter-html-export report.html

# Chạy collection cụ thể
newman run KLTN-Coliving.postman_collection.json -e environment.json --folder "Authentication"
```

#### CI/CD Integration (GitHub Actions)
```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Newman
        run: npm install -g newman newman-reporter-html
      - name: Run API Tests
        run: newman run tests/postman/KLTN-Coliving.postman_collection.json -e tests/postman/environment.json --reporters html --reporter-html-export tests/postman/report.html
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: tests/postman/report.html
```

---

## 3. E2E Testing với Playwright

### 3.1 Cài đặt Playwright
```bash
npm init playwright@latest
npm install @playwright/test
```

### 3.2 Cấu hình Playwright (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.3 Test Cases

#### Test Suite 1: Authentication Flow

**File: e2e-tests/auth.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can register successfully', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="phone"]', '0123456789');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Đăng ký thành công')).toBeVisible();
  });

  test('User can login successfully', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123@');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Chào mừng')).toBeVisible();
  });

  test('User cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible();
  });
});
```

---

#### Test Suite 2: Room Booking Flow

**File: e2e-tests/booking.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Room Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('User can search for rooms', async ({ page }) => {
    await page.goto('/rooms');
    
    await page.fill('input[placeholder="Tìm kiếm phòng..."]', 'Quận 1');
    await page.click('button:has-text("Tìm kiếm")');
    
    await expect(page.locator('.room-card')).toHaveCount(10);
  });

  test('User can view room details', async ({ page }) => {
    await page.goto('/rooms');
    
    await page.click('.room-card:first-child');
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.room-price')).toBeVisible();
    await expect(page.locator('.room-amenities')).toBeVisible();
  });

  test('User can create a booking', async ({ page }) => {
    await page.goto('/rooms/room-id-123');
    
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    
    await page.click('button:has-text("Đặt phòng")');
    
    await expect(page.locator('text=Đặt phòng thành công')).toBeVisible();
  });
});
```

---

#### Test Suite 3: Contract Signing Flow

**File: e2e-tests/contract.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Contract Signing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'renter@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.click('button[type="submit"]');
  });

  test('Renter can view contract details', async ({ page }) => {
    await page.goto('/contracts/contract-id-123');
    
    await expect(page.locator('text=Hợp đồng thuê')).toBeVisible();
    await expect(page.locator('.contract-terms')).toBeVisible();
  });

  test('Renter can sign contract', async ({ page }) => {
    await page.goto('/contracts/contract-id-123');
    
    await page.click('button:has-text("Ký hợp đồng")');
    
    await page.fill('input[name="signatureName"]', 'Test Renter');
    await page.click('button:has-text("Xác nhận ký")');
    
    await expect(page.locator('text=Đã ký hợp đồng thành công')).toBeVisible();
  });

  test('Renter can pay deposit', async ({ page }) => {
    await page.goto('/contracts/contract-id-123');
    
    await page.click('button:has-text("Thanh toán cọc")');
    
    await page.fill('input[name="amount"]', '5000000');
    await page.fill('input[name="reference"]', 'REF123456');
    
    await page.click('button:has-text("Xác nhận thanh toán")');
    
    await expect(page.locator('text=Thanh toán cọc thành công')).toBeVisible();
  });
});
```

---

#### Test Suite 4: Utility Bill Payment Flow

**File: e2e-tests/utility-bills.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Utility Bill Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'renter@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.click('button[type="submit"]');
  });

  test('Renter can view utility bills', async ({ page }) => {
    await page.goto('/rooms/room-id-123/shared-space');
    
    await expect(page.locator('text=Hóa đơn gần đây')).toBeVisible();
    await expect(page.locator('.utility-bill-card')).toHaveCount(3);
  });

  test('Renter can submit payment proof', async ({ page }) => {
    await page.goto('/rooms/room-id-123/shared-space');
    
    await page.click('button:has-text("Gửi minh chứng")');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/payment-proof.jpg');
    
    await page.click('button:has-text("Gửi minh chứng")');
    
    await expect(page.locator('text=Đã gửi minh chứng thanh toán thành công')).toBeVisible();
  });
});

test.describe('Utility Bill Management (Host)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'host@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.click('button[type="submit"]');
  });

  test('Host can create utility bill', async ({ page }) => {
    await page.goto('/host/resources');
    
    await page.click('button:has-text("Tiền điện nước")');
    await page.click('button:has-text("Tạo hóa đơn mới")');
    
    await page.selectOption('select[name="month"]', '1');
    await page.fill('input[name="year"]', '2024');
    await page.fill('input[name="electricityUsage"]', '150');
    await page.fill('input[name="waterUsage"]', '20');
    
    await page.click('button:has-text("Tạo hóa đơn")');
    
    await expect(page.locator('text=Đã tạo hóa đơn điện nước thành công')).toBeVisible();
  });

  test('Host can approve payment proof', async ({ page }) => {
    await page.goto('/host/resources');
    
    await page.click('button:has-text("Tiền điện nước")');
    
    await page.click('button:has-text("Xác nhận")');
    
    await expect(page.locator('text=Đã xác nhận thanh toán')).toBeVisible();
  });
});
```

---

#### Test Suite 5: Shared Resource Booking Flow

**File: e2e-tests/shared-resources.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Shared Resource Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'renter@example.com');
    await page.fill('input[name="password"]', 'password123@');
    await page.click('button[type="submit"]');
  });

  test('User can view shared resources', async ({ page }) => {
    await page.goto('/rooms/room-id-123/shared-space');
    
    await expect(page.locator('.resource-card')).toBeVisible();
  });

  test('User can book a resource', async ({ page }) => {
    await page.goto('/rooms/room-id-123/shared-space');
    
    await page.click('.resource-card:first-child');
    await page.click('button:has-text("Đặt tài nguyên")');
    
    await page.fill('input[name="title"]', 'Giặt đồ');
    await page.fill('input[name="startTime"]', '2024-01-01T10:00');
    await page.fill('input[name="endTime"]', '2024-01-01T12:00');
    
    await page.click('button:has-text("Xác nhận đặt")');
    
    await expect(page.locator('text=Đặt tài nguyên thành công')).toBeVisible();
  });
});
```

---

### 3.4 Chạy Playwright Tests

```bash
# Chạy tất cả tests
npx playwright test

# Chạy tests trên browser cụ thể
npx playwright test --project=chromium

# Chạy tests ở chế độ headed (có UI)
npx playwright test --headed

# Chạy tests và xem report
npx playwright test --reporter=html
npx playwright show-report

# Chạy test cụ thể
npx playwright test auth.spec.ts

# Debug mode
npx playwright test --debug
```

### 3.5 CI/CD Integration (GitHub Actions)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 4. Test Data Management

### 4.1 Test Database Setup

```sql
-- Create test database
CREATE DATABASE kltn_coliving_test;

-- Seed test data
INSERT INTO users (id, email, password, fullName, role) VALUES
('test-user-1', 'test@example.com', 'hashed_password', 'Test User', 'CUSTOMER'),
('test-host-1', 'host@example.com', 'hashed_password', 'Test Host', 'HOST'),
('test-admin-1', 'admin@example.com', 'hashed_password', 'Test Admin', 'ADMIN');

INSERT INTO rooms (id, title, priceValue, ownerId, status) VALUES
('test-room-1', 'Test Room 1', 5000000, 'test-host-1', 'AVAILABLE'),
('test-room-2', 'Test Room 2', 7000000, 'test-host-1', 'AVAILABLE');
```

### 4.2 Test Data Cleanup

```bash
# Script để reset test database sau mỗi test run
npx prisma db push --force-reset
npx prisma db seed
```

---

## 5. Reporting & Monitoring

### 5.1 Test Report Formats

- **Postman**: HTML report với Newman
- **Playwright**: HTML report với screenshots và traces
- **Coverage**: Code coverage với Istanbul/nyc

### 5.2 Test Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API Test Coverage | 90% | TBD |
| E2E Test Coverage | 70% | TBD |
| Test Execution Time | < 10 min | TBD |
| Flaky Test Rate | < 5% | TBD |

### 5.3 Alerting

- Slack notification khi test fail
- Email notification cho critical failures
- GitHub status checks

---

## 6. Maintenance & Updates

### 6.1 Test Maintenance Schedule

- **Weekly**: Review and update test cases
- **Monthly**: Review test coverage and add new tests
- **Quarterly**: Full test suite audit and optimization

### 6.2 Test Case Update Process

1. New feature added → Add corresponding test cases
2. Bug fixed → Add regression test
3. API changed → Update Postman collection
4. UI changed → Update Playwright tests

---

## 7. Appendix

### 7.1 Useful Commands

```bash
# Postman
newman run collection.json -e environment.json
newman run collection.json --reporters cli,html

# Playwright
npx playwright test
npx playwright test --ui
npx playwright codegen localhost:3000

# Database
npx prisma studio
npx prisma db seed
```

### 7.2 Resources

- [Postman Documentation](https://learning.postman.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Newman Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 06/07/2026 | 1.0 | Initial test plan | Team |
