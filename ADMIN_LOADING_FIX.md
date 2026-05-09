# Hướng dẫn Sửa Lỗi Infinite Loading - Admin Panel

## 🔴 Vấn đề đã xảy ra

Admin panel bị load liên tục, không dừng được.

## ✅ Sửa lỗi đã thực hiện

### 1. **AuthContext.tsx**
- ✅ Thêm `token` vào AuthContextType
- ✅ Set token từ localStorage
- ✅ Điều chỉnh useEffect dependency array

### 2. **AdminProtectedRoute.tsx**
- ✅ Thêm `useRef` để ngăn multiple redirects
- ✅ Loại bỏ router khỏi dependency array
- ✅ Chỉ redirect khi isLoading = false

### 3. **Admin Pages (dashboard, users, reports, logs)**
- ✅ Tách useEffect thành 2 phần:
  - Effect 1: Fetch khi token thay đổi
  - Effect 2: Fetch khi filters thay đổi
- ✅ Ngăn infinite loop do dependency array

## 🧪 Thử Nghiệm Lại

### Step 1: Clear cache & data
```bash
# Xóa localStorage
localStorage.clear()

# Hard refresh trình duyệt
Ctrl + Shift + R  # Windows/Linux
Cmd + Shift + R   # Mac
```

### Step 2: Đăng nhập lại
- Vào `/login`
- Nhập email admin
- Nhập password
- Nhấn Login

### Step 3: Truy cập admin panel
```
http://localhost:3000/admin
```

### Step 4: Kiểm tra console
Mở DevTools (`F12`), tab **Console**:
- ❌ Không nên thấy lỗi "Unauthorized"
- ❌ Không nên có lỗi fetch liên tục
- ✅ Nên thấy dữ liệu load 1 lần

## 🐛 Nếu vẫn bị load

### Kiểm tra 1: Browser Console
```javascript
// Kiểm tra token
localStorage.getItem('token')
// Result: 'eyJhbGc...' (có token) hoặc null (không token)

// Kiểm tra user object
console.log('User:', localStorage.getItem('user'))
```

### Kiểm tra 2: Network Tab
Vào DevTools → Network tab:
- Xem các request `/api/admin/stats/*`
- Nên chỉ gọi 1-2 lần, không liên tục
- Check response status (200 = OK, 401 = Unauthorized)

### Kiểm tra 3: API auth/me
```bash
# Test API endpoint này
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Fix Thủ Công Nếu Cần

Nếu vẫn bị lỗi, chạy lệnh này trong console:

```javascript
// 1. Clear auth
localStorage.removeItem('token')
localStorage.removeItem('user')

// 2. Reload
window.location.href = '/login'
```

Sau đó đăng nhập lại.

## 📋 Checklist Final

- [ ] Xóa cache trình duyệt (`Ctrl + Shift + R`)
- [ ] Đăng xuất rồi đăng nhập lại
- [ ] Kiểm tra DevTools Console (không có lỗi)
- [ ] Vào `/admin` - không bị load liên tục
- [ ] Vào `/admin/users` - load xong dừa lại
- [ ] Vào `/admin/reports` - load xong dừa lại
- [ ] Vào `/admin/logs` - load xong dừa lại

Nếu vẫn có vấn đề, cho tôi biết error message cụ thể từ DevTools!
