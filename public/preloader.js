// Preloader functionality for Grand Lynks Hotel Website
(function () {
  "use strict";

  // Preloader state
  let isLoading = false;
  let loadingTimeout = null;

  // Initialize preloader
  function initPreloader() {
    // Create preloader HTML if it doesn't exist
    if (!document.querySelector(".preloader")) {
      const preloaderHTML = `
        <div class="preloader" id="mainPreloader">
          <div class="preloader-content">
            <div class="preloader-logo">Grand Lynks</div>
            <div class="preloader-text">Preparing your luxury experience...</div>
            <div class="preloader-spinner"></div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("afterbegin", preloaderHTML);
    }

    // Show preloader on page load
    showPreloader();

    // Hide preloader when page is fully loaded
    window.addEventListener("load", function () {
      console.log("Page load event fired, hiding preloader in 1 second...");
      setTimeout(hidePreloader, 1000); // Minimum 1 second display
    });

    // Hide preloader if page loads too quickly
    setTimeout(function () {
      if (document.readyState === "complete") {
        hidePreloader();
      }
    }, 3000);
  }

  // Show preloader
  function showPreloader() {
    const preloader = document.getElementById("mainPreloader");
    if (preloader) {
      preloader.classList.remove("hidden");
      isLoading = true;
    }
  }

  // Hide preloader
  function hidePreloader() {
    console.log("hidePreloader called");
    const preloader = document.getElementById("mainPreloader");
    if (preloader) {
      console.log("Preloader found, hiding...");
      preloader.classList.add("hidden");
      isLoading = false;

      // Remove preloader from DOM after animation
      setTimeout(() => {
        if (preloader && preloader.parentNode) {
          console.log("Removing preloader from DOM");
          preloader.parentNode.removeChild(preloader);
        }
      }, 500);
    } else {
      console.log("Preloader not found");
    }
  }

  // Show loading state for specific elements
  function showElementLoading(element, type = "page") {
    if (!element) return;

    element.classList.add(`${type}-loading`);

    // Disable interactions
    if (type === "form") {
      const inputs = element.querySelectorAll(
        "input, button, select, textarea"
      );
      inputs.forEach((input) => {
        input.disabled = true;
      });
    }
  }

  // Hide loading state for specific elements
  function hideElementLoading(element, type = "page") {
    if (!element) return;

    element.classList.remove(`${type}-loading`);

    // Re-enable interactions
    if (type === "form") {
      const inputs = element.querySelectorAll(
        "input, button, select, textarea"
      );
      inputs.forEach((input) => {
        input.disabled = false;
      });
    }
  }

  // Make functions globally available for debugging
  window.hidePreloader = hidePreloader;
  window.showPreloader = showPreloader;

  // Show button loading state
  function showButtonLoading(button) {
    if (!button) return;

    button.classList.add("loading");
    button.disabled = true;

    // Store original text
    button.setAttribute("data-original-text", button.textContent);
    button.textContent = "Loading...";
  }

  // Hide button loading state
  function hideButtonLoading(button) {
    if (!button) return;

    button.classList.remove("loading");
    button.disabled = false;

    // Restore original text
    const originalText = button.getAttribute("data-original-text");
    if (originalText) {
      button.textContent = originalText;
    }
  }

  // Enhanced fetch with loading states
  function fetchWithLoading(originalFetch, url, options = {}) {
    const loadingElement = options.loadingElement || document.body;
    const loadingType = options.loadingType || "page";

    showElementLoading(loadingElement, loadingType);

    return originalFetch(url, options).finally(() => {
      hideElementLoading(loadingElement, loadingType);
    });
  }

  // Handle form submissions with loading
  function handleFormWithLoading(form, submitHandler) {
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.setAttribute(
          "data-original-text",
          submitButton.textContent
        );
        showButtonLoading(submitButton);
      }

      if (typeof submitHandler === "function") {
        submitHandler(form);
      }
    });
  }

  // Show loading for navigation
  function showNavigationLoading() {
    if (isLoading) return; // Don't show if already loading

    showPreloader();

    // Hide after a minimum time
    loadingTimeout = setTimeout(() => {
      hidePreloader();
    }, 2000);
  }

  // Handle page transitions
  function handlePageTransitions() {
    // Show loading when clicking internal links
    document.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (
        link &&
        link.href &&
        link.href.startsWith(window.location.origin) &&
        !link.href.includes("#")
      ) {
        showNavigationLoading();
      }
    });

    // Show loading before page unload
    window.addEventListener("beforeunload", function () {
      if (!isLoading) {
        showPreloader();
      }
    });
  }

  // Handle API calls with loading
  function handleAPICalls() {
    // Override fetch to show loading for API calls
    const originalFetch = window.fetch;
    window.fetch = function (url, options = {}) {
      // Only show loading for API calls, not for images or other resources
      if (
        typeof url === "string" &&
        (url.includes("/api/") || url.includes("localhost:5000"))
      ) {
        const loadingElement =
          document.querySelector(".booking-content-wrapper") || document.body;
        return fetchWithLoading(originalFetch, url, {
          ...options,
          loadingElement: loadingElement,
          loadingType: "page",
        });
      }

      return originalFetch(url, options);
    };
  }

  // Handle image loading
  function handleImageLoading() {
    const images = document.querySelectorAll("img");
    let loadedImages = 0;
    const totalImages = images.length;

    if (totalImages === 0) return;

    images.forEach((img) => {
      if (img.complete) {
        loadedImages++;
      } else {
        img.addEventListener("load", function () {
          loadedImages++;
          if (loadedImages === totalImages) {
            // All images loaded
            setTimeout(hidePreloader, 500);
          }
        });

        img.addEventListener("error", function () {
          loadedImages++;
          if (loadedImages === totalImages) {
            // All images processed (including errors)
            setTimeout(hidePreloader, 500);
          }
        });
      }
    });

    // If all images are already loaded
    if (loadedImages === totalImages) {
      setTimeout(hidePreloader, 500);
    }
  }

  // Initialize everything
  function init() {
    initPreloader();
    handlePageTransitions();
    handleAPICalls(); // This is still useful for other API calls
    handleImageLoading();
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export functions for global access
  window.Preloader = {
    show: showPreloader,
    hide: hidePreloader,
    showElementLoading,
    hideElementLoading,
    showButtonLoading,
    hideButtonLoading,
    fetchWithLoading,
    handleFormWithLoading,
  };
})();
