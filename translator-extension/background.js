/**
 * Background Service Worker
 * Handles communication between content script and AI APIs.
 * Supports both Ollama (local) and Google Gemini (cloud).
 * Includes Q&A on page content with conversation memory.
 */

const OLLAMA_BASE = "http://localhost:11434";
const OLLAMA_MODEL = "qwen2.5:7b";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"; 
const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a professional English to Vietnamese translator. Rules:
1. Translate the given English text to Vietnamese accurately and naturally.
2. Only output the Vietnamese translation, nothing else.
3. Do not add explanations, notes, or alternatives.
4. Preserve the original formatting (paragraphs, line breaks).
5. For technical terms with no common Vietnamese equivalent, keep the English term.`;

const QA_SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh. Nhiệm vụ của bạn là trả lời câu hỏi dựa HOÀN TOÀN vào nội dung trang web được cung cấp bên dưới.

Quy tắc:
1. LUÔN trả lời bằng tiếng Việt.
2. Chỉ trả lời dựa trên nội dung trang web. Nếu thông tin không có trong nội dung, hãy nói rõ.
3. Trả lời ngắn gọn, chính xác, dễ hiểu.
4. Có thể sử dụng định dạng **in đậm** để nhấn mạnh.`;

/**
 * Get saved settings from chrome.storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      { provider: "local", geminiApiKey: "" },
      (items) => resolve(items)
    );
  });
}

// ========== TRANSLATION ==========

/**
 * Translate text using Ollama chat API (local)
 */
async function translateWithOllama(text) {
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() || "";
}

/**
 * Translate text using Google Gemini API (cloud)
 */
async function translateWithGemini(text, apiKey) {
  if (!apiKey) {
    throw new Error("Chưa nhập API Key cho Google Gemini. Vào Settings để cấu hình.");
  }

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: text }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 400 || response.status === 403) {
      throw new Error("API Key không hợp lệ hoặc hết quota. Kiểm tra lại trong Settings.");
    }
    throw new Error(`Gemini API error: ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini không trả về kết quả dịch.");
  }
  return content.trim();
}

/**
 * Route translation to the correct provider
 */
async function translateText(text) {
  const settings = await getSettings();

  if (settings.provider === "cloud") {
    return translateWithGemini(text, settings.geminiApiKey);
  }
  return translateWithOllama(text);
}

// ========== Q&A ON PAGE CONTENT ==========

/**
 * Truncate page content based on provider limits
 */
function truncateForProvider(text, provider) {
  const limit = provider === "cloud" ? 50000 : 12000;
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n\n[... nội dung đã được cắt bớt ...]";
}

/**
 * Ask question about page content using Ollama (local)
 */
async function askPageWithOllama(pageContent, messages) {
  const truncated = truncateForProvider(pageContent, "local");
  const systemMsg = `${QA_SYSTEM_PROMPT}\n\n--- NỘI DUNG TRANG WEB ---\n${truncated}\n--- HẾT NỘI DUNG ---`;

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemMsg },
        ...messages,
      ],
      stream: false,
      options: { temperature: 0.4, num_predict: 2048 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() || "";
}

/**
 * Ask question about page content using Google Gemini (cloud)
 */
async function askPageWithGemini(pageContent, messages, apiKey) {
  if (!apiKey) {
    throw new Error("Chưa nhập API Key cho Google Gemini. Vào Settings để cấu hình.");
  }

  const truncated = truncateForProvider(pageContent, "cloud");
  const systemMsg = `${QA_SYSTEM_PROMPT}\n\n--- NỘI DUNG TRANG WEB ---\n${truncated}\n--- HẾT NỘI DUNG ---`;

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemMsg }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 400 || response.status === 403) {
      throw new Error("API Key không hợp lệ hoặc hết quota.");
    }
    throw new Error(`Gemini API error: ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini không trả về kết quả.");
  return content.trim();
}

/**
 * Route Q&A to the correct provider
 */
async function askPage(pageContent, messages) {
  const settings = await getSettings();
  if (settings.provider === "cloud") {
    return askPageWithGemini(pageContent, messages, settings.geminiApiKey);
  }
  return askPageWithOllama(pageContent, messages);
}

// ========== HEALTH CHECK ==========

/**
 * Check Ollama health
 */
async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!response.ok) throw new Error("Ollama not responding");

    const data = await response.json();
    const models = data.models || [];
    const hasModel = models.some(
      (m) => m.name === OLLAMA_MODEL || m.name === `${OLLAMA_MODEL}:latest`
    );

    return { ollamaRunning: true, modelAvailable: hasModel };
  } catch (err) {
    return { ollamaRunning: false, modelAvailable: false, error: err.message };
  }
}

/**
 * Check Gemini health (validate API key)
 */
async function checkGeminiHealth(apiKey) {
  if (!apiKey) {
    return { geminiReady: false, error: "Chưa nhập API Key" };
  }

  try {
    const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { geminiReady: false, error: "API Key không hợp lệ" };
    }
    return { geminiReady: true };
  } catch (err) {
    return { geminiReady: false, error: err.message };
  }
}

// ========== MESSAGE LISTENER ==========

/**
 * Listen for messages from content script and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- Translation ---
  if (request.action === "translate") {
    translateText(request.text)
      .then((translation) => {
        sendResponse({ success: true, translation });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // --- Health Check ---
  if (request.action === "healthCheck") {
    (async () => {
      const settings = await getSettings();
      const ollama = await checkOllamaHealth();
      const gemini = await checkGeminiHealth(settings.geminiApiKey);
      sendResponse({ ...ollama, ...gemini, provider: settings.provider });
    })();
    return true;
  }

  // --- Q&A on Page Content ---
  if (request.action === "askPage") {
    askPage(request.pageContent, request.messages)
      .then((answer) => {
        sendResponse({ success: true, answer });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // --- Chat History: Save ---
  if (request.action === "saveChatHistory") {
    chrome.storage.session.set({ [request.key]: request.messages }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // --- Chat History: Load ---
  if (request.action === "loadChatHistory") {
    chrome.storage.session.get(request.key, (result) => {
      sendResponse({ messages: result[request.key] || [] });
    });
    return true;
  }

  // --- Chat History: Clear ---
  if (request.action === "clearChatHistory") {
    chrome.storage.session.remove(request.key, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Allow content scripts to access session storage
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
