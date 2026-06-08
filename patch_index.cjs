const fs = require('fs');
const file = 'index.html';
let code = fs.readFileSync(file, 'utf8');

const targetScript = `    <!-- Runtime environment configuration (fallback for missing build-time vars) -->
    <script>
      (function () {
        var configScript = document.createElement('script');
        configScript.src = '/config.js';
        configScript.defer = true;
        configScript.onload = function () {
          if (!window.ENV) {
            console.error('[config] /config.js loaded but window.ENV is missing');
          }
        };
        configScript.onerror = function () {
          console.warn('[config] /config.js not found; falling back to build-time env');
        };
        document.head.appendChild(configScript);
      })();
    </script>`;

const replacementScript = `    <!-- Runtime environment configuration (synchronous — must load before app module) -->
    <!-- config.js sets window.ENV with Supabase credentials as a build-time fallback. -->
    <!-- If config.js is absent (404), the browser silently continues to build-time vars. -->
    <!-- See public/config.example.js for the expected format. -->
    <script>
      // Synchronous inline try/catch: attempt to load config.js if it exists.
      // We can't use a static <script src="/config.js"> here because a 404
      // would block page rendering. Instead, XHR synchronously (dev-safe approach).
      // In production, VITE_SUPABASE_URL is baked in at build time — this block
      // is only a fallback for environments where build-time vars are unavailable.
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/config.js', false); // synchronous
        xhr.send(null);
        if (xhr.status === 200) {
          // Execute the config.js content in the current scope
          (new Function(xhr.responseText))(); // sets window.ENV
          if (!window.ENV) {
            console.error('[config] /config.js loaded but window.ENV is missing');
          } else {
            console.debug('[config] Runtime environment loaded from /config.js');
          }
        }
        // 404 is expected — silently fall through to build-time vars
      } catch (e) {
        // Synchronous XHR blocked by CORS or other error — ignore, use build-time vars
        console.debug('[config] Could not load /config.js, using build-time env vars');
      }
    </script>`;

code = code.replace(targetScript, replacementScript);
fs.writeFileSync(file, code);
