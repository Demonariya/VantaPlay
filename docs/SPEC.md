# VLC Media Player Redesign: Agent Implementation Specification

> Source: project brief. This document is the authoritative engineering and
> design specification for this repo. It translates the modern UI/UX concepts
> from Juxtopposed's redesign (video: https://www.youtube.com/watch?v=ERFeOgqk324,
> Figma: https://www.figma.com/community/file/1691465999134370980/vlc-redesign)
> into actionable specifications for design and development agents.

## 1. Global Design System & Theming Tokens

To eliminate the legacy aesthetic, the application must shift from flat system defaults to a tokenized, modern dark-first design system.

### 1.1 Color Palette & Surface Hierarchy

- Background Base (`--bg-primary`): Deep Obsidian / Matte Charcoal (#121214 or #0F0F11).
- Surface Layers (`--bg-surface-1`, `--bg-surface-2`): Elevated frosted glass/translucent panels (#1A1A1E to #24242A) with subtle 1px inner borders (#2A2A30).
- Accent Color (`--accent-primary`): Vibrant Amber / Orange (#FF7A00 or #FF8C00), preserving the iconic VLC heritage while modernizing saturation.
- Text Hierarchy:
  - Primary Headings (`--text-main`): Pure White (#FFFFFF).
  - Secondary Labels (`--text-muted`): Cool Gray (#9BA1A6).
  - Disabled / Placeholder (`--text-subtle`): (#5E6368).

### 1.2 Typography & Radius

- Font Family: Inter, SF Pro, or Geist Sans across all UI elements.
- Border Radius:
  - Containers & Modals: 16px (rounded-2xl).
  - Buttons & Inputs: 8px to 12px (rounded-lg / rounded-xl).
  - Thumbnails & Cards: 12px.

## 2. Layout & Navigation Architecture

The app layout shifts from a rigid toolbar window to a modern fluid master-detail split view.

### 2.1 Sidebar Navigation

- Position: Fixed left sidebar with collapsible state.
- Width: 240px expanded, 72px collapsed.
- Items & Icons:
  - Logo / Brand Icon (Minimalist stylized cone vector).
  - Home / Dashboard: Overview of recent media, quick resumes, and curated lists.
  - Library: Video and audio catalog organized by folders or tags.
  - Playlists: Custom user-created collections.
  - Streams / Network: Direct network stream inputs and server connections.
  - Settings / Preferences: Clean categorized settings modal/view.
- Active State Indicator: Left-aligned pill indicator (4px width, `--accent-primary`) with soft background tint.

## 3. Media Library & Home Dashboard View

The core viewing area replaces the archaic empty slate with a functional content hub.

### 3.1 Header & Search Bar

- Top Bar: Unified search input bar with global keyboard shortcut (Cmd/Ctrl + K) placeholder ("Search media, streams, or settings...").
- Action Buttons: Quick-add file button, network stream prompt, and view toggle (Grid view vs. List view).

### 3.2 Media Card Grid

Card Structure:

- 16:9 thumbnail preview container with subtle hover zoom effect (scale(1.03)).
- Duration badge pinned to bottom-right corner (semi-transparent dark background, 10px font).
- Progress bar overlay at the bottom of thumbnail cards for partially watched media.
- Title (truncated to 2 lines) and subtitle (file size / codec / resolution badge) below thumbnail.

## 4. Video Player & Playbar Interface

The playback interface must merge full immersion with easily discoverable, sleek controls.

### 4.1 Floating Playbar (Bottom Control Dock)

- Container: Floating glassmorphic pill bar docked at the bottom center with margin (bottom: 24px, background blur backdrop-filter: blur(16px)).
- Controls Layout (Left to Right):
  - Play / Pause button (Smooth vector morphing icon).
  - Skip backward / forward (10s increments).
  - Live timestamp / Duration counter (02:14 / 1:24:05).
  - Interactive Scrubber / Seek Bar:
    - Height: 6px normal, expands to 10px on hover.
    - Requirement: Thumbnail preview tooltip popup on hover over the scrub track.
  - Volume slider popover (Expandable horizontal track on hover/click).
  - Audio & Subtitle track selector button.
  - Playback speed modifier dropdown (0.5x to 2.0x).
  - Fullscreen toggle button.

## 5. Context Menus & Modal Overlays

### 5.1 Context Menus (Right-Click)

- Styling: Floating card (width: 220px), solid background with drop shadow (shadow-2xl), rounded corners (12px).
- Items: Play, Add to Playlist, Open File Location, Convert/Stream, Properties, Delete. Clean icon pairing for every action item.

### 5.2 Settings & Preferences Modal

- Layout: Tabbed sidebar on the left (General, Video, Audio, Subtitles, Advanced) with main content pane on the right.
- Inputs: Modern toggle switches, sleek dropdown selects, and numeric input steppers replacing old Win32/Qt legacy dialog boxes.

## 6. Execution & Handoff Checklist for Development Agents

- Framework / Tech Stack Alignment: Ensure UI components map cleanly to the rendering engine (e.g., Qt/QML styling update or React/Tauri desktop wrapper).
- State Management: Bind playback state (isPlaying, currentTime, duration, volume, subtitlesEnabled) reactively to the modern UI bindings.
- Animation & Transitions: Implement smooth micro-interactions (e.g., 200ms ease-out transitions on hover states, modal popups, and sidebar collapsing).
- Accessibility (a11y): Ensure proper ARIA labels and full keyboard navigation support across all custom buttons and scrubbers.

---

## Implementation notes for this repo (stack decisions)

- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 + zustand. Tokens live in
  `src/theme/tokens.css` as a Tailwind v4 `@theme` block; components must use the
  token classes (`bg-bg-primary`, `text-text-muted`, `border-border-subtle`,
  `bg-accent-primary`, `rounded-container`, `rounded-card`, `rounded-control`) and
  never hardcoded hex values.
- **Primitives:** `src/components/ui.tsx` owns `IconButton`, `Toggle`, `Select`,
  `Stepper`, `Slider`, `ModalShell`, `EmptyState`, `SectionTitle`, `Badge`. Build on
  these; do not invent parallel ones.
- **Stores:** `useLibraryStore` (media/playlists/streams + IndexedDB persistence),
  `usePlayerStore` (playback; the `<video>` element registers via `setVideoEl`),
  `useSettingsStore` (persisted settings), `useUIStore` (view, sidebar, search,
  palette, context menu, modals).
- **Rules:** no em dashes in any user-facing copy; all interactive elements need
  ARIA labels; keyboard shortcuts per section 6; 200ms ease-out transitions.
