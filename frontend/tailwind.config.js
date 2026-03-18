export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // App UI palette
                panel: '#101828',
                shell: '#0b1220',
                accent: '#22c55e',
                // Marketing / landing palette
                'm-bg': '#07090e', // deepest background
                'm-surface': '#0f1623', // clearly distinct alternate section bg
                'm-panel': '#161f2e', // card surface — visibly lifted from m-bg
                'm-border': '#2a3a52', // readable border on dark backgrounds
            },
        },
    },
    plugins: [],
};
