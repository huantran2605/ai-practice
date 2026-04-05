I have created a comprehensive walkthrough for you, detailing every step we took to set up your OpenClaw Personal Assistant. Since you're a beginner, I’ve included explanations for *why* we ran certain commands and how the system works behind the scenes.

You can find the full guide here: [openclaw_setup_guide.md](file:///Users/huantran/.gemini/antigravity/brain/06979c4e-bbcf-49d4-ad68-ad5666d1484c/openclaw_setup_guide.md)

### 🌟 Summary of what we achieved:
*   **Infrastructure**: Set up a robust, auto-restarting background environment on your Ubuntu VM.
*   **Intelligence**: Connected the world's latest AI (Gemini 2.5 Flash) to your personal VM.
*   **Interface**: Built a direct bridge to your Telegram, so you can interact with your AI from anywhere in the world.
*   **Security**: Locked the assistant so only you (user #6001448551) can access its powerful capabilities.

It was a pleasure working with you to get this running! Feel free to ask if you want to install new "Skills" (like controlling your VM, searching the web, or managing your notes) or if you encounter any other questions as you explore.

Enjoy your new autonomous assistant! 🦞✨

```write_to_file
TargetFile: /Users/huantran/.gemini/antigravity/brain/06979c4e-bbcf-49d4-ad68-ad5666d1484c/openclaw_setup_guide.md
Overwrite: true
IsArtifact: true
ArtifactMetadata:
  ArtifactType: walkthrough
  Summary: A complete, step-by-step guide for beginners on how OpenClaw was deployed, configured, and optimized on an Ubuntu VM with Telegram integration and Gemini 2.5 Flash.
Description: Created a detailed walkthrough of the OpenClaw setup process for the user's reference and learning.
CodeContent: |
  # 🦞 OpenClaw Assistant: Complete Setup Walkthrough
  
  This guide documents the step-by-step process used to deploy and configure your **OpenClaw** personal AI assistant on your Ubuntu VM. This is designed for beginners to understand both the *how* and the *why*.
  
  ---
  
  ## 1. Environment Preparation
  Before installing the AI, we needed a modern environment.
  
  *   **Operating System**: Ubuntu Linux (Virtual Machine).
  *   **Node.js & pnpm**: We installed the latest Node.js (v25+) and the `pnpm` package manager. `pnpm` is faster and saves disk space compared to standard `npm`.
  
  ```bash
  # Commands used:
  sudo apt update && sudo apt install -y curl
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  source ~/.bashrc
  pnpm env use --global latest
  ```
  
  ---
  
  ## 2. Installing OpenClaw
  We cloned the OpenClaw repository from GitHub and "built" it. 
  
  *   **Building**: This step turns the human-readable source code into efficient "distribution" files that the machine runs.
  
  ```bash
  git clone https://github.com/openclaw/openclaw.git ~/openclaw
  cd ~/openclaw
  pnpm install  # Downloads all dependencies
  pnpm build    # Compiles the final app
  ```
  
  ---
  
  ## 3. Core Configuration
  OpenClaw uses two main places for its settings:
  1.  **`.env` file**: Stores your secret API keys and bot tokens.
  2.  **`openclaw.json`**: Stores the system behavior (which model to use, which internal features to enable).
  
  ### 🔑 The Keys
  *   **GEMINI_API_KEY**: The "brain" of the assistant.
  *   **TELEGRAM_BOT_TOKEN**: The "phone number" of your bot.
  *   **ALLOWED_TELEGRAM_UIDS**: The "lock" that prevents outsiders from using your bot.
  
  ---
  
  ## 4. Connecting Telegram
  We enabled the **Telegram Channel** in the configuration. Unlike a website, Telegram is a "push" channel, meaning the bot stays connected to Telegram's servers waiting for your message.
  
  ### 🔐 Security & Pairing
  To ensure total security, OpenClaw uses a **Pairing System**:
  1.  When you first messaged the bot, it saw an unknown user.
  2.  It generated a **Pairing Code**.
  3.  We ran `openclaw pairing approve telegram [CODE]` on the VM to verify that *you* are the rightful owner of that Telegram account.
  
  ---
  
  ## 5. Making it Persistent (Systemd)
  Normally, if you close your terminal or the VM restarts, the bot dies. To fix this, we created **systemd user services**.
  
  *   **Gateway**: The central hub that manages connections and logic.
  *   **Node Host**: The environment where the AI's skills (tools) execute.
  *   **Lingering**: We enabled `loginctl enable-linger`, which tells Ubuntu: "Keep this user's apps running even after they sign out."
  
  ```bash
  # Management commands:
  systemctl --user status openclaw-gateway
  systemctl --user restart openclaw-gateway
  ```
  
  ---
  
  ## 6. The "Gemini 2.5 Flash" Upgrade
  During setup, we hit a "404 Not Found" error. This happened because the AI world moves fast!
  
  *   **The Issue**: We tried calling `gemini-1.5-flash`, but by April 2026, Google had retired the 1.5 series in favor of the **Gemini 2.5** and **Gemini 3** families.
  *   **The Fix**: We updated the config to `google/gemini-2.5-flash`.
  *   **Why Flash?**: It is the "free and fast" model that gives you almost instant responses while staying within the free-tier limits of the Gemini API.
  
  ---
  
  ## 7. How to manage your bot now
  Whenever you want to check on your assistant, SSH into your VM and run:
  
  ```bash
  cd ~/openclaw
  
  # Check if everything is healthy
  node openclaw.mjs status --deep
  
  # See what the bot is thinking in real-time
  journalctl --user -u openclaw-gateway -f
  
  # Update to the latest version of OpenClaw
  node openclaw.mjs update
  ```
  
  ---
  
  ### 💡 Pro-Tip for Beginners:
  If the bot ever stops responding, the first thing to do is check the logs with `journalctl`. Most errors (like "expired API key" or "network out") will appear there in plain text!
  
  **Welcome to the future of personal AI!** 🦞🚀
```