/* Ephemeral UI state: navigation, sidebar, search, menus, modals.
   Small prefs (sidebar, view mode) persist to localStorage. */
import { create } from "zustand";
import type {
  AppView,
  ContextMenuState,
  LibrarySort,
  LibraryViewMode,
  ModalState,
} from "../types";

const SIDEBAR_KEY = "vlc-redesign-sidebar";
const VIEWMODE_KEY = "vlc-redesign-viewmode";

interface UIState {
  view: AppView;
  setView: (v: AppView) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  libraryViewMode: LibraryViewMode;
  setLibraryViewMode: (m: LibraryViewMode) => void;
  librarySort: LibrarySort;
  setLibrarySort: (s: LibrarySort) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  contextMenu: ContextMenuState | null;
  openContextMenu: (m: ContextMenuState) => void;
  closeContextMenu: () => void;

  modal: ModalState | null;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export const useUIStore = create<UIState>()((set) => ({
  view: "home",
  setView: (view) => set({ view, searchQuery: "" }),

  sidebarCollapsed: readBool(SIDEBAR_KEY, false),
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return { sidebarCollapsed: next };
    }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  libraryViewMode:
    ((): LibraryViewMode => {
      try {
        return localStorage.getItem(VIEWMODE_KEY) === "list" ? "list" : "grid";
      } catch {
        return "grid";
      }
    })(),
  setLibraryViewMode: (libraryViewMode) => {
    try {
      localStorage.setItem(VIEWMODE_KEY, libraryViewMode);
    } catch {
      /* ignore */
    }
    set({ libraryViewMode });
  },
  librarySort: "recent",
  setLibrarySort: (librarySort) => set({ librarySort }),

  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  contextMenu: null,
  openContextMenu: (contextMenu) => set({ contextMenu, modal: null }),
  closeContextMenu: () => set({ contextMenu: null }),

  modal: null,
  openModal: (modal) => set({ modal, contextMenu: null, paletteOpen: false }),
  closeModal: () => set({ modal: null }),
}));
