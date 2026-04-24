# Hướng Dẫn Import Dữ Liệu CSV vào Bảng Room

## 📋 Tổng Quan

Script này sẽ đọc file `phongtro123.csv` và import tất cả các phòng vào bảng `Room` trong database PostgreSQL thông qua Prisma.

## ✅ Yêu Cầu Trước

1. **Database đã được setup** - Có DATABASE_URL trong file `.env`
2. **Prisma migrations đã chạy** - Bảng Room đã được tạo
3. **Node.js v16+** - Để chạy TypeScript

## 🚀 Các Bước Thực Hiện

### 1. Chuẩn Bị Dữ Liệu

Đảm bảo file `phongtro123.csv` có cấu trúc như sau:
```
title,price,area,address,phone,image,link
"Tên phòng","1.3 triệu/tháng","20 m2","Quận 5, TP.HCM","09xxx","image_url","link"
```

### 2. Cài Đặt Dependency

Nếu chưa có `ts-node`, cài đặt:

```bash
npm install --save-dev ts-node
```

### 3. Chạy Script Import

```bash
npm run import:rooms
```

### 4. Kiểm Tra Kết Quả

- Script sẽ in ra số lượng phòng đã import thành công
- Kiểm tra database để xác nhận dữ liệu

## 📊 Chi Tiết Script

### Xử Lý Dữ Liệu

| CSV Field | Room Field | Xử Lý |
|-----------|-----------|-------|
| title | title | Lấy trực tiếp |
| price | price | Parse "1.3 triệu/tháng" → 1,300,000 |
| area | area | Lấy trực tiếp (ví dụ: "20 m2") |
| address | address | Lấy trực tiếp |
| phone | description | Lưu vào mô tả |
| image | image | Lưu vào mảng images |
| link | description | Lưu vào mô tả |

### Owner

- Script tự động tạo hoặc tìm user `admin@coliving.com` làm chủ phòng
- Nếu không tồn tại, sẽ tạo mới với role `HOST`

### Status

- Tất cả phòng import sẽ có status `AVAILABLE` (mặc định)

## ⚙️ Cấu Hình Tùy Chỉnh

Nếu muốn thay đổi owner, chỉnh sửa file `scripts/import-rooms.ts`:

```typescript
// Tìm user owner khác
let owner = await prisma.user.findUnique({
  where: { email: 'your-email@example.com' },
});
```

## 🐛 Xử Lý Lỗi

### Lỗi: "Cannot find module 'ts-node'"
```bash
npm install --save-dev ts-node typescript @types/node
```

### Lỗi: "DATABASE_URL not found"
- Kiểm tra file `.env` có biến `DATABASE_URL` không
- Chạy `npx prisma db push` để sync schema

### Lỗi: "Duplicate title"
- Script sẽ skip các dòng trùng lặp
- Kiểm tra file CSV có bản ghi trùng không

## 📈 Kết Quả Kỳ Vọng

```
📁 Reading CSV file...
✅ Found 20 rooms to import
👤 Creating default owner user...
✅ Created owner: admin@coliving.com

📝 Importing 20 rooms...
✅ [1] Ký túc xá An Dương Vương Quận 5...
✅ [2] Homestay Hoang Phuc chi nhánh...
...

📊 Import Summary:
   ✅ Imported: 20 rooms
   ⏭️  Skipped: 0 rooms
   📦 Total: 20 rows
```

## 💡 Tip

- Chạy script này lần đầu tiên sẽ tạo owner user mặc định
- Có thể chạy lại nhiều lần mà không lo bị trùng lặp (owner được tìm kiếm qua email)
- Nếu muốn reset, xóa owner user từ database trước

## 🔐 Bảo Mật

⚠️ **Lưu ý:** Password của admin user trong script này chỉ để demo. Trong production:
1. Tạo user thực qua API registration
2. Hash password bằng bcrypt
3. Không hard-code password trong script
