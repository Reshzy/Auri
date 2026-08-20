const hidden = { display: "none" } as const;

const touchTarget = {
  minHeight: "2.75rem",
} as const;

export const clerkAppearance = {
  layout: {
    socialButtonsVariant: "iconButton" as const,
    showOptionalFields: false,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  options: {
    elevation: "flush" as const,
    showOptionalFields: false,
    socialButtonsVariant: "iconButton" as const,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "var(--auri-orange-700)",
    colorBackground: "var(--auri-surface)",
    colorForeground: "var(--auri-ink)",
    colorMutedForeground: "var(--auri-ink-muted)",
    colorDanger: "var(--auri-danger)",
    colorSuccess: "var(--auri-success)",
    colorWarning: "var(--auri-warning)",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), 'Segoe UI', sans-serif",
  },
  elements: {
    headerTitle: hidden,
    headerSubtitle: hidden,
    header: hidden,
    logoBox: hidden,
    rootBox: {
      width: "100%",
    },
    card: {
      boxShadow: "none",
      border: "none",
      background: "transparent",
      width: "100%",
      maxWidth: "100%",
    },
    cardBox: {
      boxShadow: "none",
      border: "none",
      width: "100%",
      maxWidth: "100%",
    },
    footer: hidden,
    socialButtons: {
      display: "flex",
      flexDirection: "row",
      gap: "0.5rem",
    },
    formButtonPrimary: {
      ...touchTarget,
      height: "2.75rem",
      fontSize: "0.875rem",
    },
    formFieldInput: {
      ...touchTarget,
      fontSize: "1rem",
    },
    formFieldInputShowPasswordButton: {
      ...touchTarget,
      minWidth: "2.75rem",
    },
    socialButtonsBlockButton: {
      flex: 1,
      ...touchTarget,
    },
    socialButtonsIconButton: {
      flex: 1,
      ...touchTarget,
    },
    footerAction: hidden,
    footerActionText: hidden,
    footerActionLink: hidden,
  },
};

export const clerkLocalization = {
  socialButtonsBlockButton: "Continue with {{provider|titleize}}",
};
