// debug.js - On-screen console for mobile debugging

const initDebugConsole = () => {
    // Create container
    const container = document.createElement('div');
    container.id = 'debug-console';
    container.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 300px;
        background: rgba(0, 0, 0, 0.9);
        color: #0f0;
        font-family: monospace;
        font-size: 12px;
        overflow-y: auto;
        z-index: 99999;
        padding: 10px;
        border-top: 2px solid #333;
        pointer-events: none; /* Let clicks pass through unless we enable interaction */
    `;

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '🐞 Debug';
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 310px;
        right: 10px;
        z-index: 100000;
        background: #f00;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        font-weight: bold;
    `;

    let isVisible = true;
    toggleBtn.onclick = () => {
        isVisible = !isVisible;
        container.style.display = isVisible ? 'block' : 'none';
        container.style.pointerEvents = isVisible ? 'auto' : 'none';
    };

    try {
        if (document.body) {
            document.body.appendChild(container);
            document.body.appendChild(toggleBtn);
        } else {
            console.error('document.body is null');
            // Try appending to documentElement as fallback
            document.documentElement.appendChild(container);
            document.documentElement.appendChild(toggleBtn);
        }
    } catch (e) {
        console.error('Failed to append debug console:', e);
        alert('Debug Console Error: ' + e.message);
    }

    // Helper to log to HTML
    const logToHtml = (type, args) => {
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #333';
        line.style.padding = '2px 0';

        if (type === 'error') line.style.color = '#f55';
        if (type === 'warn') line.style.color = '#fa0';

        const text = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return '[Circular/Object]';
                }
            }
            return String(arg);
        }).join(' ');

        line.textContent = `[${type}] ${text}`;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    };

    // Override console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
        originalLog.apply(console, args);
        logToHtml('log', args);
    };

    console.warn = (...args) => {
        originalWarn.apply(console, args);
        logToHtml('warn', args);
    };

    console.error = (...args) => {
        originalError.apply(console, args);
        logToHtml('error', args);
    };

    // Catch global errors
    window.addEventListener('error', (event) => {
        logToHtml('error', [`Uncaught Exception: ${event.message} at ${event.filename}:${event.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (event) => {
        logToHtml('error', [`Unhandled Rejection: ${event.reason}`]);
    });

    console.log('Debug console initialized');
};

initDebugConsole();
