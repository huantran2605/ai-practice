# AI Translator EN→VI (Browser Extension)

Một browser extension cao cấp dành cho Microsoft Edge và Chrome, hỗ trợ dịch tiếng Anh sang tiếng Việt sử dụng AI chạy local (Ollama + Qwen2.5) hoặc cloud (Google Gemini).

## ✨ Tính năng nổi bật

- 🤖 **Dual AI Provider**:
  - **Local (Ollama)**: Sử dụng model `qwen2.5:7b` chạy trực tiếp trên máy. Không cần API key, bảo mật tuyệt đối.
  - **Cloud (Google Gemini)**: Sử dụng `gemini-2.5-flash` qua API. Nhanh, chính xác, không cần GPU.
- 🔄 **Chuyển đổi linh hoạt**: Dễ dàng switch giữa Local và Cloud ngay trong Settings của extension.
- 🖱️ **Dịch linh hoạt**:
  - **Bôi đen (Selection)**: Hiện nút dịch thông minh ngay cạnh vùng chọn.
  - **Double-click**: Dịch nhanh từ hoặc cụm từ ngay lập tức.
- 💬 **Chat với trang (Q&A)**: Hỏi đáp trực tiếp về nội dung trang web. AI sẽ trả lời dựa trên thông tin có trên trang, kèm lịch sử hội thoại.
- 🔊 **Phát âm (TTS)**: Tích hợp Web Speech API giúp nghe phát âm chuẩn của văn bản gốc.
- 🎨 **Premium UI**: Giao diện Dark Mode phong cách Glassmorphism, hiệu ứng mượt mà và hiện đại.
- ⚡ **Hiệu năng cao**: Tối ưu cho chip Apple Silicon (M1/M2/M3) khi chạy với Ollama.

## 🛠️ Yêu cầu hệ thống

### Chế độ Local (Ollama)
1. **Ollama**: Đã cài đặt và đang chạy.
2. **Model**: Đã tải model Qwen 2.5 7B:
   ```bash
   ollama pull qwen2.5:7b
   ```

### Chế độ Cloud (Google Gemini)
1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey) để lấy API Key miễn phí.
2. Nhập API Key vào phần Settings của extension.

## 🚀 Hướng dẫn cài đặt

### Bước 1: Chạy Ollama với cấu hình CORS
Để extension có thể kết nối với Ollama, bạn cần chạy Ollama với biến môi trường `OLLAMA_ORIGINS`.

**Trên macOS/Linux:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

### Bước 2: Cài đặt vào Trình duyệt (Edge/Chrome)
1. Mở trình duyệt và truy cập:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Bật **Developer mode** (Chế độ dành cho nhà phát triển).
3. Nhấn nút **Load unpacked** (Tải bản tiện ích đã giải nén).
4. Chọn thư mục `translator-extension` trong dự án này.

## 📖 Cách sử dụng

1. **Dịch đoạn văn**: Bôi đen một đoạn văn bản tiếng Anh bất kỳ trên trang web. Một icon nhỏ màu tím sẽ xuất hiện. Nhấn vào icon để xem bản dịch.
2. **Dịch nhanh**: Double-click vào một từ tiếng Anh để dịch ngay lập tức.
3. **Nghe phát âm**: Trong popup kết quả dịch, nhấn nút **🔊 Phát âm** để nghe văn bản gốc.
4. **Chat với trang**: Nhấn nút **💬** ở góc phải dưới màn hình → mở chat panel → đặt câu hỏi về nội dung trang. Hỗ trợ hội thoại liên tục với lịch sử được lưu.
5. **Chuyển đổi AI Provider**: Click icon extension → chọn **Local** hoặc **Cloud** trong phần AI Provider.
6. **Kiểm tra trạng thái**: Click vào icon extension để kiểm tra kết nối AI đang hoạt động.

## 🏗️ Cấu trúc dự án

- `manifest.json`: Cấu hình Extension Manifest V3.
- `background.js`: Xử lý logic gọi API Ollama / Google Gemini ở background (dịch + Q&A).
- `content.js`: Quản lý DOM, bắt sự kiện bôi đen, hiển thị UI dịch và chat panel.
- `content.css`: Styling cho popup dịch và chat panel (Glassmorphism).
- `popup.html/js/css`: Giao diện điều khiển khi nhấn vào icon extension.

---
*Dự án được thực hiện với mục tiêu thực hành lập trình AI Agent và Browser Extension.*
