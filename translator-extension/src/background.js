/**
 * Background Service Worker
 * Handles communication between content script and AI APIs.
 * Supports both Ollama (local) and Google Gemini (cloud).
 * Includes Q&A on page content with RAG (Retrieval-Augmented Generation).
 */
import RAGPipeline from './modules/ragPipeline.js';

const OLLAMA_BASE = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";
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

// Management of RAG pipelines per tab
const pipelines = new Map(); // tabId -> RAGPipeline instance

/**
 * Get or create pipeline for a tab
 */
function getPipeline(tabId) {
  if (!pipelines.has(tabId)) {
    pipelines.set(tabId, new RAGPipeline());
  }
  return pipelines.get(tabId);
}

/**
 * Get saved settings from chrome.storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      { provider: "local", geminiApiKey: "", ollamaModel: DEFAULT_OLLAMA_MODEL },
      (items) => resolve(items)
    );
  });
}

// ========== STREAMING HELPERS ==========

async function* streamOllama(model, systemPrompt, userPrompt, messages = []) {
  const payload = {
    model: model || DEFAULT_OLLAMA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
      { role: "user", content: userPrompt },
    ],
    stream: true,
    options: { temperature: 0.3, num_predict: 2048 },
  };

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let isThinking = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const msg = json.message;
        
        // 1. Explicit thought field (DeepSeek style)
        if (msg?.thought) {
          yield { type: "thought", text: msg.thought };
        }
        
        // 2. Content field (might contain <thought> tags)
        if (msg?.content) {
          let content = msg.content;
          
          // Detect start of thinking
          if (content.includes("<think>") || content.includes("<thought>")) {
            isThinking = true;
            const tag = content.includes("<think>") ? "<think>" : "<thought>";
            const parts = content.split(tag);
            if (parts[0]) yield { type: "content", text: parts[0] };
            content = parts[1] || "";
          }
          
          // Detect end of thinking
          const endTag = content.includes("</think>") ? "</think>" : (content.includes("</thought>") ? "</thought>" : null);
          if (isThinking && endTag) {
            const parts = content.split(endTag);
            if (parts[0]) yield { type: "thought", text: parts[0] };
            isThinking = false;
            content = parts[1] || "";
          }
          
          if (content) {
            yield { type: isThinking ? "thought" : "content", text: content };
          }
        }
        
        if (json.done) return;
      } catch (e) {
        console.error("[Background] Ollama parse error:", e, line);
      }
    }
  }
}

async function* streamGemini(apiKey, systemPrompt, userPrompt, messages = []) {
  if (!apiKey) throw new Error("Chưa nhập API Key cho Gemini.");
  
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?key=${apiKey}`;
  const contents = [
    ...messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })),
    { role: "user", parts: [{ text: userPrompt }] }
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Gemini sends a JSON array stream like: [ {..}, {..} ]
    // We strip the outer brackets and commas to parse individual objects
    let cleanBuffer = buffer.trim();
    if (cleanBuffer.startsWith('[')) cleanBuffer = cleanBuffer.slice(1);
    if (cleanBuffer.endsWith(']')) cleanBuffer = cleanBuffer.slice(0, -1);
    if (cleanBuffer.startsWith(',')) cleanBuffer = cleanBuffer.slice(1);

    const parts = cleanBuffer.split(/}\s*,\s*{/);
    if (parts.length > 1) {
      // Process all but the last part (which might be incomplete)
      for (let i = 0; i < parts.length - 1; i++) {
        let p = parts[i];
        if (!p.startsWith('{')) p = '{' + p;
        if (!p.endsWith('}')) p = p + '}';
        try {
          const json = JSON.parse(p);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield { type: "content", text };
        } catch(e) {}
      }
      // Keep the last part in buffer
      const lastPart = parts[parts.length - 1];
      buffer = (lastPart.startsWith('{') ? '' : '{') + lastPart;
    }

    // Attempt to parse the whole buffer if it seems like a complete object
    try {
      let p = buffer.trim();
      if (p.endsWith(',')) p = p.slice(0, -1);
      if (!p.startsWith('{')) p = '{' + p;
      if (!p.endsWith('}')) p = p + '}';
      const json = JSON.parse(p);
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield { type: "content", text };
        buffer = ""; // Successfully parsed, clear buffer
      }
    } catch(e) {
      // Buffer incomplete, continue reading
    }
  }
}

// ========== LEGACY NON-STREAMING (KEEP FOR NOW) ==========

async function translateWithOllama(text) {
  const settings = await getSettings();
  const model = settings.ollamaModel || DEFAULT_OLLAMA_MODEL;
  
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      stream: false,
      options: { temperature: 0.3, num_predict: 2048 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
  const data = await response.json();
  return data.message?.content?.trim() || "";
}

async function translateWithGemini(text, apiKey) {
  if (!apiKey) throw new Error("Chưa nhập API Key cho Gemini.");
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: text }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function translateText(text) {
  const settings = await getSettings();
  if (settings.provider === "cloud") return translateWithGemini(text, settings.geminiApiKey);
  return translateWithOllama(text);
}

// ========== Q&A ON PAGE CONTENT ==========

async function askWithOllama(context, messages) {
  const settings = await getSettings();
  const model = settings.ollamaModel || DEFAULT_OLLAMA_MODEL;
  const systemMsg = `${QA_SYSTEM_PROMPT}\n\n--- NỘI DUNG LIÊN QUAN ---\n${context}\n--- HẾT NỘI DUNG ---`;
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemMsg }, ...messages],
      stream: false,
      options: { temperature: 0.4, num_predict: 2048 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
  const data = await response.json();
  return data.message?.content?.trim() || "";
}

async function askWithGemini(context, messages, apiKey) {
  const systemMsg = `${QA_SYSTEM_PROMPT}\n\n--- NỘI DUNG LIÊN QUAN ---\n${context}\n--- HẾT NỘI DUNG ---`;
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
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

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function askPage(mode, pageContent, messages, tabId, sender) {
  const settings = await getSettings();
  let context = "";

  if (mode === 'rag') {
    const pipeline = getPipeline(tabId);
    const url = sender.tab?.url;
    
    // 1. Try to load from persistence if not ready
    if (pipeline.status !== 'ready' && pipeline.status !== 'indexing' && url) {
      console.log(`[Background] Attempting to load persistent RAG state for ${url}`);
      await pipeline.loadState(url);
    }

    // 2. Auto-index if still not ready and we have content
    if (pipeline.status !== 'ready' && pipeline.status !== 'indexing') {
      console.log(`[Background] Pipeline not ready, indexing...`);
      await pipeline.indexPage(pageContent, null, { url });
    }
    
    // 3. Wait if indexing
    if (pipeline.status === 'indexing') {
      let attempts = 0;
      while (pipeline.status === 'indexing' && attempts < 60) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
    }

    if (pipeline.status !== 'ready') {
      throw new Error(`Pipeline failed to initialize: ${pipeline.lastError || 'Unknown error'}`);
    }

    // Use last user message for query
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || "";
    context = await pipeline.getContext(lastUserMsg);
  } else {
    // Legacy Context Stuffing (truncated)
    const limit = settings.provider === "cloud" ? 50000 : 12000;
    context = pageContent.length > limit ? pageContent.slice(0, limit) + "..." : pageContent;
  }

  if (settings.provider === "cloud") {
    return askWithGemini(context, messages, settings.geminiApiKey);
  }
  return askWithOllama(context, messages);
}

/**
 * Check Ollama health and model availability
 */
