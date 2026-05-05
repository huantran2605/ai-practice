/**
 * AI Translator EN→VI — Content Script
 * Detects text selection & double-click, shows translation popup with TTS.
 */
(() => {
  "use strict";

  // --- SVG Icons ---
  const ICON_TRANSLATE = `<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;
  const ICON_SPEAKER = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.47 4.47 0 0 0 2.5-3.5zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>`;

  let translateBtn = null;
  let popup = null;
  let currentUtterance = null;

  // --- Helpers ---
  function escapeHtml(str) {
    const el = document.createElement("div");
    el.textContent = str;
    return el.innerHTML;
  }

  function removeBtn() {
    if (translateBtn) { translateBtn.remove(); translateBtn = null; }
  }

  function removePopup() {
    if (popup) { popup.remove(); popup = null; }
    stopSpeaking();
  }

  function stopSpeaking() {
    if (currentUtterance) { speechSynthesis.cancel(); currentUtterance = null; }
    document.querySelectorAll(".ai-translator-speak.ait-speaking").forEach(b => b.classList.remove("ait-speaking"));
  }

  // --- Speak (TTS) ---
  function speak(text, lang, btn) {
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "en" ? "en-US" : "vi-VN";
    utter.rate = 0.9;
    utter.pitch = 1;
    currentUtterance = utter;
    if (btn) btn.classList.add("ait-speaking");
    utter.onend = () => { currentUtterance = null; if (btn) btn.classList.remove("ait-speaking"); };
    utter.onerror = () => { currentUtterance = null; if (btn) btn.classList.remove("ait-speaking"); };
    speechSynthesis.speak(utter);
  }

  // --- Translate Button ---
  function showTranslateBtn(x, y, text) {
    removeBtn();
    const btn = document.createElement("button");
    btn.className = "ai-translator-btn";
    btn.innerHTML = ICON_TRANSLATE;
    btn.title = "Dịch sang tiếng Việt";

    // Position near mouse, adjusted for viewport
    let left = x + 8;
    let top = y - 48;
    if (left + 48 > window.innerWidth) left = window.innerWidth - 52;
    if (top < 4) top = y + 12;

    btn.style.left = left + "px";
    btn.style.top = top + "px";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection().toString().trim();
      if (sel) doTranslate(sel, left, top + 48);
      removeBtn();
    });

    document.body.appendChild(btn);
    translateBtn = btn;
  }

  // --- Translation Popup ---
  function showPopup(x, y, originalText, translatedText, error) {
    removePopup();

    const el = document.createElement("div");
    el.className = "ai-translator-popup";

    const isLoading = !translatedText && !error;

    let resultHtml;
    if (error) {
      resultHtml = `<div class="ai-translator-error"><span class="ai-translator-error-icon">⚠️</span><span class="ai-translator-error-msg">${escapeHtml(error)}</span></div>`;
    } else if (isLoading) {
      resultHtml = `<div class="ai-translator-loading"><div class="ai-translator-dots"><span></span><span></span><span></span></div><span class="ai-translator-loading-text">Đang dịch...</span></div>`;
    } else {
      resultHtml = `<div class="ai-translator-text">${escapeHtml(translatedText)}</div>`;
    }

    el.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">AI Translator</span>
        <button class="ai-translator-close" title="Đóng">✕</button>
      </div>
      <div class="ai-translator-section ai-translator-section--en">
        <div class="ai-translator-label"><span class="ai-translator-label-dot ai-translator-label-dot--en"></span>English</div>
        <div class="ai-translator-text">${escapeHtml(originalText.length > 500 ? originalText.slice(0, 500) + "…" : originalText)}</div>
        <button class="ai-translator-speak" data-lang="en" title="Phát âm">
          ${ICON_SPEAKER} Phát âm
        </button>
      </div>
      <div class="ai-translator-divider"></div>
      <div class="ai-translator-section ai-translator-section--vi">
        <div class="ai-translator-label"><span class="ai-translator-label-dot ai-translator-label-dot--vi"></span>Tiếng Việt</div>
        <div class="ai-translator-result">${resultHtml}</div>
      </div>
    `;

    // Position
    let left = Math.min(x, window.innerWidth - 400);
    let top = y + 12;
    if (left < 16) left = 16;

    el.style.left = left + "px";
    el.style.top = top + "px";

    document.body.appendChild(el);
    popup = el;

    // Adjust if overflows viewport bottom
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 16) {
        el.style.top = Math.max(16, y - rect.height - 12) + "px";
      }
    });

    // Events
    el.querySelector(".ai-translator-close").addEventListener("click", removePopup);
    const speakBtn = el.querySelector(".ai-translator-speak");
    speakBtn.addEventListener("click", () => speak(originalText, "en", speakBtn));

    return el;
  }

  function updatePopupResult(translatedText, error) {
    if (!popup) return;
    const resultContainer = popup.querySelector(".ai-translator-result");
    if (!resultContainer) return;

    if (error) {
      resultContainer.innerHTML = `<div class="ai-translator-error"><span class="ai-translator-error-icon">⚠️</span><span class="ai-translator-error-msg">${escapeHtml(error)}</span></div>`;
    } else {
      resultContainer.innerHTML = `<div class="ai-translator-text">${escapeHtml(translatedText)}</div>`;
    }
  }

  // --- Check if extension context is still valid ---
  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  // --- Translate Flow ---
  function doTranslate(text, x, y) {
    if (!isExtensionValid()) {
      showPopup(x, y, text, null, "Extension đã được reload. Hãy refresh trang (F5) để tiếp tục sử dụng.");
      return;
    }

    showPopup(x, y, text, null, null); // loading state

    try {
      chrome.runtime.sendMessage({ action: "translate", text }, (response) => {
        if (chrome.runtime.lastError) {
          updatePopupResult(null, "Extension đã được reload. Hãy refresh trang (F5).");
          return;
        }
        if (response && response.success) {
          updatePopupResult(response.translation, null);
        } else {
          updatePopupResult(null, response?.error || "Không thể kết nối AI. Kiểm tra cài đặt trong Settings.");
        }
      });
    } catch (err) {
      updatePopupResult(null, "Extension đã được reload. Hãy refresh trang (F5).");
    }
  }

  // --- Event Listeners ---
  document.addEventListener("mouseup", (e) => {
    if (e.target.closest(".ai-translator-btn") || e.target.closest(".ai-translator-popup")) return;

    setTimeout(() => {
      const text = window.getSelection().toString().trim();
      if (text.length > 0 && text.length < 5000) {
        showTranslateBtn(e.clientX, e.clientY, text);
      } else {
        removeBtn();
      }
    }, 10);
  });

  document.addEventListener("dblclick", (e) => {
    if (e.target.closest(".ai-translator-btn") || e.target.closest(".ai-translator-popup")) return;

    setTimeout(() => {
      const text = window.getSelection().toString().trim();
      if (text.length > 0 && text.length < 5000) {
        removeBtn();
        doTranslate(text, e.clientX, e.clientY);
      }
    }, 10);
  });

  // Close popup when clicking outside
  document.addEventListener("mousedown", (e) => {
    if (popup && !e.target.closest(".ai-translator-popup") && !e.target.closest(".ai-translator-btn")) {
      removePopup();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { removePopup(); removeBtn(); closeChatPanel(); }
  });

  // ========== Q&A CHAT PANEL ==========

  const ICON_CHAT = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;
  const ICON_SEND = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
  const ICON_NEW_CHAT = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;

  let chatPanel = null;
  let chatToggle = null;
  let chatMessages = [];
  let pageText = null;
  let chatOpen = false;

  function extractPageText() {
    const article = document.querySelector("article") || document.querySelector("main") || document.querySelector('[role="main"]');
    let text = (article || document.body).innerText;
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
  }

  function getChatStorageKey() {
    return `chat_${location.hostname}${location.pathname}`;
  }

  function saveChatHistory() {
    if (!isExtensionValid()) return;
    try {
      chrome.runtime.sendMessage({
        action: "saveChatHistory",
        key: getChatStorageKey(),
        messages: chatMessages,
      });
    } catch (e) { /* ignore */ }
  }

  function loadChatHistory(callback) {
    if (!isExtensionValid()) { callback([]); return; }
    try {
      chrome.runtime.sendMessage(
        { action: "loadChatHistory", key: getChatStorageKey() },
        (response) => {
          if (chrome.runtime.lastError) { callback([]); return; }
          callback(response?.messages || []);
        }
      );
    } catch (e) { callback([]); }
  }

  function createChatToggle() {
    if (chatToggle) return;
    const btn = document.createElement("button");
    btn.className = "ai-chat-toggle";
    btn.innerHTML = ICON_CHAT;
    btn.title = "Chat với nội dung trang";
    btn.addEventListener("click", () => {
      if (chatOpen) { closeChatPanel(); } else { openChatPanel(); }
    });
    document.body.appendChild(btn);
    chatToggle = btn;
  }

  function openChatPanel() {
    if (chatPanel) return;
    chatOpen = true;
    chatToggle?.classList.add("active");

    if (!pageText) { pageText = extractPageText(); }

    const panel = document.createElement("div");
    panel.className = "ai-chat-panel";
    panel.innerHTML = `
      <div class="ai-chat-header">
        <div class="ai-chat-header-left">
          <span class="ai-chat-title">💬 Chat với trang</span>
        </div>
        <div class="ai-chat-header-actions">
          <button class="ai-chat-new" title="Cuộc trò chuyện mới">${ICON_NEW_CHAT}</button>
          <button class="ai-chat-close" title="Đóng">✕</button>
        </div>
      </div>
      <div class="ai-chat-body">
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="ai-chat-welcome">
            <div class="ai-chat-welcome-icon">🤖</div>
            <div class="ai-chat-welcome-text">Xin chào! Tôi có thể giúp bạn tìm hiểu nội dung trang này. Hãy đặt câu hỏi bất kỳ.</div>
          </div>
        </div>
      </div>
      <div class="ai-chat-input-area">
        <textarea class="ai-chat-input" placeholder="Hỏi về nội dung trang..." rows="1"></textarea>
        <button class="ai-chat-send" title="Gửi">${ICON_SEND}</button>
      </div>
    `;

    document.body.appendChild(panel);
    chatPanel = panel;

    panel.querySelector(".ai-chat-close").addEventListener("click", closeChatPanel);
    panel.querySelector(".ai-chat-new").addEventListener("click", startNewChat);

    const input = panel.querySelector(".ai-chat-input");
    const sendBtn = panel.querySelector(".ai-chat-send");

    sendBtn.addEventListener("click", () => sendChatMessage(input));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(input);
      }
    });

    // Auto-resize textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    // Load saved history
    loadChatHistory((messages) => {
      if (messages.length > 0) {
        chatMessages = messages;
        renderAllMessages();
      }
    });

    input.focus();
  }

  function closeChatPanel() {
    if (chatPanel) {
      chatPanel.classList.add("ai-chat-panel--closing");
      const panelRef = chatPanel;
      setTimeout(() => { panelRef.remove(); }, 200);
      chatPanel = null;
    }
    chatOpen = false;
    chatToggle?.classList.remove("active");
  }

  function startNewChat() {
    chatMessages = [];
    saveChatHistory();
    pageText = extractPageText();

    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (messagesEl) {
      messagesEl.innerHTML = `
        <div class="ai-chat-welcome">
          <div class="ai-chat-welcome-icon">🤖</div>
          <div class="ai-chat-welcome-text">Cuộc trò chuyện mới! Hãy đặt câu hỏi về nội dung trang.</div>
        </div>
      `;
    }
  }

  function renderAllMessages() {
    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    chatMessages.forEach((msg) => appendMessageBubble(msg.role, msg.content, false));
    scrollToBottom();
  }

  function appendMessageBubble(role, content, animate = true) {
    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (!messagesEl) return;

    const welcome = messagesEl.querySelector(".ai-chat-welcome");
    if (welcome) welcome.remove();

    const bubble = document.createElement("div");
    bubble.className = `ai-chat-bubble ai-chat-bubble--${role === "user" ? "user" : "ai"}`;
    if (animate) bubble.classList.add("ai-chat-bubble--animate");

    let html = escapeHtml(content);
    if (role === "assistant") {
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\n/g, "<br>");
    }

    bubble.innerHTML = `<div class="ai-chat-bubble-content">${html}</div>`;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function showTypingIndicator() {
    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (!messagesEl) return;
    const typing = document.createElement("div");
    typing.className = "ai-chat-typing";
    typing.id = "ai-chat-typing";
    typing.innerHTML = `<div class="ai-chat-dots"><span></span><span></span><span></span></div><span class="ai-chat-typing-text">Đang suy nghĩ...</span>`;
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    chatPanel?.querySelector("#ai-chat-typing")?.remove();
  }

  function scrollToBottom() {
    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (messagesEl) {
      requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }
  }

  function sendChatMessage(inputEl) {
    const text = inputEl.value.trim();
    if (!text) return;

    if (!isExtensionValid()) {
      appendMessageBubble("assistant", "Extension đã được reload. Hãy refresh trang (F5) để tiếp tục sử dụng.");
      return;
    }

    inputEl.value = "";
    inputEl.style.height = "auto";

    chatMessages.push({ role: "user", content: text });
    appendMessageBubble("user", text);
    showTypingIndicator();

    try {
      chrome.runtime.sendMessage(
        { action: "askPage", pageContent: pageText, messages: chatMessages },
        (response) => {
          removeTypingIndicator();
          if (chrome.runtime.lastError) {
            const errMsg = "Extension đã được reload. Hãy refresh trang (F5).";
            chatMessages.push({ role: "assistant", content: errMsg });
            appendMessageBubble("assistant", errMsg);
            return;
          }
          if (response?.success) {
            chatMessages.push({ role: "assistant", content: response.answer });
            appendMessageBubble("assistant", response.answer);
          } else {
            const errMsg = response?.error || "Không thể kết nối AI. Kiểm tra cài đặt trong Settings.";
            chatMessages.push({ role: "assistant", content: errMsg });
            appendMessageBubble("assistant", errMsg);
          }
          saveChatHistory();
        }
      );
    } catch (err) {
      removeTypingIndicator();
      const errMsg = "Extension đã được reload. Hãy refresh trang (F5).";
      chatMessages.push({ role: "assistant", content: errMsg });
      appendMessageBubble("assistant", errMsg);
    }
  }

  // Initialize chat toggle button
  createChatToggle();
})();
