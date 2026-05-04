/**
 * Extension Popup Script
 * Manages provider settings and health status display.
 */
document.addEventListener("DOMContentLoaded", () => {
  const btnLocal = document.getElementById("btn-local");
  const btnCloud = document.getElementById("btn-cloud");
  const apiKeySection = document.getElementById("api-key-section");
  const apiKeyInput = document.getElementById("api-key-input");
  const apiKeyToggle = document.getElementById("api-key-toggle");
  const saveToast = document.getElementById("save-toast");
  const ollamaStatus = document.getElementById("ollama-status");
  const modelStatus = document.getElementById("model-status");
  const ollamaRow = document.getElementById("ollama-row");
  const modelRow = document.getElementById("model-row");
  const footerText = document.getElementById("footer-text");

  let currentProvider = "local";
  let saveTimeout = null;

  // --- Load saved settings ---
  chrome.storage.local.get({ provider: "local", geminiApiKey: "" }, (items) => {
    currentProvider = items.provider;
    apiKeyInput.value = items.geminiApiKey || "";
    updateProviderUI(currentProvider);
    runHealthCheck();
  });

  // --- Provider buttons ---
  btnLocal.addEventListener("click", () => switchProvider("local"));
  btnCloud.addEventListener("click", () => switchProvider("cloud"));

  function switchProvider(provider) {
    currentProvider = provider;
    updateProviderUI(provider);
    saveSettings();
    runHealthCheck();
  }

  function updateProviderUI(provider) {
    btnLocal.classList.toggle("active", provider === "local");
    btnCloud.classList.toggle("active", provider === "cloud");

    if (provider === "cloud") {
      apiKeySection.classList.remove("hidden");
      ollamaRow.style.display = "none";
      modelRow.querySelector(".status-label").textContent = "Gemini";
      footerText.innerHTML = "<span>Powered by Google Gemini</span>";
    } else {
      apiKeySection.classList.add("hidden");
      ollamaRow.style.display = "";
      modelRow.querySelector(".status-label").textContent = "Model";
      footerText.innerHTML = "<span>Powered by Ollama + Qwen2.5</span>";
    }
  }

  // --- API Key input (auto-save on change) ---
  apiKeyInput.addEventListener("input", () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveSettings(), 600);
  });

  // --- Toggle API key visibility ---
  apiKeyToggle.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
  });

  // --- Save settings ---
  function saveSettings() {
    chrome.storage.local.set(
      { provider: currentProvider, geminiApiKey: apiKeyInput.value.trim() },
      () => {
        showToast();
        if (currentProvider === "cloud") runHealthCheck();
      }
    );
  }

  function showToast() {
    saveToast.classList.remove("hidden");
    saveToast.classList.add("show");
    setTimeout(() => {
      saveToast.classList.remove("show");
      setTimeout(() => saveToast.classList.add("hidden"), 300);
    }, 1500);
  }

  // --- Health check ---
  function runHealthCheck() {
    setStatus(modelStatus, "", "Đang kiểm tra...");
    setStatus(ollamaStatus, "", "Đang kiểm tra...");

    chrome.runtime.sendMessage({ action: "healthCheck" }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus(ollamaStatus, "offline", "Lỗi extension");
        setStatus(modelStatus, "offline", "—");
        return;
      }

      // Ollama status
      if (response.ollamaRunning) {
        setStatus(ollamaStatus, "online", "Đang chạy");
      } else {
        setStatus(ollamaStatus, "offline", "Không kết nối");
      }

      // Model / Gemini status based on current provider
      if (currentProvider === "local") {
        if (response.modelAvailable) {
          setStatus(modelStatus, "online", "qwen2.5:7b ✓");
        } else if (response.ollamaRunning) {
          setStatus(modelStatus, "offline", "Chưa tải model");
        } else {
          setStatus(modelStatus, "offline", "—");
        }
      } else {
        if (response.geminiReady) {
          setStatus(modelStatus, "online", "gemini-2.5-flash ✓");
        } else {
          setStatus(modelStatus, "offline", response.error || "Chưa sẵn sàng");
        }
      }
    });
  }

  function setStatus(badge, state, text) {
    badge.className = "status-badge " + state;
    badge.querySelector(".status-text").textContent = text;
  }
});
