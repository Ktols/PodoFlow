import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/react'
import { esES } from '@clerk/localizations'

const clerkAppearance = {
  variables: {
    colorPrimary: '#00C288',
    colorText: '#004975',
    colorTextSecondary: '#64748b',
    colorBackground: '#ffffff',
    colorInputBackground: '#f8fafc',
    colorInputText: '#004975',
    borderRadius: '0.75rem',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: '14px',
  },
  elements: {
    card: {
      boxShadow: '0 25px 50px -12px rgba(0, 73, 117, 0.15)',
      border: '1px solid #e2e8f0',
    },
    headerTitle: {
      color: '#004975',
      fontWeight: '800',
    },
    headerSubtitle: {
      color: '#64748b',
    },
    socialButtonsBlockButton: {
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      fontWeight: '600',
      '&:hover': {
        backgroundColor: '#f1f5f9',
        borderColor: '#00C288',
      },
    },
    formButtonPrimary: {
      backgroundColor: '#00C288',
      fontWeight: '700',
      borderRadius: '0.75rem',
      '&:hover': {
        backgroundColor: '#00ab78',
      },
    },
    formFieldInput: {
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      '&:focus': {
        borderColor: '#00C288',
        boxShadow: '0 0 0 2px rgba(0, 194, 136, 0.2)',
      },
    },
    footerActionLink: {
      color: '#00C288',
      fontWeight: '600',
      '&:hover': {
        color: '#00ab78',
      },
    },
    userButtonPopoverCard: {
      boxShadow: '0 10px 40px -10px rgba(0, 73, 117, 0.15)',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
    },
    userButtonPopoverActionButton: {
      '&:hover': {
        backgroundColor: '#f0fdf9',
      },
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      afterSignOutUrl="/"
      localization={esES}
      appearance={clerkAppearance}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
