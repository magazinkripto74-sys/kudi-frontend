STEP 3 — Mobile Side Menu (SAFE)

What you get:
- src/ui-v1/KudiSideMenu.jsx
- src/ui-v1/menuContent.en.js
- src/ui-v1/kudiSideMenu.css

How to mount (MINIMAL, safe):
1) Open src/App.jsx
2) Add import:
   import KudiSideMenu from './ui-v1/KudiSideMenu'
3) In your TOP BAR / HEADER area, add:
   <KudiSideMenu />
   (Place it on the left side, before logo/title)

Optional wiring (later):
- onConnectWallet={() => {/* your connect action */}}
- onOpenAvatarStore={() => {/* navigate to avatar store */}}

Important:
- This step does NOT change any existing logic.
- It is mobile-only (hamburger hidden on desktop).
