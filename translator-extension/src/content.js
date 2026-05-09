/**
 * AI Translator EN→VI — Content Script
 * Detects text selection & double-click, shows translation popup with TTS.
 * Includes RAG-powered Chat Panel with toggle switch.
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

  function showTranslateBtn(x, y, text) {
    removeBtn();
    const btn = document.createElement("button");
    btn.className = "ai-translator-btn";
    btn.innerHTML = ICON_TRANSLATE;
    btn.title = "Dịch sang tiếng Việt";

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

    let left = Math.min(x, window.innerWidth - 400);
    let top = y + 12;
    if (left < 16) left = 16;
    el.style.left = left + "px";
    el.style.top = top + "px";

    document.body.appendChild(el);
    popup = el;

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 16) {
        el.style.top = Math.max(16, y - rect.height - 12) + "px";
      }
    });

    el.querySelector(".ai-translator-close").addEventListener("click", removePopup);
    const speakBtn = el.querySelector(".ai-translator-speak");
    speakBtn.addEventListener("click", () => speak(originalText, "en", speakBtn));
    return el;
  }

  function updatePopupResult(text, error, isIncremental = false, type = "content") {
    if (!popup) return;
    const resultContainer = popup.querySelector(".ai-translator-result");
    if (!resultContainer) return;
    
    if (error) {
      resultContainer.innerHTML = `<div class="ai-translator-error"><span class="ai-translator-error-icon">⚠️</span><span class="ai-translator-error-msg">${escapeHtml(error)}</span></div>`;
    } else {
      if (type === "thought") {
        let thoughtEl = resultContainer.querySelector(".ai-translator-thought");
        if (!thoughtEl) {
          const div = document.createElement("div");
          div.className = "ai-translator-thought";
          div.innerHTML = `<span class="ai-translator-thought-label">🤔 Thinking...</span><div class="ai-translator-thought-text"></div>`;
          resultContainer.prepend(div);
          thoughtEl = div.querySelector(".ai-translator-thought-text");
        }
        thoughtEl.textContent += text;
        return;
      }

      let textEl = resultContainer.querySelector(".ai-translator-text");
      if (!textEl) {
        if (!isIncremental) resultContainer.innerHTML = "";
        const div = document.createElement("div");
        div.className = "ai-translator-text";
        resultContainer.appendChild(div);
        textEl = div;
      }
      
      if (isIncremental) {
        textEl.textContent += text;
      } else {
        textEl.textContent = text;
      }
    }
  }

  function isExtensionValid() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  function doTranslate(text, x, y) {
    if (!isExtensionValid()) {
      showPopup(x, y, text, null, "Extension đã được reload. Hãy refresh trang (F5).");
      return;
    }
    showPopup(x, y, text, null, null);
    
    try {
      const port = chrome.runtime.connect({ name: "ai-stream" });
      let hasReceivedData = false;
      let fullContent = "";
      let hasError = false;

      port.onMessage.addListener((msg) => {
        if (msg.action === "chunk") {
          if (!hasReceivedData) {
            hasReceivedData = true;
            const resultContainer = popup.querySelector(".ai-translator-result");
            if (resultContainer) {
              const loading = resultContainer.querySelector(".ai-translator-loading");
              if (loading) loading.remove();
            }
          }
          if (msg.type === "content") fullContent += msg.chunk;
          updatePopupResult(msg.chunk, null, true, msg.type);
        } else if (msg.action === "error") {
          hasError = true;
          updatePopupResult(null, msg.error);
        } else if (msg.action === "done") {
          port.disconnect();
        }
      });

      port.postMessage({ action: "translate", text });

      port.onDisconnect.addListener(() => {
        if (!hasReceivedData && !hasError) {
          updatePopupResult(null, "Không thể kết nối AI. Hãy kiểm tra Ollama hoặc API Key.");
        }
      });
    } catch (err) { 
      updatePopupResult(null, "Lỗi kết nối extension."); 
    }
  }

  // --- Event Listeners ---
  document.addEventListener("mouseup", (e) => {
    if (e.target.closest(".ai-translator-btn") || e.target.closest(".ai-translator-popup") || e.target.closest(".ai-chat-panel")) return;
    setTimeout(() => {
      const text = window.getSelection().toString().trim();
      if (text.length > 0 && text.length < 5000) { showTranslateBtn(e.clientX, e.clientY, text); }
      else { removeBtn(); }
    }, 10);
  });

  document.addEventListener("dblclick", (e) => {
    if (e.target.closest(".ai-translator-btn") || e.target.closest(".ai-translator-popup") || e.target.closest(".ai-chat-panel")) return;
    setTimeout(() => {
      const text = window.getSelection().toString().trim();
      if (text.length > 0 && text.length < 5000) { removeBtn(); doTranslate(text, e.clientX, e.clientY); }
    }, 10);
  });

  document.addEventListener("mousedown", (e) => {
    if (popup && !e.target.closest(".ai-translator-popup") && !e.target.closest(".ai-translator-btn")) { removePopup(); }
  });

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
  let chatPanelWidth = 400;
  let chatPanelHeight = 520;
  let chatMode = 'rag'; // 'rag' | 'context'
  let statusInterval = null;

  function extractPageText() {
    const article = document.querySelector("article") || document.querySelector("main") || document.querySelector('[role="main"]');
    let text = (article || document.body).innerText;
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
  }

  function renderMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="ai-chat-code-block"><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="ai-chat-inline-code">$1</code>');
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\n<ul>/g, ''); 
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\n<ol>/g, '');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function renderSuggestions() {
    const messagesEl = chatPanel?.querySelector(".ai-chat-messages");
    if (!messagesEl) return;
    chatPanel.querySelector(".ai-chat-suggestions")?.remove();
    const suggestions = ["Tóm tắt nội dung trang", "Các điểm quan trọng nhất?", "Giải thích ngắn gọn trang này"];
    const container = document.createElement("div");
    container.className = "ai-chat-suggestions";
    suggestions.forEach(text => {
      const chip = document.createElement("button");
      chip.className = "ai-chat-suggestion-chip";
      chip.textContent = text;
      chip.addEventListener("click", () => {
        const input = chatPanel.querySelector(".ai-chat-input");
        input.value = text;
        sendChatMessage(input);
        container.remove();
      });
      container.appendChild(chip);
    });
    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function makeResizable(panel) {
    const handles = ['t', 'l', 'tl'];
    handles.forEach(h => {
      const el = document.createElement("div");
      el.className = `ai-chat-resize-handle ai-chat-resize-handle-${h}`;
      panel.appendChild(el);
      el.addEventListener("mousedown", (e) => onResizeStart(e, h, panel));
    });
  }

  function onResizeStart(e, type, panel) {
    e.preventDefault(); e.stopPropagation();
    let startX = e.clientX, startY = e.clientY, startW = panel.offsetWidth, startH = panel.offsetHeight;
    document.body.style.cursor = window.getComputedStyle(e.target).cursor;
    panel.classList.add("ai-chat-resizing");
    const onMove = (me) => {
      if (type.includes("l")) {
        const nw = startW + (startX - me.clientX);
        if (nw > 320 && nw < 900) { panel.style.width = nw + "px"; chatPanelWidth = nw; }
      }
      if (type.includes("t")) {
        const nh = startH + (startY - me.clientY);
        if (nh > 350 && nh < window.innerHeight - 100) { panel.style.height = nh + "px"; chatPanelHeight = nh; }
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = ""; panel.classList.remove("ai-chat-resizing");
      chrome.storage.local.set({ chatPanelWidth, chatPanelHeight });
    };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }

  function openChatPanel() {
    if (chatPanel) return;
    chatOpen = true; chatToggle?.classList.add("active");
    if (!pageText) pageText = extractPageText();

    chrome.storage.local.get(["chatPanelWidth", "chatPanelHeight", "chatMode"], (res) => {
      if (res.chatPanelWidth) chatPanelWidth = res.chatPanelWidth;
      if (res.chatPanelHeight) chatPanelHeight = res.chatPanelHeight;
      if (res.chatMode) chatMode = res.chatMode;

      const panel = document.createElement("div");
      panel.className = "ai-chat-panel";
      panel.style.width = chatPanelWidth + "px";
      panel.style.height = chatPanelHeight + "px";
      panel.innerHTML = `
        <div class="ai-chat-header">
          <div class="ai-chat-header-left">
            <span class="ai-chat-title">💬 Chat với trang</span>
            <div class="ai-chat-mode-toggle">
              <button class="ai-chat-mode-btn ${chatMode === 'rag' ? 'active' : ''}" data-mode="rag">RAG</button>
              <button class="ai-chat-mode-btn ${chatMode === 'context' ? 'active' : ''}" data-mode="context">Context</button>
            </div>
          </div>
          <div class="ai-chat-header-actions">
            <button class="ai-chat-new" title="Mới">${ICON_NEW_CHAT}</button>
            <button class="ai-chat-close" title="Đóng">✕</button>
          </div>
        </div>
        <div class="ai-chat-status-bar" id="ai-chat-status-bar"></div>
        <div class="ai-chat-body">
          <div class="ai-chat-messages" id="ai-chat-messages"></div>
        </div>
        <div class="ai-chat-input-area">
          <textarea class="ai-chat-input" placeholder="Hỏi về nội dung trang..." rows="1"></textarea>
          <button class="ai-chat-send" title="Gửi">${ICON_SEND}</button>
        </div>
      `;

      document.body.appendChild(panel);
      chatPanel = panel;
      makeResizable(panel);

      panel.querySelector(".ai-chat-close").addEventListener("click", closeChatPanel);
      panel.querySelector(".ai-chat-new").addEventListener("click", startNewChat);
      panel.querySelectorAll(".ai-chat-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => switchMode(btn.dataset.mode));
      });

      const input = panel.querySelector(".ai-chat-input");
      panel.querySelector(".ai-chat-send").addEventListener("click", () => sendChatMessage(input));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(input); } });
      input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 100) + "px"; });

      loadChatHistory((messages) => {
        if (messages.length > 0) { chatMessages = messages; renderAllMessages(); }
        else { renderWelcome(); renderSuggestions(); }
      });

      if (chatMode === 'rag') startIndexing();
      input.focus();
    });
  }

  function switchMode(mode) {
    if (chatMode === mode) return;
    chatMode = mode;
    chrome.storage.local.set({ chatMode });
    chatPanel.querySelectorAll(".ai-chat-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    if (mode === 'rag') startIndexing();
    else updateStatusUI(null);
  }

  function startIndexing() {
    if (!isExtensionValid()) return;
    chrome.runtime.sendMessage({ action: "indexPage", pageContent: pageText });
    startStatusPolling();
  }

  function startStatusPolling() {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
      if (!chatOpen || chatMode !== 'rag') { clearInterval(statusInterval); return; }
      try {
        chrome.runtime.sendMessage({ action: "getIndexStatus" }, (status) => {
          if (chrome.runtime.lastError) { 
            console.warn("[AI Translator] Status polling error:", chrome.runtime.lastError);
            clearInterval(statusInterval); 
            return; 
          }
          if (status) {
            updateStatusUI(status);
            if (status.status === 'ready' || status.status === 'error') clearInterval(statusInterval);
          }
        });
      } catch (e) {
        clearInterval(statusInterval);
      }
    }, 500);
  }

  function updateStatusUI(status) {
    const bar = chatPanel?.querySelector("#ai-chat-status-bar");
    if (!bar) return;
    if (!status || chatMode === 'context') { bar.innerHTML = ""; bar.style.display = "none"; return; }
    
    bar.style.display = "block";
    let html = "";
    if (status.status === 'loading_model') {
      html = `<div class="ai-chat-status-msg">🔄 Đang tải AI model...</div>`;
    } else if (status.status === 'indexing') {
      const pct = Math.round((status.progress.current / status.progress.total) * 100) || 0;
      html = `
        <div class="ai-chat-status-info">
          <span>📊 Đang phân tích: ${status.progress.current}/${status.progress.total}</span>
          <span>${pct}%</span>
        </div>
        <div class="ai-chat-progress-bg"><div class="ai-chat-progress-fill" style="width: ${pct}%"></div></div>
      `;
    } else if (status.status === 'ready') {
      html = `<div class="ai-chat-status-msg ready">✅ Đã lập chỉ mục ${status.progress.total} đoạn</div>`;
      setTimeout(() => { if (chatMode === 'rag') bar.style.display = "none"; }, 3000);
    } else if (status.status === 'error') {
      html = `<div class="ai-chat-status-msg error">❌ Lỗi: ${status.lastError}</div>`;
    }
    bar.innerHTML = html;
  }

  function closeChatPanel() {
    if (chatPanel) {
      chatPanel.classList.add("ai-chat-panel--closing");
      const ref = chatPanel; setTimeout(() => ref.remove(), 200); chatPanel = null;
    }
    chatOpen = false; chatToggle?.classList.remove("active");
    if (statusInterval) clearInterval(statusInterval);
  }

  function startNewChat() {
    chatMessages = []; saveChatHistory();
    const el = chatPanel?.querySelector(".ai-chat-messages");
    if (el) { el.innerHTML = ""; renderWelcome(); renderSuggestions(); }
  }

  function renderWelcome() {
    const el = chatPanel?.querySelector(".ai-chat-messages");
    if (!el) return;
    const welcome = document.createElement("div");
    welcome.className = "ai-chat-welcome";
    welcome.innerHTML = `<div class="ai-chat-welcome-icon">🤖</div><div class="ai-chat-welcome-text">Xin chào! Tôi có thể giúp bạn tìm hiểu nội dung trang này. Hãy đặt câu hỏi bất kỳ.</div>`;
    el.appendChild(welcome);
  }

  function renderAllMessages() {
    const el = chatPanel?.querySelector(".ai-chat-messages");
    if (!el) return; el.innerHTML = "";
    chatMessages.forEach(msg => appendBubble(msg.role, msg.content, false));
    scrollToBottom();
  }

  function appendBubble(role, content, animate = true) {
    const el = chatPanel?.querySelector(".ai-chat-messages");
    if (!el) return null;
    el.querySelector(".ai-chat-welcome")?.remove();
    const b = document.createElement("div");
    b.className = `ai-chat-bubble ai-chat-bubble--${role === "user" ? "user" : "ai"}`;
    if (animate) b.classList.add("ai-chat-bubble--animate");
    b.innerHTML = `
      <div class="ai-chat-bubble-thought hidden">
        <div class="ai-chat-thought-header">💡 Reasoning...</div>
        <div class="ai-chat-thought-content"></div>
      </div>
      <div class="ai-chat-bubble-content">${role === "assistant" ? renderMarkdown(content) : escapeHtml(content)}</div>
    `;
    el.appendChild(b); scrollToBottom();
    return b;
  }

  function sendChatMessage(inputEl) {
    const text = inputEl.value.trim();
    if (!text || !isExtensionValid()) return;
    inputEl.value = ""; inputEl.style.height = "auto";
    chatMessages.push({ role: "user", content: text });
    appendBubble("user", text);
    showTyping();

    try {
      const port = chrome.runtime.connect({ name: "ai-stream" });
      let fullResponse = "";
      let fullThought = "";
      let bubble = null;
      let hasReceivedData = false;

      port.onMessage.addListener((msg) => {
        if (msg.action === "chunk") {
          hasReceivedData = true;
          if (!bubble) {
            hideTyping();
            bubble = appendBubble("assistant", "");
          }

          if (msg.type === "thought") {
            fullThought += msg.chunk;
            const thoughtContainer = bubble.querySelector(".ai-chat-bubble-thought");
            thoughtContainer.classList.remove("hidden");
            thoughtContainer.querySelector(".ai-chat-thought-content").textContent = fullThought;
          } else {
            fullResponse += msg.chunk;
            bubble.querySelector(".ai-chat-bubble-content").innerHTML = renderMarkdown(fullResponse);
          }
          scrollToBottom();
        } else if (msg.action === "error") {
          hideTyping();
          appendBubble("assistant", "⚠️ Lỗi: " + msg.error);
          port.disconnect();
        } else if (msg.action === "done") {
          if (!hasReceivedData) {
            hideTyping();
            appendBubble("assistant", "Không nhận được phản hồi từ AI.");
          } else {
            chatMessages.push({ role: "assistant", content: fullResponse });
            saveChatHistory();
          }
          port.disconnect();
        }
      });

      port.postMessage({ 
        action: "askPage", 
        mode: chatMode, 
        pageContent: pageText, 
        messages: chatMessages 
      });

    } catch (err) {
      hideTyping();
      appendBubble("assistant", "Lỗi: " + err.message);
    }
  }

  function showTyping() {
    const el = chatPanel?.querySelector(".ai-chat-messages");
    if (!el) return;
    const t = document.createElement("div");
    t.className = "ai-chat-typing"; t.id = "ai-chat-typing";
    t.innerHTML = `<div class="ai-chat-dots"><span></span><span></span><span></span></div><span class="ai-chat-typing-text">Đang suy nghĩ...</span>`;
    el.appendChild(t); scrollToBottom();
  }
  function hideTyping() { chatPanel?.querySelector("#ai-chat-typing")?.remove(); }
  function scrollToBottom() { const el = chatPanel?.querySelector(".ai-chat-messages"); if (el) requestAnimationFrame(() => el.scrollTop = el.scrollHeight); }

  function saveChatHistory() {
    if (isExtensionValid()) chrome.runtime.sendMessage({ action: "saveChatHistory", key: `chat_${location.hostname}${location.pathname}`, messages: chatMessages });
  }

  function loadChatHistory(cb) {
    if (!isExtensionValid()) { cb([]); return; }
    chrome.runtime.sendMessage({ action: "loadChatHistory", key: `chat_${location.hostname}${location.pathname}` }, (r) => cb(r?.messages || []));
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

  console.log("[AI Translator] Content script loaded.");
  // Initialize chat toggle button
  if (document.body) {
    createChatToggle();
  } else {
    document.addEventListener("DOMContentLoaded", createChatToggle);
  }
})();
