/**
 * Grand Lynks Homes & Apartments — AI Hotel Concierge Widget
 * Floating luxury guest assistant powered by Grand Lynks backend & Gemini AI
 */
(function () {
  if (window.__GrandLynksConciergeLoaded) return;
  window.__GrandLynksConciergeLoaded = true;

  // Resolve base API URL
  function getApiBaseUrl() {
    if (window.APP_CONFIG && window.APP_CONFIG.API_URL) {
      return window.APP_CONFIG.API_URL.replace(/\/$/, "");
    }
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
    if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
      return `http://${hostname}:5000/api`;
    }
    return "/api";
  }

  // Pre-canned quick prompt questions
  const SUGGESTED_PROMPTS = [
    { label: "🛏️ Rooms & Rates", prompt: "What rooms and suites are available and what are their rates?" },
    { label: "⏰ Check-In Policies", prompt: "What are your check-in and check-out times and policies?" },
    { label: "🍽️ Dining & Room Service", prompt: "What food and drinks are on the restaurant menu and how do I order room service?" },
    { label: "💆 Spa Treatments", prompt: "What spa treatments and massage services do you offer?" },
    { label: "📍 Location & Contact", prompt: "Where is Grand Lynks located and how can I contact the hotel?" },
    { label: "📱 Self Check-in Kiosk", prompt: "How does the lobby self check-in kiosk and QR code pass work?" }
  ];

  const WELCOME_MESSAGE = "Welcome to Grand Lynks Homes & Apartments! ✨ How can I assist you with your stay, room reservations, dining, or hotel amenities today?";

  // Inject Styles
  const styleEl = document.createElement("style");
  styleEl.id = "grandlynks-concierge-styles";
  styleEl.textContent = `
    .glc-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 20px;
      background: linear-gradient(135deg, #07110D 0%, #064E3B 100%);
      border: 1.5px solid rgba(0, 230, 118, 0.4);
      box-shadow: 0 10px 25px -5px rgba(6, 78, 59, 0.4), 0 0 20px rgba(0, 230, 118, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483640;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      user-select: none;
      outline: none;
      padding: 0;
    }
    .glc-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 14px 30px -4px rgba(6, 78, 59, 0.5), 0 0 25px rgba(0, 230, 118, 0.45);
    }
    .glc-launcher:active {
      transform: scale(0.94);
    }
    .glc-launcher-aura {
      position: absolute;
      inset: -4px;
      border-radius: 24px;
      background: rgba(0, 230, 118, 0.2);
      animation: glcAura 3s infinite ease-out;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes glcAura {
      0% { transform: scale(0.95); opacity: 0.6; }
      50% { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(0.95); opacity: 0; }
    }
    .glc-launcher-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 13px;
      height: 13px;
      background: #00E676;
      border: 2px solid #07110D;
      border-radius: 50%;
    }

    /* Chat Window Container */
    .glc-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 590px;
      max-height: calc(85vh - 30px);
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483640;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .glc-chat-window.glc-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* Header */
    .glc-header {
      background: linear-gradient(135deg, #07110D 0%, #064E3B 100%);
      padding: 16px 18px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(16, 185, 129, 0.2);
      flex-shrink: 0;
    }
    .glc-header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .glc-header-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: rgba(0, 230, 118, 0.15);
      border: 1px solid rgba(0, 230, 118, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .glc-header-text h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ffffff;
    }
    .glc-header-text .glc-status-dot {
      width: 7px;
      height: 7px;
      background: #00E676;
      border-radius: 50%;
      box-shadow: 0 0 8px #00E676;
    }
    .glc-header-text span.glc-subtitle {
      display: block;
      font-size: 11px;
      color: #A7F3D0;
      margin-top: 1px;
      font-weight: 500;
    }
    .glc-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .glc-header-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: rgba(255, 255, 255, 0.8);
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      font-size: 16px;
    }
    .glc-header-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    /* Messages container */
    .glc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    .glc-message-row {
      display: flex;
      flex-direction: column;
      max-width: 90%;
      animation: glcFadeIn 0.25s ease-out;
    }
    @keyframes glcFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .glc-message-user {
      align-self: flex-end;
      align-items: flex-end;
    }
    .glc-message-assistant {
      align-self: flex-start;
      align-items: flex-start;
    }
    .glc-bubble {
      padding: 12px 14px;
      border-radius: 18px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }
    .glc-bubble-user {
      background: linear-gradient(135deg, #00A86B, #064E3B);
      color: #ffffff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2);
    }
    .glc-bubble-assistant {
      background: #ffffff;
      color: #1E293B;
      border: 1px solid #E2E8F0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .glc-bubble-assistant p {
      margin: 0 0 8px 0;
    }
    .glc-bubble-assistant p:last-child {
      margin-bottom: 0;
    }
    .glc-bubble-assistant h3, .glc-bubble-assistant h4 {
      margin: 4px 0 6px 0;
      font-size: 13px;
      font-weight: 700;
      color: #064E3B;
    }
    .glc-bubble-assistant ul {
      margin: 4px 0 8px 16px;
      padding: 0;
    }
    .glc-bubble-assistant li {
      margin-bottom: 4px;
    }
    .glc-bubble-assistant a {
      color: #059669;
      font-weight: 600;
      text-decoration: underline;
    }
    .glc-action-btn-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 6px;
      padding: 6px 12px;
      background: #00A86B;
      color: #ffffff !important;
      text-decoration: none !important;
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 168, 107, 0.3);
      transition: background 0.2s;
    }
    .glc-action-btn-link:hover {
      background: #064E3B;
    }

    /* Typing indicator */
    .glc-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .glc-typing-dot {
      width: 6px;
      height: 6px;
      background: #00A86B;
      border-radius: 50%;
      animation: glcBounce 1.4s infinite ease-in-out both;
    }
    .glc-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .glc-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes glcBounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    /* Quick Pills Bar */
    .glc-pills-bar {
      padding: 8px 12px;
      background: #ffffff;
      border-top: 1px solid #F1F5F9;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      flex-shrink: 0;
    }
    .glc-pills-bar::-webkit-scrollbar {
      display: none;
    }
    .glc-pill {
      background: #F1F5F9;
      color: #334155;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 9999px;
      border: 1px solid #E2E8F0;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .glc-pill:hover {
      background: #ECFDF5;
      border-color: #A7F3D0;
      color: #065F46;
      transform: translateY(-1px);
    }

    /* Input Footer */
    .glc-footer {
      padding: 10px 14px 14px 14px;
      background: #ffffff;
      border-top: 1px solid #E2E8F0;
      flex-shrink: 0;
    }
    .glc-input-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F1F5F9;
      border-radius: 9999px;
      padding: 4px 6px 4px 14px;
      border: 1.5px solid transparent;
      transition: all 0.2s ease;
    }
    .glc-input-box:focus-within {
      background: #ffffff;
      border-color: #00A86B;
      box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.15);
    }
    .glc-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 12.5px;
      color: #0F172A;
      font-family: inherit;
    }
    .glc-input::placeholder {
      color: #94A3B8;
    }
    .glc-send-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #00A86B;
      border: none;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .glc-send-btn:hover {
      background: #064E3B;
      transform: scale(1.05);
    }
    .glc-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* Mobile Responsive layout */
    @media (max-width: 480px) {
      .glc-chat-window {
        bottom: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        height: 85vh !important;
        max-height: 85vh !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        border-top-left-radius: 28px !important;
        border-top-right-radius: 28px !important;
      }
      .glc-launcher {
        bottom: 18px;
        right: 18px;
        width: 52px;
        height: 52px;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Neural SVG Icon
  const neuralSvg = `
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="13" cy="14" r="2.4" fill="#00E676" />
      <circle cx="20" cy="11" r="2.4" fill="#00E676" />
      <circle cx="27" cy="14" r="2.4" fill="#00E676" />
      <circle cx="20" cy="20" r="3.4" fill="#00E676" />
      <circle cx="14" cy="25" r="2.4" fill="#00E676" />
      <circle cx="26" cy="25" r="2.4" fill="#00E676" />
      <line x1="13" y1="14" x2="20" y2="11" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
      <line x1="20" y1="11" x2="27" y2="14" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
      <line x1="13" y1="14" x2="20" y2="20" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
      <line x1="27" y1="14" x2="20" y2="20" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
      <line x1="20" y1="20" x2="14" y2="25" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
      <line x1="20" y1="20" x2="26" y2="25" stroke="#00E676" stroke-width="1.3" stroke-opacity="0.8" />
    </svg>
  `;

  // Build DOM Structure
  const rootContainer = document.createElement("div");
  rootContainer.id = "grandlynks-concierge-root";
  rootContainer.innerHTML = `
    <!-- Floating Launcher Button -->
    <button class="glc-launcher" id="glcLauncher" aria-label="Open Grand Lynks Concierge">
      <span class="glc-launcher-aura"></span>
      ${neuralSvg}
      <span class="glc-launcher-badge"></span>
    </button>

    <!-- Chat Window -->
    <div class="glc-chat-window" id="glcChatWindow">
      <!-- Header -->
      <div class="glc-header">
        <div class="glc-header-brand">
          <div class="glc-header-avatar">
            ${neuralSvg}
          </div>
          <div class="glc-header-text">
            <h3>Grand Lynks Concierge <span class="glc-status-dot"></span></h3>
            <span class="glc-subtitle">AI Hotel Concierge & Guest Assistant</span>
          </div>
        </div>
        <div class="glc-header-actions">
          <button class="glc-header-btn" id="glcResetBtn" title="Reset Conversation">↺</button>
          <button class="glc-header-btn" id="glcCloseBtn" title="Close Chat">✕</button>
        </div>
      </div>

      <!-- Messages -->
      <div class="glc-messages" id="glcMessages"></div>

      <!-- Quick Action Pills -->
      <div class="glc-pills-bar" id="glcPillsBar"></div>

      <!-- Footer / Input -->
      <div class="glc-footer">
        <div class="glc-input-box">
          <input 
            type="text" 
            class="glc-input" 
            id="glcInput" 
            placeholder="Ask about rooms, dining, amenities..." 
            autocomplete="off"
          />
          <button class="glc-send-btn" id="glcSendBtn" title="Send message">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(rootContainer);

  // References
  const launcher = document.getElementById("glcLauncher");
  const chatWindow = document.getElementById("glcChatWindow");
  const closeBtn = document.getElementById("glcCloseBtn");
  const resetBtn = document.getElementById("glcResetBtn");
  const messagesBox = document.getElementById("glcMessages");
  const pillsBar = document.getElementById("glcPillsBar");
  const inputEl = document.getElementById("glcInput");
  const sendBtn = document.getElementById("glcSendBtn");

  let isOpen = false;
  let isThinking = false;
  let conversationHistory = [];

  // Parse basic markdown to HTML
  function formatMarkdown(text) {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Bullet lists
    html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
    html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/gim, "<ul>$1</ul>");

    // Links: [Text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, function (match, text, url) {
      if (url.endsWith(".html") || url.startsWith("tel:") || url.startsWith("mailto:")) {
        return `<a href="${url}" class="glc-action-btn-link">${text} →</a>`;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Paragraph line breaks
    html = html.replace(/\n\n+/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
  }

  // Render a message in chat
  function renderMessage(role, content) {
    const row = document.createElement("div");
    row.className = `glc-message-row glc-message-${role}`;

    const bubble = document.createElement("div");
    bubble.className = `glc-bubble glc-bubble-${role}`;

    if (role === "user") {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = formatMarkdown(content);
    }

    row.appendChild(bubble);
    messagesBox.appendChild(row);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  // Show typing indicator
  let typingIndicatorEl = null;
  function showTypingIndicator() {
    if (typingIndicatorEl) return;
    typingIndicatorEl = document.createElement("div");
    typingIndicatorEl.className = "glc-message-row glc-message-assistant";
    typingIndicatorEl.innerHTML = `
      <div class="glc-typing">
        <span class="glc-typing-dot"></span>
        <span class="glc-typing-dot"></span>
        <span class="glc-typing-dot"></span>
      </div>
    `;
    messagesBox.appendChild(typingIndicatorEl);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function hideTypingIndicator() {
    if (typingIndicatorEl) {
      typingIndicatorEl.remove();
      typingIndicatorEl = null;
    }
  }

  // Toggle chat
  function toggleChat(open) {
    isOpen = typeof open === "boolean" ? open : !isOpen;
    if (isOpen) {
      chatWindow.classList.add("glc-open");
      launcher.style.transform = "scale(0.9)";
      setTimeout(() => inputEl.focus(), 250);
    } else {
      chatWindow.classList.remove("glc-open");
      launcher.style.transform = "scale(1)";
    }
  }

  launcher.addEventListener("click", () => toggleChat());
  closeBtn.addEventListener("click", () => toggleChat(false));

  // Reset conversation
  resetBtn.addEventListener("click", () => {
    if (confirm("Would you like to clear the current chat history?")) {
      conversationHistory = [];
      try {
        sessionStorage.removeItem("grandlynks_concierge_history");
      } catch (e) {}
      messagesBox.innerHTML = "";
      renderMessage("assistant", WELCOME_MESSAGE);
    }
  });

  // Render suggested pills
  function renderPills() {
    pillsBar.innerHTML = "";
    SUGGESTED_PROMPTS.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "glc-pill";
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        if (isThinking) return;
        sendMessage(item.prompt);
      });
      pillsBar.appendChild(btn);
    });
  }

  // Send message
  async function sendMessage(text) {
    const cleanText = (text || inputEl.value || "").trim();
    if (!cleanText || isThinking) return;

    // Render user message
    renderMessage("user", cleanText);
    inputEl.value = "";
    sendBtn.disabled = true;
    isThinking = true;
    showTypingIndicator();

    // Append to history
    conversationHistory.push({ role: "user", content: cleanText });

    const apiUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${apiUrl}/guest-assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          history: conversationHistory.slice(-8)
        })
      });

      hideTypingIndicator();

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const reply = data.response || "I am currently at your service! Feel free to ask about our rooms, dining, or amenities.";

      renderMessage("assistant", reply);
      conversationHistory.push({ role: "assistant", content: reply });

      // Save state
      try {
        sessionStorage.setItem("grandlynks_concierge_history", JSON.stringify(conversationHistory.slice(-10)));
      } catch (e) {}

    } catch (err) {
      console.warn("Concierge API notice:", err.message);
      hideTypingIndicator();

      // Intelligent client-side fallback so guest is never left hanging
      let localReply = "";
      const lower = cleanText.toLowerCase();

      if (lower.includes("food") || lower.includes("menu") || lower.includes("restaurant") || lower.includes("eat") || lower.includes("dining") || lower.includes("room service") || lower.includes("breakfast") || lower.includes("drink")) {
        localReply = `### 🍽️ Dining & Room Service
Enjoy continental and authentic Nigerian dishes (Jollof Rice, grilled fish/chicken, pepper soup, cocktails) delivered straight to your room 24/7!

👉 [View Menu & Order Room Service](order.html)!`;
      } else if (lower.includes("check-in") || lower.includes("check in") || lower.includes("checkout") || lower.includes("time") || lower.includes("policy")) {
        localReply = `### ⏰ Check-In & Check-Out
* **Check-In**: From **2:00 PM**
* **Check-Out**: Until **12:00 PM (noon)**

You can also use our express lobby [Self Check-in Kiosk](checkin.html) for immediate access!`;
      } else if (lower.includes("room") || lower.includes("rate") || lower.includes("price") || lower.includes("suite") || lower.includes("book") || lower.includes("stay")) {
        localReply = `### 🛏️ Rooms & Suites
Grand Lynks offers beautifully furnished luxury rooms & executive suites:
* **Standard Room**: from ₦20,000 / night
* **Deluxe Room**: from ₦30,000 / night
* **Executive Suite**: from ₦45,000 / night

All suites include high-speed Wi-Fi, 24/7 power backup, smart TVs, and premium amenities.

👉 [Book a Room Now](booking.html) or browse photos on our [Rooms Page](rooms.html)!`;
      } else if (lower.includes("spa") || lower.includes("massage") || lower.includes("facial")) {
        localReply = `### 💆 Luxury Spa & Wellness
Rejuvenate with our Swedish massages, organic facials, and detox body scrubs.

👉 [Explore Spa Services](spa.html)!`;
      } else if (lower.includes("location") || lower.includes("where") || lower.includes("address") || lower.includes("contact") || lower.includes("phone")) {
        localReply = `### 📍 Location & Contact
* **Address**: 80 Pa Michael Imoudu Ave, Gwarinpa, Abuja, Nigeria.
* **Phone**: [+234 814 223 4691](tel:+2348142234691)
* **Email**: grandlynkshomesandapartments@gmail.com

👉 [View on Map & Contact Us](contact.html)!`;
      } else {
        localReply = `Welcome to Grand Lynks Homes & Apartments! ✨ We are located at 80 Pa Michael Imoudu Ave, Gwarinpa, Abuja.

How may I assist you with your stay today?
* 🛏️ [View Available Rooms](rooms.html)
* 📅 [Make a Reservation](booking.html)
* 🍽️ [Order Room Service](order.html)
* 💆 [Explore Luxury Spa](spa.html)
* 📍 [Contact & Directions](contact.html)`;
      }

      renderMessage("assistant", localReply);
      conversationHistory.push({ role: "assistant", content: localReply });

    } finally {
      isThinking = false;
      sendBtn.disabled = false;
    }
  }

  // Input event listeners
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", () => sendMessage());

  // Initialize
  renderPills();

  // Load prior history or welcome message
  let hasRestored = false;
  try {
    const saved = sessionStorage.getItem("grandlynks_concierge_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        conversationHistory = parsed;
        conversationHistory.forEach(msg => renderMessage(msg.role, msg.content));
        hasRestored = true;
      }
    }
  } catch (e) {}

  if (!hasRestored) {
    renderMessage("assistant", WELCOME_MESSAGE);
  }

})();
