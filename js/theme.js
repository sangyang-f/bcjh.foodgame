(function () {
    var STORAGE_KEY = 'foodgame-theme';
    var THEME_ATTR = 'data-theme';
    var DARK = 'dark';
    var LIGHT = 'light';
    var META_THEME_SELECTOR = 'meta[name="theme-color"]';

    function getSavedTheme() {
        try {
            var theme = localStorage.getItem(STORAGE_KEY);
            return theme === DARK || theme === LIGHT ? theme : null;
        } catch (e) {
            return null;
        }
    }

    function getCurrentTheme() {
        return document.documentElement.getAttribute(THEME_ATTR) === DARK ? DARK : LIGHT;
    }

    function updateMetaTheme(theme) {
        var meta = document.querySelector(META_THEME_SELECTOR);
        if (!meta) {
            return;
        }
        meta.setAttribute('content', theme === DARK ? '#202733' : '#f5f6fa');
    }

    function updateToggle(theme) {
        var isDark = theme === DARK;
        var toggle = document.getElementById('chk-setting-theme');
        if (!toggle) {
            return;
        }

        toggle.checked = isDark;
        toggle.setAttribute('title', isDark ? '切换到浅色模式' : '切换到夜间模式');
        toggle.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到夜间模式');

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.bootstrapToggle) {
            var $toggle = window.jQuery(toggle);
            if ($toggle.parent().hasClass('toggle')) {
                $toggle.bootstrapToggle(isDark ? 'on' : 'off', true);
            }
        }
    }

    function applyTheme(theme) {
        var resolvedTheme = theme === DARK ? DARK : LIGHT;
        document.documentElement.setAttribute(THEME_ATTR, resolvedTheme);
        updateMetaTheme(resolvedTheme);
        updateToggle(resolvedTheme);
        try {
            localStorage.setItem(STORAGE_KEY, resolvedTheme);
        } catch (e) { }
    }

    function initThemeToggle() {
        updateMetaTheme(getCurrentTheme());
        updateToggle(getCurrentTheme());
    }

    document.addEventListener('DOMContentLoaded', function () {
        var savedTheme = getSavedTheme();
        if (savedTheme) {
            document.documentElement.setAttribute(THEME_ATTR, savedTheme);
        }
        initThemeToggle();

        if (window.jQuery) {
            window.jQuery(document).on('change', '#chk-setting-theme', function () {
                applyTheme(this.checked ? DARK : LIGHT);
            });
        } else {
            var toggle = document.getElementById('chk-setting-theme');
            if (toggle) {
                toggle.addEventListener('change', function () {
                    applyTheme(this.checked ? DARK : LIGHT);
                });
            }
        }
    });
})();
