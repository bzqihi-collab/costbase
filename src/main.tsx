import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

rootEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1114;color:#8b939e;font-family:sans-serif;"><div style="text-align:center"><div style="font-size:28px;margin-bottom:12px;">🏗️</div><p style="font-size:15px;">Loading CostBase...</p></div></div>';

// Detect if running inside Electron (preload already injected electronAPI)
const isElectron = !!(window as any).electronAPI?.invoke &&
  typeof (window as any).electronAPI.invoke === 'function' &&
  !(window as any).__BROWSER_MOCK__;

async function start() {
  try {
    // Browser mode: load sql.js WASM database + mock IPC
    // Electron mode: electronAPI already provided by preload, skip browser-db
    if (!isElectron) {
      const [{ initBrowserDB, installBrowserAPI }] = await Promise.all([import('./browser-db')]);
      await initBrowserDB();
      installBrowserAPI();
    }

    const [{ createRoot }] = await Promise.all([import('react-dom/client')]);
    const { default: App } = await import('./App');
    const { default: React } = await import('react');
    const { LanguageProvider } = await import('./i18n/LanguageContext');

    rootEl.innerHTML = '';
    createRoot(rootEl).render(
      React.createElement(LanguageProvider, null, React.createElement(App))
    );
  } catch (err) {
    console.error(err);
    rootEl.innerHTML = '<div style="color:#e0556a;padding:40px;font-family:sans-serif;background:#0d1114;height:100vh"><h2>Startup Error</h2><pre style="white-space:pre-wrap;font-size:12px">' + String(err) + '</pre></div>';
  }
}

start();
