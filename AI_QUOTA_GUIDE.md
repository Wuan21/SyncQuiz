# 🤖 Google Gemini API Quota - Hướng Dẫn Khắc Phục

## Vấn đề hiện tại
Tài khoản Google Cloud của bạn đã dùng hết **free tier quota** cho Gemini API.
- Error: `429 Too Many Requests - Quota exceeded`
- Ảnh hưởng: Feature "AI Quiz Generator" không thể hoạt động

---

## ✅ Giải pháp 1: Thêm Billing (Khuyên dùng)

### Bước 1: Truy cập Google Cloud Console
1. Mở: https://console.cloud.google.com
2. Chọn Project: **509847289930** (hoặc "SyncQuiz Data | Cloud MongoDB Cluster")

### Bước 2: Thêm phương thức thanh toán
1. Click **"Billing"** ở menu bên trái
2. Click **"Create Account"** hoặc **"Link Billing Account"**
3. Nhập thông tin thanh toán (thẻ tín dụng)
4. Thiết lập ngân sách: Đề nghị $20-50/tháng cho Gemini API

### Bước 3: Cấp phép Gemini API
1. Vào **APIs & Services** → **Library**
2. Tìm **"Generative Language API"**
3. Click **"Enable"**

### Bước 4: Kiểm tra quotas
1. Vào **APIs & Services** → **Quotas**
2. Tìm: **Generative Language API**
3. Xác nhận quota tăng (không còn limit 0)

### Thời gian có hiệu lực
- Thường trong **2-5 phút** sau khi cấp phép
- Thử lại "AI Quiz Generator" trên ứng dụng

---

## ✅ Giải pháp 2: Chờ Quota Reset (Miễn phí, 24 giờ)

**Free tier quota reset mỗi ngày UTC.**

- Nếu bạn dùng hết quota lúc 14:00 sáng → quay lại 14:00 hôm sau
- Monitor: https://ai.dev/rate-limit (xem current usage)

---

## ✅ Giải pháp 3: Dùng CSV Import thay vì AI

Trong khi chờ quota, bạn có thể:

1. **Tạo file CSV** với nội dung câu hỏi
2. **Template CSV** (download trong app)
   ```
   question,optionA,optionB,optionC,optionD,correct,timeLimit,points,explanation
   "Python là gì?","Ngôn ngữ","Framework","Database","Server",1,30,1000,"Python là ngôn ngữ lập trình"
   ```
3. **Upload CSV** qua nút "CSV Import" trong Quiz Editor

---

## 📊 Giá thành Gemini API (2026)

### Free Tier
- **1 triệu tokens/ngày** (input + output)
- Hết đó → quota exceeded

### Paid Tier
| Mức | Giá |
|-----|-----|
| Input | $0.075 per 1M tokens |
| Output | $0.30 per 1M tokens |
| **ví dụ: 1000 request/ngày** | ~$5-15/tháng |

👉 **Lưu ý:** Lần đầu thêm billing, Google thường cung cấp **$300 free credits** cho 90 ngày

---

## 🔍 Kiểm tra Status

### Cách 1: Từ ứng dụng
1. Mở "AI Quiz Generator"
2. Nhập topic → Bấm "Tạo"
3. Nếu thấy message chi tiết → Quota đã fix

### Cách 2: Kiểm tra trực tiếp API key
```bash
# Command line (Windows PowerShell)
$key="YOUR_GEMINI_API_KEY"
curl.exe -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$key" `
  -H "Content-Type: application/json" `
  -d '{
    "contents": [{
      "parts": [{"text": "Reply with OK"}]
    }]
  }' 2>&1
```

Nếu thấy "OK" → Quota OK ✅  
Nếu thấy "Quota exceeded" → Vẫn hết quota ❌

---

## 🆘 Vấn đề thêm?

### Nếu vẫn gặp lỗi sau khi thêm billing
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload app** (F5 trên browser)
3. **Chờ 5-10 phút** cho API propagate

### Kiểm tra lại API Key
- Mở: https://aistudio.google.com/app/apikey
- Xác nhận **"Gemini API Key"** còn hoạt động
- Nếu bị delete/disable → tạo key mới, update file `.env`

---

## 📝 Tóm tắt

| Giải pháp | Thời gian | Chi phí | Độ khó |
|-----------|-----------|--------|--------|
| **Thêm billing** | 2-5 phút | $0-20/tháng | ⭐ Dễ |
| **Chờ reset** | 24 giờ | $0 | ⭐ Dễ |
| **CSV Import** | Ngay | $0 | ⭐⭐ Vừa |

✅ **Khuyên dùng:** Thêm billing + CSV import song song