async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!response.ok) return { ollamaRunning: false, modelAvailable: false };

    const data = await response.json();
    const models = data.models || [];
    const settings = await getSettings();
    const targetModel = settings.ollamaModel || DEFAULT_OLLAMA_MODEL;

    const hasModel = models.some(
      (m) => m.name === targetModel || m.name === `${targetModel}:latest`
    );

    return { 
      ollamaRunning: true, 
      modelAvailable: hasModel, 
      currentModel: targetModel,
      availableModels: models.map(m => m.name)
    };
  } catch (err) {
    return { ollamaRunning: false, modelAvailable: false };
  }
}

/**
 * Check Gemini health (validate API key)
 */
async function checkGeminiHealth(apiKey) {
  if (!apiKey) return { geminiReady: false };
  try {
    const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}?key=${apiKey}`;
    const response = await fetch(url);
    return { geminiReady: response.ok };
  } catch (err) {
    return { geminiReady: false };
  }
}

// ========== MESSAGE LISTENER ==========

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (request.action === "translate") {
    translateText(request.text).then(t => sendResponse({ success: true, translation: t })).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === "indexPage") {
    const pipeline = getPipeline(tabId);
    const url = sender.tab?.url;
    pipeline.indexPage(request.pageContent, (status) => {
      console.log(`[Background] Tab ${tabId} Indexing Progress: ${status.progress.current}/${status.progress.total}`);
    }, { url })
    .then(() => sendResponse({ success: true }))
    .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === "getIndexStatus") {
    const pipeline = getPipeline(tabId);
    const url = sender.tab?.url;
    // Attempt auto-load if idle
    if (pipeline.status === 'idle' && url) {
      pipeline.loadState(url);
    }
    sendResponse(pipeline.getStatus());
    return false;
  }

  if (request.action === "askPage") {
    askPage(request.mode, request.pageContent, request.messages, tabId, sender)
      .then(a => sendResponse({ success: true, answer: a }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === "saveChatHistory") {
    chrome.storage.session.set({ [request.key]: request.messages }, () => sendResponse({ success: true }));
    return true;
  }

  if (request.action === "loadChatHistory") {
    chrome.storage.session.get(request.key, (result) => sendResponse({ messages: result[request.key] || [] }));
    return true;
  }

  if (request.action === "clearChatHistory") {
    chrome.storage.session.remove(request.key, () => sendResponse({ success: true }));
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

  if (request.action === "getOllamaModels") {
    checkOllamaHealth().then(res => sendResponse(res));
    return true;
  }
});

// ========== PORT LISTENER FOR STREAMING ==========

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ai-stream") return;

  port.onMessage.addListener(async (msg) => {
    const { action, text, mode, pageContent, messages: chatHistory = [] } = msg;
    const settings = await getSettings();
    
    try {
      let generator;
      let systemPrompt = action === "translate" ? SYSTEM_PROMPT : QA_SYSTEM_PROMPT;
      let userPrompt = text;

      if (action === "askPage") {
        let context = "";
        if (mode === 'rag') {
          const tabId = port.sender?.tab?.id;
          const pipeline = getPipeline(tabId);
          const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user')?.content || "";
          context = await pipeline.getContext(lastUserMsg);
        } else {
          const limit = settings.provider === "cloud" ? 50000 : 12000;
          context = pageContent.length > limit ? pageContent.slice(0, limit) + "..." : pageContent;
        }
        systemPrompt = `${QA_SYSTEM_PROMPT}\n\n--- NỘI DUNG LIÊN QUAN ---\n${context}\n--- HẾT NỘI DUNG ---`;
        userPrompt = chatHistory[chatHistory.length - 1]?.content || "";
        // For streaming Q&A, we pass the history excluding the last message (which is the current user prompt)
        const historyForAI = chatHistory.slice(0, -1);
        
        if (settings.provider === "cloud") {
          generator = streamGemini(settings.geminiApiKey, systemPrompt, userPrompt, historyForAI);
        } else {
          generator = streamOllama(settings.ollamaModel, systemPrompt, userPrompt, historyForAI);
        }
      } else if (action === "translate") {
        if (settings.provider === "cloud") {
          generator = streamGemini(settings.geminiApiKey, systemPrompt, userPrompt);
        } else {
          generator = streamOllama(settings.ollamaModel, systemPrompt, userPrompt);
        }
      }

      if (generator) {
        for await (const chunkObj of generator) {
          port.postMessage({ 
            action: "chunk", 
            type: chunkObj.type, 
            chunk: chunkObj.text 
          });
        }
        port.postMessage({ action: "done" });
      }
    } catch (err) {
      console.error("[Background] Streaming error:", err);
      port.postMessage({ action: "error", error: err.message });
    }
  });
});

// Cleanup on tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  pipelines.delete(tabId);
});

chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
