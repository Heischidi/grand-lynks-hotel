// Mobile Enhancements for Grand Lynks Hotel Website
(function () {
  "use strict";

  // Mobile detection
  const isMobile = () => {
    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  };

  // Touch-friendly interactions
  const enhanceTouchInteractions = () => {
    if (!isMobile()) return;

    // Add touch feedback to buttons
    const buttons = document.querySelectorAll(
      ".btn, .nav-links a, .social-links a"
    );
    buttons.forEach((button) => {
      button.addEventListener("touchstart", function () {
        this.style.transform = "scale(0.95)";
      });

      button.addEventListener("touchend", function () {
        this.style.transform = "";
      });
    });

    // Prevent double-tap zoom on buttons
    buttons.forEach((button) => {
      button.addEventListener("touchend", function (e) {
        e.preventDefault();
        this.click();
      });
    });
  };

  // Smooth scrolling for mobile
  const enhanceSmoothScrolling = () => {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          const offsetTop = target.offsetTop - 80; // Account for fixed navbar
          window.scrollTo({
            top: offsetTop,
            behavior: "smooth",
          });
        }
      });
    });
  };

  // Enhanced mobile navigation
  const enhanceMobileNavigation = () => {
    const mobileToggle = document.querySelector(".mobile-menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const body = document.body;

    if (!mobileToggle || !navLinks) return;

    // Close mobile menu when clicking outside
    document.addEventListener("click", function (e) {
      if (!mobileToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove("active");
        mobileToggle.classList.remove("open");
        body.style.overflow = "";
      }
    });

    // Prevent body scroll when mobile menu is open
    mobileToggle.addEventListener("click", function () {
      if (navLinks.classList.contains("active")) {
        body.style.overflow = "";
      } else {
        body.style.overflow = "hidden";
      }
    });

    // Close mobile menu on escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("active")) {
        navLinks.classList.remove("active");
        mobileToggle.classList.remove("open");
        body.style.overflow = "";
      }
    });
  };

  // Optimize images for mobile
  const optimizeImagesForMobile = () => {
    if (!isMobile()) return;

    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      // Add loading="lazy" for better performance
      if (!img.hasAttribute("loading")) {
        img.setAttribute("loading", "lazy");
      }

      // Add error handling
      img.addEventListener("error", function () {
        this.style.display = "none";
        console.warn("Image failed to load:", this.src);
      });
    });
  };

  // Enhanced form handling for mobile
  const enhanceMobileForms = () => {
    if (!isMobile()) return;

    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      // Prevent zoom on iOS
      if (
        input.type === "text" ||
        input.type === "email" ||
        input.type === "tel"
      ) {
        input.style.fontSize = "16px";
      }

      // Add better focus handling
      input.addEventListener("focus", function () {
        this.parentElement.style.transform = "scale(1.02)";
      });

      input.addEventListener("blur", function () {
        this.parentElement.style.transform = "";
      });
    });
  };

  // Performance optimizations
  const optimizePerformance = () => {
    // Debounce scroll events
    let scrollTimeout;
    window.addEventListener("scroll", function () {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(function () {
        // Handle scroll-based animations here
      }, 16); // ~60fps
    });

    // Optimize resize events
    let resizeTimeout;
    window.addEventListener("resize", function () {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(function () {
        // Handle responsive adjustments here
      }, 250);
    });
  };

  // Accessibility enhancements
  const enhanceAccessibility = () => {
    // Add skip to content link
    const skipLink = document.createElement("a");
    skipLink.href = "#main-content";
    skipLink.textContent = "Skip to main content";
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--burgundy);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
    `;
    skipLink.addEventListener("focus", function () {
      this.style.top = "6px";
    });
    skipLink.addEventListener("blur", function () {
      this.style.top = "-40px";
    });
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content landmark
    const mainContent =
      document.querySelector(".hero-overlay") || document.querySelector("main");
    if (mainContent && !mainContent.id) {
      mainContent.id = "main-content";
    }
  };

  // Initialize all enhancements
  const init = () => {
    enhanceTouchInteractions();
    enhanceSmoothScrolling();
    enhanceMobileNavigation();
    optimizeImagesForMobile();
    enhanceMobileForms();
    optimizePerformance();
    enhanceAccessibility();

    // Re-initialize on orientation change
    window.addEventListener("orientationchange", function () {
      setTimeout(init, 100);
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for global access
  window.MobileEnhancements = {
    isMobile,
    init,
  };
})();
