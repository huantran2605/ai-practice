# AI Translator EN→VI (Browser Extension)

Một browser extension cao cấp dành cho Microsoft Edge và Chrome, hỗ trợ dịch tiếng Anh sang tiếng Việt sử dụng AI chạy local (Ollama + Qwen2.5) hoặc cloud (Google Gemini). Phiên bản mới đã tích hợp **RAG (Retrieval-Augmented Generation)** chạy 100% local trong trình duyệt.

## ✨ Tính năng nổi bật

- 🤖 **Dual AI Provider**:
  - **Local (Ollama)**: Sử dụng model `qwen2.5:7b` chạy trực tiếp trên máy. Không cần API key, bảo mật tuyệt đối.
  - **Cloud (Google Gemini)**: Sử dụng `gemini-2.5-flash` qua API. Nhanh, chính xác, không cần GPU.
- 🧠 **RAG (Retrieval-Augmented Generation)**:
  - Tích hợp **Transformers.js** chạy model `all-MiniLM-L6-v2` trực tiếp trong trình duyệt.
  - Tự động chia nhỏ (chunking) và đánh chỉ mục (indexing) nội dung trang web.
  - **Persistent Vector Storage**: Lưu trữ chỉ mục vào `chrome.storage.local` theo URL, nạp lại tức thì khi quay lại trang.
- 💬 **Smart Chat Panel**:
  - **Dual Mode**: Toggle linh hoạt giữa chế độ **RAG** (cho trang dài, cần độ chính xác cao) và **Context** (logic cũ).
  - **Auto-indexing**: Tự động phân tích trang khi mở chat.
  - Hiển thị tiến trình indexing trực quan.
- 🖱️ **Dịch linh hoạt**:
  - **Bôi đen (Selection)**: Hiện nút dịch thông minh ngay cạnh vùng chọn.
  - **Double-click**: Dịch nhanh từ hoặc cụm từ ngay lập tức.
- 🔊 **Phát âm (TTS)**: Tích hợp Web Speech API giúp nghe phát âm chuẩn của văn bản gốc.
- 🎨 **Premium UI**: Giao diện Dark Mode phong cách Glassmorphism, hiệu ứng mượt mà và hiện đại.
- ⚡ **Vite Build System**: Xây dựng trên nền tảng Vite + CRXJS, tối ưu hiệu năng và kích thước file.

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

## 🚀 Hướng dẫn cài đặt & Phát triển

### Bước 1: Chuẩn bị môi trường
1. Đảm bảo đã cài đặt [Node.js](https://nodejs.org/).
2. Chạy Ollama với cấu hình CORS:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```

### Bước 2: Build dự án
```bash
cd translator-extension
npm install
npm run build
```

### Bước 3: Cài đặt vào Trình duyệt (Edge/Chrome)
1. Mở trình duyệt và truy cập:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Bật **Developer mode** (Chế độ dành cho nhà phát triển).
3. Nhấn nút **Load unpacked** (Tải bản tiện ích đã giải nén).
4. Chọn thư mục **`dist`** (được tạo ra sau khi chạy lệnh build) trong thư mục `translator-extension`.

## 🏗️ Cấu trúc dự án mới

- `src/`: Thư mục mã nguồn chính.
  - `modules/`: Chứa các logic AI (Embedding, Chunker, VectorStore, RAGPipeline).
  - `background.js`: Service worker quản lý AI providers và RAG instances per tab.
  - `content.js`: Quản lý DOM, UI dịch và Chat Panel thông minh.
  - `popup/`: Giao diện cấu hình extension.
- `manifest.json`: Cấu hình Extension Manifest V3 (Vite/CRXJS optimized).
- `vite.config.js`: Cấu hình build system.

---
*Dự án được thực hiện với mục tiêu thực hành lập trình AI Agent, Browser Extension và Local RAG.*
