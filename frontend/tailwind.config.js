/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom earth-tone palette
                branco: '#F6F5EB',
                areia: '#C5C29F',
                azul: '#89AAA3',
                telha: {
                    DEFAULT: '#BE4A01', // Shema orange - warm burnt orange
                    light: '#D4651F',
                    dark: '#8F3701',
                    muted: '#C97A3A', // Softer, more muted telha
                    soft: '#D4A574', // Even softer telha
                },
                shema: {
                    DEFAULT: '#BE4A01', // Primary Shema brand color
                    orange: '#BE4A01',
                    dark: '#8F3701',
                    light: '#D4651F',
                },
                'verde-claro': '#777D45',
                verde: '#3F3E20',
                preto: '#0A0703',

                // Semantic mappings
                primary: {
                    DEFAULT: '#BE4A01',
                    foreground: '#F6F5EB',
                },
                secondary: {
                    DEFAULT: '#89AAA3',
                    foreground: '#0A0703',
                },
                success: {
                    DEFAULT: '#777D45',
                    foreground: '#F6F5EB',
                },
                background: '#F6F5EB',
                foreground: '#0A0703',
                card: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#0A0703',
                },
                border: '#C5C29F',
                input: '#C5C29F',
                ring: '#BE4A01',
                muted: {
                    DEFAULT: '#C5C29F',
                    foreground: '#3F3E20',
                },
                accent: {
                    DEFAULT: '#89AAA3',
                    foreground: '#0A0703',
                },
                destructive: {
                    DEFAULT: '#BE4A01',
                    foreground: '#F6F5EB',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                lg: '0.75rem',
                md: '0.5rem',
                sm: '0.25rem',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-in': {
                    '0%': { opacity: '0', transform: 'translateX(-10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                'bounce-subtle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-3px)' },
                },
                'celebrate': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-in': 'slide-in 0.3s ease-out',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'bounce-subtle': 'bounce-subtle 0.5s ease-in-out',
                'celebrate': 'celebrate 0.4s ease-in-out',
            },
        },
    },
    plugins: [],
}
