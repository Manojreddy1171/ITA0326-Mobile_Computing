/**
 * AgriConnect – Theme Engine (Dark/Light) & Google Translate Integration
 * Full site-wide translation (English, Tamil, Sinhala) using Google Translate
 * with instant client-side dictionary acceleration and complete Dark Mode / Light Mode theming.
 */

(function () {
    "use strict";

    const THEME_STORAGE_KEY = "agri_theme";
    const LANG_STORAGE_KEY = "agri_language";

    // -------------------------------------------------------------------------
    // 1. DICTIONARY ACCELERATION (Instant Client-Side Translation)
    // -------------------------------------------------------------------------
    const DICTIONARY = {
        ta: {
            "Dashboard": "டாஷ்போர்டு",
            "Farmer Dashboard": "விவசாயி டாஷ்போர்டு",
            "Buyer Dashboard": "வாங்குபவர் டாஷ்போர்டு",
            "Admin Dashboard": "நிர்வாகி டாஷ்போர்டு",
            "Marketplace": "சந்தை",
            "Crops": "பயிர்கள்",
            "My Crops": "எனது பயிர்கள்",
            "Add Crop": "பயிர் சேர்க்க",
            "Wholesale Price Negotiator": "மொத்த விலை பேச்சுவார்த்தையாளர்",
            "Group Buying": "குழு கொள்முதல்",
            "Demand Pooling": "தேவை ஒருங்கிணைப்பு",
            "Camera & Image Upload Studio": "கேமரா மற்றும் படப் பதிவேற்ற அரங்கம்",
            "Orders": "ஆர்டர்கள்",
            "Equipment Rental": "உபகரணங்கள் வாடகை",
            "Consultations": "ஆலோசனைகள்",
            "Settings": "அமைப்புகள்",
            "Language": "மொழி",
            "Choose the language you'd like to use across AgriConnect.": "AgriConnect முழுவதும் நீங்கள் பயன்படுத்த விரும்பும் மொழியைத் தேர்ந்தெடுக்கவும்.",
            "Appearance & Theme": "தோற்றம் மற்றும் தீம்",
            "Switch between Light Mode and Dark Mode across AgriConnect.": "AgriConnect முழுவதும் ஒளி முறை மற்றும் இருண்ட முறைக்கு இடையில் மாறவும்.",
            "Light Mode": "ஒளி முறை",
            "Dark Mode": "இருண்ட முறை",
            "Logout": "வெளியேறு",
            "Login": "உள்நுழைக",
            "Register": "பதிவு செய்க",
            "Price": "விலை",
            "Quantity": "அளவு",
            "Negotiate": "பேச்சுவார்த்தை",
            "Buy Now": "இப்போது வாங்கவும்",
            "Join Pool": "குழுவில் சேரவும்",
            "Target Reached": "இலக்கு எட்டப்பட்டது",
            "Accepted": "ஏற்றுக்கொள்ளப்பட்டது",
            "Pending": "நிலுவையில் உள்ளது",
            "Search": "தேடுக",
            "Save": "சேமிக்க",
            "Cancel": "ரத்துசெய்"
        },
        si: {
            "Dashboard": "උපකරණ පුවරුව",
            "Farmer Dashboard": "ගොවි උපකරණ පුවරුව",
            "Buyer Dashboard": "මිලදී ගන්නන්ගේ පුවරුව",
            "Admin Dashboard": "පරිපාලක පුවරුව",
            "Marketplace": "වෙළඳපොළ",
            "Crops": "බෝග",
            "My Crops": "මගේ බෝග",
            "Add Crop": "බෝගයක් එක් කරන්න",
            "Wholesale Price Negotiator": "තොග මිල සාකච්ඡාකරු",
            "Group Buying": "කණ්ඩායම් මිලදී ගැනීම",
            "Demand Pooling": "ඉල්ලුම එකතු කිරීම",
            "Camera & Image Upload Studio": "කැමරා සහ ඡායාරූප උඩුගත කිරීම",
            "Orders": "ඇණවුම්",
            "Equipment Rental": "උපකරණ කුලියට දීම",
            "Consultations": "උපදේශන",
            "Settings": "සැකසුම්",
            "Language": "භාෂාව",
            "Choose the language you'd like to use across AgriConnect.": "AgriConnect හි ඔබ භාවිතා කිරීමට කැමති භාෂාව තෝරන්න.",
            "Appearance & Theme": "පෙනුම සහ තේමාව",
            "Switch between Light Mode and Dark Mode across AgriConnect.": "AgriConnect පුරා දීප්තිමත් මාදිලිය සහ අඳුරු මාදිලිය අතර මාරු වන්න.",
            "Light Mode": "දීප්තිමත් මාදිලිය",
            "Dark Mode": "අඳුරු මාදිලිය",
            "Logout": "පිටවීම",
            "Login": "ඇතුල් වන්න",
            "Register": "ලියාපදිංචි වන්න",
            "Price": "මිල",
            "Quantity": "ප්‍රමාණය",
            "Negotiate": "සාකච්ඡා කරන්න",
            "Buy Now": "දැන් මිලදී ගන්න",
            "Join Pool": "එක්වන්න",
            "Target Reached": "ඉලක්කය සපුරා ඇත",
            "Accepted": "පිළිගන්නා ලදී",
            "Pending": "පොරොත්තුවේ",
            "Search": "සොයන්න",
            "Save": "සුරකින්න",
            "Cancel": "අවලංගු කරන්න"
        }
    };

    function applyDictionaryTranslation(lang) {
        if (!lang || lang === "en" || !DICTIONARY[lang]) return;
        const dict = DICTIONARY[lang];

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while ((node = walker.nextNode())) {
            const trimmed = node.nodeValue.trim();
            if (trimmed && dict[trimmed]) {
                node.nodeValue = node.nodeValue.replace(trimmed, dict[trimmed]);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. THEME ENGINE (Dark / Light Mode)
    // -------------------------------------------------------------------------

    function getInitialTheme() {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
            return stored;
        }
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "dark";
        }
        return "light";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        if (document.body) {
            document.body.classList.toggle("dark-theme", theme === "dark");
        }
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        // Update Theme buttons in Settings pages if present
        document.querySelectorAll(".theme-option").forEach(function (btn) {
            const isMatch = btn.dataset.theme === theme;
            btn.classList.toggle("selected", isMatch);
            const check = btn.querySelector(".theme-check");
            if (check) check.style.display = isMatch ? "inline-block" : "none";
        });

        // Update floating quick bar button icon
        const quickThemeBtn = document.getElementById("agriThemeBtn");
        if (quickThemeBtn) {
            if (theme === "dark") {
                quickThemeBtn.innerHTML = '<span>☀️</span> <span class="agri-theme-label">Light</span>';
                quickThemeBtn.setAttribute("title", "Switch to Light Mode");
            } else {
                quickThemeBtn.innerHTML = '<span>🌙</span> <span class="agri-theme-label">Dark</span>';
                quickThemeBtn.setAttribute("title", "Switch to Dark Mode");
            }
        }
    }

    window.setAgriTheme = function (theme) {
        applyTheme(theme);
    };

    window.toggleAgriTheme = function () {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
    };

    // Apply theme immediately before DOM full load to prevent white flash
    const initialTheme = getInitialTheme();
    document.documentElement.setAttribute("data-theme", initialTheme);

    // -------------------------------------------------------------------------
    // 3. GOOGLE TRANSLATION ENGINE ("fix use goggle")
    // Supports: English ('en'), Tamil ('ta'), Sinhala ('si')
    // -------------------------------------------------------------------------

    function getSavedLanguage() {
        return localStorage.getItem(LANG_STORAGE_KEY) || "en";
    }

    function setGoogleTransCookie(lang) {
        const domain = window.location.hostname;
        const cookieVal = lang === "en" ? "/en/en" : ("/en/" + lang);
        const pastDate = "Thu, 01 Jan 1970 00:00:00 UTC";

        // Set googtrans cookie on root path and host domain
        document.cookie = "googtrans=" + cookieVal + "; path=/;";
        document.cookie = "googtrans=" + cookieVal + "; path=/; domain=" + domain + ";";

        if (domain && domain !== "localhost" && !domain.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            document.cookie = "googtrans=" + cookieVal + "; path=/; domain=." + domain + ";";
        }

        if (lang === "en") {
            // Clear any lingering sub-domain cookies for English reset
            document.cookie = "googtrans=; expires=" + pastDate + "; path=/;";
            document.cookie = "googtrans=; expires=" + pastDate + "; path=/; domain=" + domain + ";";
        }

        localStorage.setItem(LANG_STORAGE_KEY, lang);
    }

    function triggerGoogleTranslateCombo(lang) {
        const combo = document.querySelector(".goog-te-combo");
        if (combo) {
            combo.value = lang;
            combo.dispatchEvent(new Event("change"));
            return true;
        }
        return false;
    }

    function updateLanguageUI(lang) {
        // Update all .lang-option buttons in settings pages
        document.querySelectorAll(".lang-option").forEach(function (btn) {
            const isMatch = btn.dataset.lang === lang;
            btn.classList.toggle("selected", isMatch);
            const check = btn.querySelector(".lang-check");
            if (check) check.style.display = isMatch ? "inline-block" : "none";
        });

        // Update floating quick bar select dropdown
        const quickSelect = document.getElementById("agriLangSelect");
        if (quickSelect && quickSelect.value !== lang) {
            quickSelect.value = lang;
        }
    }

    window.changeAgriLanguage = async function (lang) {
        if (!lang) return;
        setGoogleTransCookie(lang);
        updateLanguageUI(lang);

        // Attempt backend sync if user session exists
        try {
            const rawUser = sessionStorage.getItem("user");
            if (rawUser) {
                const userObj = JSON.parse(rawUser);
                const uid = userObj.id || userObj.userId;
                if (uid) {
                    await fetch("/api/settings/" + uid + "/language", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ language: lang })
                    }).catch(function () {});
                    userObj.preferred_language = lang;
                    sessionStorage.setItem("user", JSON.stringify(userObj));
                }
            }
        } catch (e) {}

        // Immediate dictionary translation
        applyDictionaryTranslation(lang);

        // Trigger Google Translate engine
        const triggered = triggerGoogleTranslateCombo(lang);
        if (!triggered || lang === "en") {
            // Reload page to let Google Translate initialize with new cookie cleanly
            window.location.reload();
        }
    };

    // Global callback required by Google Translate script
    window.agriGoogleTranslateInit = function () {
        if (window.google && window.google.translate) {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    includedLanguages: "en,ta,si",
                    autoDisplay: false
                },
                "google_translate_element"
            );

            // Once initialized, ensure active language is selected in combo
            const currentLang = getSavedLanguage();
            if (currentLang && currentLang !== "en") {
                setTimeout(function () {
                    triggerGoogleTranslateCombo(currentLang);
                }, 500);
            }
        }
    };

    function injectGoogleTranslateScript() {
        // Container element
        if (!document.getElementById("google_translate_element")) {
            const div = document.createElement("div");
            div.id = "google_translate_element";
            div.style.display = "none";
            document.body.appendChild(div);
        }

        // Script element
        if (!document.getElementById("agriGoogleTranslateScript")) {
            const script = document.createElement("script");
            script.id = "agriGoogleTranslateScript";
            script.type = "text/javascript";
            script.src = "//translate.google.com/translate_a/element.js?cb=agriGoogleTranslateInit";
            script.async = true;
            document.head.appendChild(script);
        }
    }

    // -------------------------------------------------------------------------
    // 4. FLOATING QUICK ACTION BAR (Language & Theme Switcher on all pages)
    // -------------------------------------------------------------------------

    function injectQuickBar() {
        if (document.getElementById("agriQuickBar")) return;

        const currentTheme = getInitialTheme();
        const currentLang = getSavedLanguage();

        const bar = document.createElement("div");
        bar.id = "agriQuickBar";
        bar.setAttribute("aria-label", "Quick settings");

        bar.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:14px;">🌐</span>
                <select class="agri-lang-select" id="agriLangSelect" title="Select Website Language">
                    <option value="en">English</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="si">සිංහල (Sinhala)</option>
                </select>
            </div>
            <div style="width:1px;height:18px;background:var(--agri-border,#ccc);margin:0 4px;"></div>
            <button type="button" class="agri-quick-btn" id="agriThemeBtn" title="Toggle Dark/Light Mode">
                <span>${currentTheme === "dark" ? "☀️" : "🌙"}</span>
                <span class="agri-theme-label">${currentTheme === "dark" ? "Light" : "Dark"}</span>
            </button>
        `;

        document.body.appendChild(bar);

        // Language select change
        const langSelect = document.getElementById("agriLangSelect");
        if (langSelect) {
            langSelect.value = currentLang;
            langSelect.addEventListener("change", function () {
                window.changeAgriLanguage(this.value);
            });
        }

        // Theme button click
        const themeBtn = document.getElementById("agriThemeBtn");
        if (themeBtn) {
            themeBtn.addEventListener("click", function () {
                window.toggleAgriTheme();
            });
        }
    }

    // -------------------------------------------------------------------------
    // 5. SETTINGS PAGES THEME & LANGUAGE HOOKS
    // -------------------------------------------------------------------------

    function setupSettingsPageHooks() {
        const currentLang = getSavedLanguage();
        const currentTheme = getInitialTheme();

        // Bind existing .lang-option buttons
        document.querySelectorAll(".lang-option").forEach(function (btn) {
            const lang = btn.dataset.lang;
            const isMatch = lang === currentLang;
            btn.classList.toggle("selected", isMatch);

            // Ensure checkmark is inside
            if (!btn.querySelector(".lang-check")) {
                const check = document.createElement("span");
                check.className = "lang-check";
                check.textContent = "✓";
                btn.appendChild(check);
            }

            // Remove old clones to prevent duplicate listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener("click", function () {
                window.changeAgriLanguage(newBtn.dataset.lang);
            });
        });

        // Inject or bind Theme options card in settings pages
        const langOptions = document.getElementById("languageOptions");
        if (langOptions && !document.getElementById("themeSettingsCard")) {
            const langCard = langOptions.closest(".settings-card");
            if (langCard && langCard.parentNode) {
                const themeCard = document.createElement("div");
                themeCard.className = "settings-card";
                themeCard.id = "themeSettingsCard";
                themeCard.innerHTML = `
                    <h3>Appearance & Theme</h3>
                    <p class="settings-card-desc">
                        Switch between Light Mode and Dark Mode across AgriConnect.
                    </p>
                    <div class="settings-theme-options" id="themeOptions">
                        <button type="button" class="theme-option ${currentTheme === 'light' ? 'selected' : ''}" data-theme="light">
                            <span class="theme-icon">☀️</span>
                            <span class="theme-name">Light Mode</span>
                            <span class="theme-check" style="${currentTheme === 'light' ? 'display:inline-block' : 'display:none'}">✓</span>
                        </button>
                        <button type="button" class="theme-option ${currentTheme === 'dark' ? 'selected' : ''}" data-theme="dark">
                            <span class="theme-icon">🌙</span>
                            <span class="theme-name">Dark Mode</span>
                            <span class="theme-check" style="${currentTheme === 'dark' ? 'display:inline-block' : 'display:none'}">✓</span>
                        </button>
                    </div>
                `;
                langCard.parentNode.insertBefore(themeCard, langCard.nextSibling);
            }
        }

        // Bind .theme-option buttons
        document.querySelectorAll(".theme-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
                window.setAgriTheme(btn.dataset.theme);
            });
        });
    }

    // -------------------------------------------------------------------------
    // 6. DOM CONTENT LOADED INITIALIZATION
    // -------------------------------------------------------------------------

    function init() {
        applyTheme(getInitialTheme());
        injectGoogleTranslateScript();
        injectQuickBar();
        setupSettingsPageHooks();
        updateLanguageUI(getSavedLanguage());
        applyDictionaryTranslation(getSavedLanguage());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
