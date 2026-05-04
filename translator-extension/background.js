/**
 * Background Service Worker
 * Handles communication between content script and AI APIs.
 * Supports both Ollama (local) and Google Gemini (cloud).
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

/**
 * Listen for messages from content script and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

  if (request.action === "healthCheck") {
    (async () => {
      const settings = await getSettings();
      const ollama = await checkOllamaHealth();
      const gemini = await checkGeminiHealth(settings.geminiApiKey);
      sendResponse({ ...ollama, ...gemini, provider: settings.provider });
    })();
    return true;
  }
});
