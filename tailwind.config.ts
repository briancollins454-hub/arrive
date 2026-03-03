import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === ARRIVÉ BRAND PALETTE — Refined ===
        midnight: '#0a0e1a',
        charcoal: '#141825',
        slate: '#1e2538',
        steel: '#5c6b8a',
        silver: '#94a3c0',
        mist: '#c5cedf',
        cloud: '#e2e8f0',
        snow: '#f8fafc',
        cream: '#fffbf0',

        gold: {
          DEFAULT: '#c9a84c',
          light: '#e3c96e',
          dark: '#a68a2e',
          subtle: '#f5ecd7',
          muted: '#c9a84c20',
        },
        teal: {
          DEFAULT: '#0ea5a0',
          light: '#22d3c6',
          dark: '#0c857e',
          muted: '#0ea5a020',
        },

        // Accent palette for richness
        rose: {
          DEFAULT: '#f43f5e',
          muted: '#f43f5e15',
        },
        purple: {
          DEFAULT: '#a855f7',
          muted: '#a855f715',
        },
        blue: {
          DEFAULT: '#3b82f6',
          muted: '#3b82f615',
        },

        // Semantic
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'gold': '0 4px 16px rgba(201, 168, 76, 0.25)',
        'gold-lg': '0 8px 32px rgba(201, 168, 76, 0.3)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.12)',
        'booking': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 16px 64px 0 rgba(0, 0, 0, 0.5)',
        'glow-teal': '0 0 30px rgba(14, 165, 160, 0.3), 0 0 60px rgba(14, 165, 160, 0.1)',
        'glow-gold': '0 0 30px rgba(201, 168, 76, 0.3), 0 0 60px rgba(201, 168, 76, 0.1)',
        'glow-rose': '0 0 30px rgba(244, 63, 94, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
        'inner-glow-strong': 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)',
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.1)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.25), 0 10px 15px rgba(0,0,0,0.1)',
        'elevation-3': '0 10px 25px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'count-up': 'countUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ring-fill': 'ringFill 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'bar-grow': 'barGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'aurora': 'aurora 15s ease-in-out infinite alternate',
        'aurora-2': 'aurora2 18s ease-in-out infinite alternate-reverse',
        'border-glow': 'borderGlow 4s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'stagger-1': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards',
        'stagger-2': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
        'stagger-3': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards',
        'stagger-4': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards',
        'stagger-5': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards',
        'stagger-6': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
        'stagger-7': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards',
        'stagger-8': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards',
        'aurora-float-1': 'auroraFloat1 25s ease-in-out infinite',
        'aurora-float-2': 'auroraFloat2 30s ease-in-out infinite',
        'aurora-float-3': 'auroraFloat3 22s ease-in-out infinite',
        'scan': 'keyScan 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ringFill: {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: 'var(--ring-target)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(201, 168, 76, 0.15)' },
          '100%': { boxShadow: '0 0 30px rgba(201, 168, 76, 0.3)' },
        },
        barGrow: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        aurora: {
          '0%': { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: '0.3' },
          '33%': { transform: 'translate(30px, -50px) rotate(120deg) scale(1.1)', opacity: '0.5' },
          '66%': { transform: 'translate(-20px, 20px) rotate(240deg) scale(0.9)', opacity: '0.3' },
          '100%': { transform: 'translate(0, 0) rotate(360deg) scale(1)', opacity: '0.4' },
        },
        aurora2: {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '0.2' },
          '50%': { transform: 'translate(-40px, 30px) scale(1.2)', opacity: '0.4' },
          '100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.2' },
        },
        auroraFloat1: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '20%': { transform: 'translate3d(40px, 20px, 0) scale(1.05)' },
          '40%': { transform: 'translate3d(15px, -30px, 0) scale(1.02)' },
          '60%': { transform: 'translate3d(-30px, 15px, 0) scale(1.07)' },
          '80%': { transform: 'translate3d(-15px, -10px, 0) scale(0.98)' },
          '100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        auroraFloat2: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '25%': { transform: 'translate3d(-35px, -20px, 0) scale(1.06)' },
          '50%': { transform: 'translate3d(20px, 30px, 0) scale(0.97)' },
          '75%': { transform: 'translate3d(-15px, -25px, 0) scale(1.04)' },
          '100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        auroraFloat3: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(25px, -35px, 0) scale(1.05)' },
          '66%': { transform: 'translate3d(-20px, 20px, 0) scale(0.98)' },
          '100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        borderGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.02)', opacity: '1' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        keyScan: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
