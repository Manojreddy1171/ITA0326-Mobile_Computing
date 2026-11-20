/**
 * AgriConnect – Universal Mobile Navigation Drawer & Session Engine
 * Guarantees zero sidebar overlap, smooth drawer animation, and reliable mobile touch behavior.
 */

(function () {
    "use strict";

    function initNavigationDrawer() {
        const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
        if (!sidebar) return;

        // 1. Ensure Dimmed Backdrop Overlay Exists
        let overlay = document.getElementById("sidebarOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "sidebarOverlay";
            overlay.setAttribute("aria-hidden", "true");
            document.body.appendChild(overlay);
        }

        // 2. Ensure Close Button Exists inside Sidebar for Mobile
        if (!sidebar.querySelector(".sidebar-close-btn")) {
            const closeBtn = document.createElement("button");
            closeBtn.className = "sidebar-close-btn";
            closeBtn.setAttribute("aria-label", "Close navigation drawer");
            closeBtn.innerHTML = "✕";
            closeBtn.addEventListener("click", closeDrawer);
            sidebar.appendChild(closeBtn);
        }

        // 3. Setup Open/Close Methods
        function openDrawer() {
            sidebar.classList.add("open");
            overlay.classList.add("active");
            document.body.classList.add("drawer-open");
        }

        function closeDrawer() {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
            document.body.classList.remove("drawer-open");
        }

        function toggleDrawer(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (sidebar.classList.contains("open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        }

        // 4. Attach Hamburger Triggers
        const hamburgerButtons = document.querySelectorAll("#mobileMenu, .mobile-menu, .hamburger-btn, [data-toggle='sidebar']");
        hamburgerButtons.forEach(btn => {
            btn.removeEventListener("click", toggleDrawer);
            btn.addEventListener("click", toggleDrawer);
        });

        // If no hamburger button exists in header, create one automatically
        if (hamburgerButtons.length === 0) {
            const header = document.querySelector(".top-navbar, .header, .top-header, header");
            if (header) {
                const autoBurger = document.createElement("button");
                autoBurger.id = "mobileMenu";
                autoBurger.className = "mobile-menu hamburger-btn";
                autoBurger.setAttribute("aria-label", "Toggle navigation");
                autoBurger.innerHTML = "☰";
                autoBurger.addEventListener("click", toggleDrawer);
                header.insertBefore(autoBurger, header.firstChild);
            }
        }

        // 5. Click Overlay to Close
        overlay.addEventListener("click", closeDrawer);

        // 6. Click any Nav Link inside Sidebar to Close on Mobile
        const navLinks = sidebar.querySelectorAll("nav a, .nav-item, .sidebar-nav a");
        navLinks.forEach(link => {
            link.addEventListener("click", function () {
                if (window.innerWidth <= 900) {
                    closeDrawer();
                }
            });
        });

        // 7. ESC key to Close
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && sidebar.classList.contains("open")) {
                closeDrawer();
            }
        });

        // 8. Auto-close when resized to desktop
        window.addEventListener("resize", function () {
            if (window.innerWidth > 900 && sidebar.classList.contains("open")) {
                closeDrawer();
            }
        });

        // Expose globally
        window.AgriNavigation = {
            open: openDrawer,
            close: closeDrawer,
            toggle: toggleDrawer
        };
    }

    // Initialize on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavigationDrawer);
    } else {
        initNavigationDrawer();
    }
})();
