/**
 * Application version information injected at build time.
 */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

export function logVersionInfo() {
    console.log(
        `%c aSpiral v${APP_VERSION} %c ${COMMIT_HASH} %c ${BUILD_TIME} `,
        'background: #7c3aed; color: white; padding: 2px 4px; border-radius: 2px 0 0 2px;',
        'background: #4c1d95; color: white; padding: 2px 4px;',
        'background: #2e1065; color: #a5b4fc; padding: 2px 4px; border-radius: 0 2px 2px 0;'
    );
}
