export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Vercel-inspired dark theme
                'vercel-bg': '#0a0e27',      // Deep navy background
                'vercel-surface': '#111827', // Slightly lighter surface
                'vercel-card': '#1a202c',    // Card background
                'vercel-border': '#2d3748',  // Subtle borders
                'vercel-text': '#e2e8f0',    // Primary text
                'vercel-muted': '#a0aec0',   // Muted text
                'vercel-accent': '#10b981',  // Emerald green for actions

                // Legacy app UI palette (kept for compatibility)
                panel: '#101828',
                shell: '#0b1220',
                accent: '#22c55e',

                // Marketing / landing palette
                'm-bg': '#07090e',
                'm-surface': '#0f1623',
                'm-panel': '#161f2e',
                'm-border': '#2a3a52',
            },
            boxShadow: {
                'vercel-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'vercel-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'vercel-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                'vercel-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};
