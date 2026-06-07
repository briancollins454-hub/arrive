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

        // Accent palette for richness — brightened for a bolder, vibrant look
        rose: {
          DEFAULT: '#fb3b6c',
          light: '#ff6b95',
          muted: '#fb3b6c1a',
        },
        purple: {
          DEFAULT: '#b667ff',
          light: '#cd92ff',
          muted: '#b667ff1a',
        },
        blue: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          muted: '#3b82f61a',
        },
        // New vivid accents for big gradients + playful highlights
        electric: {
          DEFAULT: '#2dd4ff',
          light: '#7ee7ff',
          muted: '#2dd4ff1a',
        },
        magenta: {
          DEFAULT: '#ff4dd9',
          light: '#ff7ce5',
          muted: '#ff4dd91a',
        },
        lime: {
          DEFAULT: '#a3e635',
          light: '#bef264',
          muted: '#a3e6351a',
        },
        coral: {
          DEFAULT: '#ff7849',
          light: '#ff9b73',
          muted: '#ff78491a',
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
        'glow-rose': '0 0 30px rgba(251, 59, 108, 0.25), 0 0 60px rgba(251, 59, 108, 0.1)',
        'glow-purple': '0 0 30px rgba(182, 103, 255, 0.28), 0 0 60px rgba(182, 103, 255, 0.1)',
        'glow-electric': '0 0 30px rgba(45, 212, 255, 0.3), 0 0 60px rgba(45, 212, 255, 0.12)',
        'glow-magenta': '0 0 30px rgba(255, 77, 217, 0.28), 0 0 60px rgba(255, 77, 217, 0.1)',
        'vibrant': '0 10px 40px -8px rgba(182, 103, 255, 0.35), 0 4px 16px -4px rgba(45, 212, 255, 0.25)',
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
        // Signature "wow" motion
        'page-enter': 'pageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pop-in': 'popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'sheen': 'sheen 2.5s ease-in-out infinite',
        'gradient-pan': 'gradientPan 8s ease infinite',
        'tilt': 'tilt 6s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'float-slow': 'float 9s ease-in-out infinite',
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
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.995)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-150%) skewX(-20deg)' },
          '60%, 100%': { transform: 'translateX(250%) skewX(-20deg)' },
        },
        gradientPan: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        tilt: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        // Signature vibrant gradients
        'gradient-vibrant': 'linear-gradient(120deg, #c9a84c 0%, #ff4dd9 38%, #b667ff 64%, #2dd4ff 100%)',
        'gradient-sunset': 'linear-gradient(120deg, #ff7849 0%, #fb3b6c 45%, #b667ff 100%)',
        'gradient-aurora': 'linear-gradient(120deg, #2dd4ff 0%, #0ea5a0 40%, #a3e635 100%)',
        'gradient-royal': 'linear-gradient(120deg, #b667ff 0%, #3b82f6 50%, #2dd4ff 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
