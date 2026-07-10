/**
 * Grand Lynks Hotel Chatbot Assistant Widget
 * Self-contained component that dynamically loads into Admin / Super Admin dashboards.
 */

(function () {
    console.log("Grand Lynks Assistant loading...");

    // 1. Inject Styles
    const styleElement = document.createElement("style");
    styleElement.textContent = `
        /* Assistant Panel Container Styles */
        #grand-lynks-assistant-panel {
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(12px);
            background: rgba(255, 255, 255, 0.96);
            border-left: 1px solid rgba(229, 231, 235, 0.5);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 99999;
        }

        /* Typing Indicator Animation */
        .gl-typing-dot {
            width: 6px;
            height: 6px;
            background-color: #6366f1;
            border-radius: 50%;
            animation: gl-typing 1.4s infinite ease-in-out both;
        }
        .gl-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .gl-typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes gl-typing {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }

        /* Floating Bubble pulsing animation */
        @keyframes gl-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 4px 20px rgba(99, 102, 241, 0.6); }
        }
        .gl-bubble-pulse {
            animation: gl-pulse 3s infinite ease-in-out;
        }

        /* Custom scrollbar for chat viewport */
        .gl-chat-scrollbar::-webkit-scrollbar {
            width: 5px;
        }
        .gl-chat-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .gl-chat-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }
        .gl-chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    `;
    document.head.appendChild(styleElement);

    // 2. Load Conversation History from sessionStorage
    let history = [];
    try {
        const storedHistory = sessionStorage.getItem("gl_assistant_history");
        if (storedHistory) {
            history = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.error("Error loading chat history:", e);
    }

    // 3. Create DOM Elements
    // Floating Bubble
    const bubble = document.createElement("button");
    bubble.id = "grand-lynks-assistant-bubble";
    bubble.className = "hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95 gl-bubble-pulse z-[99998]";
    bubble.innerHTML = `
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
    `;
    document.body.appendChild(bubble);

    // Sidebar Panel
    const panel = document.createElement("div");
    panel.id = "grand-lynks-assistant-panel";
    panel.className = "fixed top-0 right-0 h-full w-full sm:w-[400px] transform translate-x-full flex flex-col z-[99999] border-l border-gray-200";
    panel.innerHTML = `
        <!-- Panel Header -->
        <div class="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between border-b border-indigo-950 flex-shrink-0">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center font-bold text-indigo-200">GL</div>
                <div>
                    <h4 class="font-bold text-sm leading-none">Grand Lynks Assistant</h4>
                    <span class="text-[10px] text-indigo-300 font-medium">Real-time Hotel System Assistant</span>
                </div>
            </div>
            <button id="grand-lynks-assistant-close" class="text-indigo-200 hover:text-white p-1 rounded hover:bg-indigo-800/40 transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Chat Viewport -->
        <div id="grand-lynks-assistant-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 gl-chat-scrollbar text-sm">
            <!-- Messages populated here -->
        </div>

        <!-- Panel Footer / Input Area -->
        <div class="p-3 bg-white border-t border-gray-150 flex-shrink-0">
            <form id="grand-lynks-assistant-form" class="flex gap-2">
                <input type="text" id="grand-lynks-assistant-input" placeholder="Ask about open rooms, revenue, guests..." required autocomplete="off"
                    class="flex-1 border border-gray-250 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 text-gray-800">
                <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl flex items-center justify-center transition shadow-sm w-9 h-9">
                    <svg class="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(panel);

    // 4. Dom References
    const closeBtn = document.getElementById("grand-lynks-assistant-close");
    const messagesContainer = document.getElementById("grand-lynks-assistant-messages");
    const inputField = document.getElementById("grand-lynks-assistant-input");
    const form = document.getElementById("grand-lynks-assistant-form");

    // 5. Open/Close Handlers
    bubble.addEventListener("click", () => {
        panel.classList.remove("translate-x-full");
        inputField.focus();
        scrollToBottom();
    });

    closeBtn.addEventListener("click", () => {
        panel.classList.add("translate-x-full");
    });

    // 6. Custom Markdown Parser
    function parseMarkdown(text) {
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Code blocks
        html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
            return `<pre class="bg-gray-800 text-gray-150 rounded-lg p-2.5 text-xs overflow-x-auto font-mono my-2 border border-gray-700">${code.trim()}</pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-indigo-50 px-1 py-0.5 rounded text-indigo-700 font-mono text-[11px] border border-indigo-100">$1</code>');

        // Headers
        html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-xs font-bold text-indigo-900 uppercase tracking-wider mt-3 mb-1.5 border-b pb-0.5 border-indigo-50">$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-sm font-bold text-indigo-950 mt-4 mb-2">$1</h2>');

        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');

        // Split to parse lists and tables
        let lines = html.split('\n');
        let inList = false;
        let inOList = false;
        let inTable = false;
        let tableRows = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Tables
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                if (!line.includes('---')) {
                    let cells = line.split('|').slice(1, -1).map(c => c.trim());
                    tableRows.push(cells);
                }
                lines[i] = '';
                continue;
            } else if (inTable) {
                inTable = false;
                let tableHtml = '<div class="overflow-x-auto my-2.5 border border-gray-200 rounded-lg"><table class="min-w-full divide-y divide-gray-200 text-[11px] text-left"><thead class="bg-gray-100 text-gray-700 font-semibold">';
                if (tableRows.length > 0) {
                    tableHtml += '<tr>' + tableRows[0].map(c => `<th class="px-2.5 py-1.5 font-semibold">${c}</th>`).join('') + '</tr></thead><tbody class="divide-y divide-gray-150 bg-white text-gray-600">';
                    for (let r = 1; r < tableRows.length; r++) {
                        tableHtml += '<tr>' + tableRows[r].map(c => `<td class="px-2.5 py-1.5">${c}</td>`).join('') + '</tr>';
                    }
                }
                tableHtml += '</tbody></table></div>';
                lines[i - 1] = tableHtml;
            }

            // Bullet lists
            if (line.startsWith('* ') || line.startsWith('- ')) {
                let content = line.substring(2);
                if (!inList) {
                    inList = true;
                    lines[i] = '<ul class="list-disc ml-5 my-1.5 space-y-1 text-gray-700">' + `<li>${content}</li>`;
                } else {
                    lines[i] = `<li>${content}</li>`;
                }
            } else if (inList) {
                inList = false;
                lines[i - 1] = lines[i - 1] + '</ul>';
            }

            // Ordered lists
            let matchO = line.match(/^(\d+)\.\s+(.+)$/);
            if (matchO) {
                let content = matchO[2];
                if (!inOList) {
                    inOList = true;
                    lines[i] = '<ol class="list-decimal ml-5 my-1.5 space-y-1 text-gray-700">' + `<li>${content}</li>`;
                } else {
                    lines[i] = `<li>${content}</li>`;
                }
            } else if (inOList) {
                inOList = false;
                lines[i - 1] = lines[i - 1] + '</ol>';
            }
        }

        if (inList) lines[lines.length - 1] = lines[lines.length - 1] + '</ul>';
        if (inOList) lines[lines.length - 1] = lines[lines.length - 1] + '</ol>';
        if (inTable) {
            let tableHtml = '<div class="overflow-x-auto my-2.5 border border-gray-200 rounded-lg"><table class="min-w-full divide-y divide-gray-200 text-[11px] text-left"><thead class="bg-gray-100 text-gray-700 font-semibold">';
            if (tableRows.length > 0) {
                tableHtml += '<tr>' + tableRows[0].map(c => `<th class="px-2.5 py-1.5 font-semibold">${c}</th>`).join('') + '</tr></thead><tbody class="divide-y divide-gray-150 bg-white text-gray-600">';
                for (let r = 1; r < tableRows.length; r++) {
                    tableHtml += '<tr>' + tableRows[r].map(c => `<td class="px-2.5 py-1.5">${c}</td>`).join('') + '</tr>';
                }
            }
            tableHtml += '</tbody></table></div>';
            lines[lines.length - 1] = tableHtml;
        }

        return lines.join('\n').replace(/\n/g, '<br>');
    }

    // 7. Message Rendering
    function appendMessage(role, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`;

        const isSystem = (role === 'system');

        let bubbleClass = "";
        if (role === 'user') {
            bubbleClass = "bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-sm";
        } else if (isSystem) {
            bubbleClass = "bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-xs border border-amber-200 max-w-[90%]";
        } else {
            bubbleClass = "bg-white text-gray-700 rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[85%] border border-gray-200 shadow-sm leading-relaxed";
        }

        msgDiv.innerHTML = `
            <div class="${bubbleClass}">
                ${isSystem ? text : parseMarkdown(text)}
            </div>
            <span class="text-[9px] text-gray-400 mt-1 px-1">${role === 'user' ? 'You' : 'Assistant'}</span>
        `;

        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const ind = document.createElement("div");
        ind.id = "grand-lynks-assistant-typing";
        ind.className = "flex items-center gap-1 bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200 shadow-sm w-16";
        ind.innerHTML = `
            <div class="gl-typing-dot"></div>
            <div class="gl-typing-dot"></div>
            <div class="gl-typing-dot"></div>
        `;
        messagesContainer.appendChild(ind);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const ind = document.getElementById("grand-lynks-assistant-typing");
        if (ind) ind.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Populate existing history
    if (history.length === 0) {
        // Welcome message
        appendMessage('assistant', "Hello! I am your real-time Grand Lynks Hotel Assistant. How can I help you manage the hotel today?");
    } else {
        history.forEach(item => {
            appendMessage(item.role, item.content);
        });
    }

    // 8. Submit handler
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = inputField.value.trim();
        if (!text) return;

        // User message
        appendMessage('user', text);
        inputField.value = "";
        
        // Add to history
        history.push({ role: 'user', content: text });
        sessionStorage.setItem("gl_assistant_history", JSON.stringify(history));

        showTypingIndicator();

        try {
            const token = localStorage.getItem('adminToken');
            const baseUrl = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api';

            const response = await fetch(`${baseUrl}/assistant/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: text,
                    history: history.slice(0, -1) // pass history excluding the current user query (since backend appends it)
                })
            });

            removeTypingIndicator();

            if (response.ok) {
                const data = await response.json();
                
                // If it indicates local fallback mode and it's the first time, prepend a notice
                if (data.isLocalFallback && !sessionStorage.getItem("gl_fallback_notified")) {
                    appendMessage('system', "⚠️ **Local-Data Fallback Mode Active**: Gemini API Key not configured. Using rule-based local queries.");
                    sessionStorage.setItem("gl_fallback_notified", "true");
                }

                appendMessage('assistant', data.response);
                history.push({ role: 'assistant', content: data.response });
                sessionStorage.setItem("gl_assistant_history", JSON.stringify(history));
            } else if (response.status === 401 || response.status === 403) {
                appendMessage('system', "🔴 Your admin session has expired. Please refresh the page and log in again.");
            } else {
                appendMessage('assistant', "I apologize, but I encountered an error connecting to the backend. Please check connection and try again.");
            }

        } catch (err) {
            console.error("Assistant chat submit error:", err);
            removeTypingIndicator();
            appendMessage('assistant', "Unable to send message. Please ensure the backend server is running.");
        }
    });

    // 9. Session / Visibility Monitor
    // Toggle bubble visibility depending on whether the admin token is present
    function checkAuthToken() {
        const token = localStorage.getItem('adminToken');
        const bubbleEl = document.getElementById("grand-lynks-assistant-bubble");
        const panelEl = document.getElementById("grand-lynks-assistant-panel");

        if (token) {
            if (bubbleEl) bubbleEl.classList.remove("hidden");
        } else {
            if (bubbleEl) bubbleEl.classList.add("hidden");
            if (panelEl) panelEl.classList.add("translate-x-full");
        }
    }

    // Run immediately and then poll every 1s
    checkAuthToken();
    setInterval(checkAuthToken, 1000);

})();
