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
    if (e.key === "Escape") { removePopup(); removeBtn(); }
  });
})();
