/* Settings modal: tabbed sections bound to useSettingsStore. */

import { useState } from "react";
import {
  Captions,
  MonitorPlay,
  Settings,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUIStore } from "../../stores/useUIStore";
import { cn } from "../../lib/cn";
import { ModalShell, Select, Slider, Stepper, Toggle } from "../ui";

type TabId = "general" | "video" | "audio" | "subtitles" | "advanced";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "video", label: "Video", icon: MonitorPlay },
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "subtitles", label: "Subtitles", icon: Captions },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];

export function SettingsModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const resetSection = useSettingsStore((s) => s.resetSection);
  const [tab, setTab] = useState<TabId>("general");

  if (modal?.type !== "settings") return null;

  return (
    <ModalShell title="Settings" onClose={closeModal} wide>
      <div className="flex gap-6">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex w-44 shrink-0 flex-col gap-1"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium",
                  "transition-all duration-200 ease-out",
                  active
                    ? "bg-accent-soft text-accent-primary"
                    : "text-text-muted hover:bg-bg-surface-2 hover:text-text-main"
                )}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="min-w-0 flex-1">
          {tab === "general" && (
            <>
              <Select
                label="Language"
                description="Interface language"
                value={settings.general.language}
                onChange={(v) => update("general", "language", v)}
                options={[
                  { value: "system", label: "System default" },
                  { value: "en", label: "English" },
                ]}
              />
              <Toggle
                label="Check for updates"
                description="Notify me when a new version is available"
                checked={settings.general.checkForUpdates}
                onChange={(v) => update("general", "checkForUpdates", v)}
              />
              <Toggle
                label="Confirm before deleting"
                description="Ask for confirmation before removing media"
                checked={settings.general.confirmOnDelete}
                onChange={(v) => update("general", "confirmOnDelete", v)}
              />
              <Toggle
                label="Resume playback"
                description="Pick up where you left off"
                checked={settings.general.resumePlayback}
                onChange={(v) => update("general", "resumePlayback", v)}
              />
            </>
          )}

          {tab === "video" && (
            <>
              <Toggle
                label="Hardware acceleration"
                description="Use the GPU for video decoding when available"
                checked={settings.video.hardwareAcceleration}
                onChange={(v) => update("video", "hardwareAcceleration", v)}
              />
              <Select
                label="Deinterlace"
                description="Fix combing artifacts in interlaced video"
                value={settings.video.deinterlace}
                onChange={(v) =>
                  update("video", "deinterlace", v as "off" | "auto" | "on")
                }
                options={[
                  { value: "off", label: "Off" },
                  { value: "auto", label: "Automatic" },
                  { value: "on", label: "On" },
                ]}
              />
              <Toggle
                label="Fullscreen on play"
                description="Enter fullscreen automatically when playback starts"
                checked={settings.video.fullscreenOnPlay}
                onChange={(v) => update("video", "fullscreenOnPlay", v)}
              />
            </>
          )}

          {tab === "audio" && (
            <>
              <div className="py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-main">Volume</span>
                  <span className="text-sm tabular-nums text-text-muted">
                    {Math.round(settings.audio.volume * 100)}%
                  </span>
                </div>
                <div className="mt-2">
                  <Slider
                    label="Volume"
                    value={Math.round(settings.audio.volume * 100)}
                    onChange={(v) => update("audio", "volume", v / 100)}
                  />
                </div>
              </div>
              <Toggle
                label="Normalize volume"
                description="Keep loudness consistent across files"
                checked={settings.audio.normalizeVolume}
                onChange={(v) => update("audio", "normalizeVolume", v)}
              />
              <Select
                label="Preferred audio language"
                description="Pick this track when a file has several"
                value={settings.audio.preferredLanguage}
                onChange={(v) => update("audio", "preferredLanguage", v)}
                options={[
                  { value: "system", label: "System default" },
                  { value: "en", label: "English" },
                ]}
              />
            </>
          )}

          {tab === "subtitles" && (
            <>
              <Toggle
                label="Subtitles"
                description="Show subtitles when available"
                checked={settings.subtitles.enabled}
                onChange={(v) => update("subtitles", "enabled", v)}
              />
              <Stepper
                label="Subtitle font size"
                value={settings.subtitles.fontSize}
                min={12}
                max={32}
                step={1}
                unit="px"
                onChange={(v) => update("subtitles", "fontSize", v)}
              />
              <Toggle
                label="Subtitle background"
                description="Draw a box behind subtitle text"
                checked={settings.subtitles.background}
                onChange={(v) => update("subtitles", "background", v)}
              />
            </>
          )}

          {tab === "advanced" && (
            <>
              <Stepper
                label="Network caching"
                description="Buffer for network streams"
                value={settings.advanced.networkCachingMs}
                min={0}
                max={10000}
                step={250}
                unit="ms"
                onChange={(v) => update("advanced", "networkCachingMs", v)}
              />
              <Stepper
                label="Skip interval"
                description="Seconds to jump with the arrow keys"
                value={settings.advanced.skipIntervalSec}
                min={5}
                max={60}
                step={5}
                unit="s"
                onChange={(v) => update("advanced", "skipIntervalSec", v)}
              />
              <Select
                label="Thumbnail quality"
                description="Poster images generated on import"
                value={settings.advanced.thumbnailQuality}
                onChange={(v) =>
                  update("advanced", "thumbnailQuality", v as "low" | "medium" | "high")
                }
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => resetSection(tab)}
            className={cn(
              "mt-4 text-xs text-text-subtle underline-offset-2",
              "transition-colors duration-200 hover:text-text-muted hover:underline"
            )}
          >
            Reset this section
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
