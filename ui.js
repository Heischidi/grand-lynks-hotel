// Minimal UI utilities: toasts and loading helpers
(function () {
  const containerId = "toast-container";
  function ensureContainer() {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement("div");
      el.id = containerId;
      el.style.position = "fixed";
      el.style.top = "16px";
      el.style.right = "16px";
      el.style.zIndex = "9999";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.gap = "8px";
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(message, type = "info", timeoutMs = 3000) {
    const el = document.createElement("div");
    el.textContent = message;
    el.style.padding = "12px 16px";
    el.style.borderRadius = "8px";
    el.style.color = type === "error" ? "#fff" : "#2C2C2C";
    el.style.background =
      type === "success" ? "#d1fae5" : type === "error" ? "#ef4444" : "#fde68a";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    ensureContainer().appendChild(el);
    setTimeout(() => el.remove(), timeoutMs);
  }

  function showLoading(id) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("data-loading", "1");
  }
  function hideLoading(id) {
    const el = document.getElementById(id);
    if (el) el.removeAttribute("data-loading");
  }

  window.UI = { toast, showLoading, hideLoading };
})();
