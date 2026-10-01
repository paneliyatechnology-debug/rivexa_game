/**
 * GameHub Centralized Asset Configuration
 * All asset paths mapped to reusable variables.
 * Source: GameHub_Premium_Asset_Pack_v2
 */

const ASSET_BASE = '/assets/gamehub';

export const GAMEHUB_ASSETS = {
  branding: {
    logo: `${ASSET_BASE}/branding/GameHub_branding_and_logo.png`,
  },

  banners: {
    /** Full promotional banners collection (contains Hero, Welcome Bonus, Daily Rewards, Invite & Earn strips) */
    collection: `${ASSET_BASE}/banners/Promotional_banners_collection.png`,
    /** Figma Homepage Kit responsive hero banner assets */
    heroDesktop: `${ASSET_BASE}/banners/gamehub-hero-desktop-1920x720.webp`,
    heroMobile: `${ASSET_BASE}/banners/gamehub-hero-mobile-900x1200.webp`,
    heroMobileArtwork: `${ASSET_BASE}/banners/mobile_hero_banner.png`,
    inviteFriendsBanner: `${ASSET_BASE}/banners/invite_friends_banner.jpg`,
    figmaDesktopSvg: `${ASSET_BASE}/banners/GameHub-Desktop-1600x1200.svg`,
    figmaMobileSvg: `${ASSET_BASE}/banners/GameHub-Mobile-390x1700.svg`,
  },

  gameCards: {
    /** Full game cards collection reference image */
    collection: `${ASSET_BASE}/game-cards/Game_cards_collection.png`,
    /** Individual SVG game cards from the Figma editable vector kit */
    cards: {
      'fast-parity': `${ASSET_BASE}/game-cards/fast-parity.svg`,
      parity: `${ASSET_BASE}/game-cards/parity.svg`,
      mines: `${ASSET_BASE}/game-cards/mines.svg`,
      crash: `${ASSET_BASE}/game-cards/crash.svg`,
      'jetx-flight': `${ASSET_BASE}/game-cards/jetx-flight.svg`,
      'spin-wheel': `${ASSET_BASE}/game-cards/spin-wheel.svg`,
      'over-under-dice': `${ASSET_BASE}/game-cards/over-under-dice.svg`,
      'andar-bahar': `${ASSET_BASE}/game-cards/andar-bahar.svg`,
      'coin-flip': `${ASSET_BASE}/game-cards/coin-flip.svg`,
      pushpani: `${ASSET_BASE}/game-cards/pushpani.svg`,
      'more-games': `${ASSET_BASE}/game-cards/more-games.svg`,
    },
  },

  buttons: {
    reference: `${ASSET_BASE}/buttons/Buttons_and_UI_components_reference.png`,
    primary: `${ASSET_BASE}/buttons/primary_button.svg`,
    secondary: `${ASSET_BASE}/buttons/secondary_button.svg`,
    deposit: `${ASSET_BASE}/buttons/deposit_button.svg`,
    withdraw: `${ASSET_BASE}/buttons/withdraw_button.svg`,
    claim: `${ASSET_BASE}/buttons/claim_button.svg`,
    invite: `${ASSET_BASE}/buttons/invite_button.svg`,
  },

  icons: {
    /** SVG interface icons — neon green #00E5A0 stroke, 24×24 viewBox */
    home: `${ASSET_BASE}/icons/svg/home.svg`,
    wallet: `${ASSET_BASE}/icons/svg/wallet.svg`,
    gift: `${ASSET_BASE}/icons/svg/gift.svg`,
    bell: `${ASSET_BASE}/icons/svg/bell.svg`,
    user: `${ASSET_BASE}/icons/svg/user.svg`,
    gamepad: `${ASSET_BASE}/icons/svg/gamepad.svg`,
    dice: `${ASSET_BASE}/icons/svg/dice.svg`,
    coin: `${ASSET_BASE}/icons/svg/coin.svg`,
    trophy: `${ASSET_BASE}/icons/svg/trophy.svg`,
    /** Collection reference images */
    collection: `${ASSET_BASE}/icons/Icons_and_illustrations_collection.png`,
    gameCategories: `${ASSET_BASE}/icons/Game_category_icons.png`,
  },

  navigation: {
    reference: `${ASSET_BASE}/navigation/Navigation_and_menu_components.png`,
  },

  mobileDesktop: {
    mobile: `${ASSET_BASE}/mobile-desktop/Mobile_screen_mockup.png`,
    desktop: `${ASSET_BASE}/mobile-desktop/Desktop_16x9_screen_mockup.png`,
  },

  references: {
    fullOverview: `${ASSET_BASE}/references/GameHub_Complete_Asset_Overview.png`,
  },
} as const;

/**
 * Design tokens sourced from design-tokens.json
 */
export const DESIGN_TOKENS = {
  colors: {
    background: '#050B20',
    surface: '#08152E',
    surfaceElevated: '#101C3A',
    primary: '#00E5A0',
    blue: '#287BFF',
    purple: '#873BFF',
    cyan: '#00D9FF',
    pink: '#FF3FA4',
    gold: '#FFC928',
    text: '#F5F7FF',
    muted: '#A8B9DE',
    success: '#00D68F',
    error: '#FF416C',
  },
  radii: {
    card: '20px',
    button: '18px',
    pill: '999px',
  },
  spacing: {
    base: '8px',
    section: '24px',
    mobileGutter: '16px',
    desktopGutter: '32px',
  },
} as const;

/**
 * Inline SVG icon paths — sourced from the editable_svg_icons folder.
 * These are used inline in React components so color can be overridden via CSS `currentColor`.
 */
export const SVG_ICON_PATHS = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  user_circle: "M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
  user_path: "M4 21a8 8 0 0 1 16 0",
  wallet_rect: "M3 5h18v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z",
  wallet_lines: "M3 8h18M16 14h2",
  gift_box: "M3 9h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM2 6h20v4H2zM12 6v15M12 6H8a2 2 0 1 1 2-2c0 1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1-2 2-2 2Z",
  gamepad: "M6 8h12a4 4 0 0 1 3.8 5l-1.2 4a2 2 0 0 1-3.3 1l-2.2-2H9l-2.2 2a2 2 0 0 1-3.3-1l-1.2-4A4 4 0 0 1 6 8ZM7 11v4m-2-2h4m7-1h.01M18 14h.01",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4",
} as const;
