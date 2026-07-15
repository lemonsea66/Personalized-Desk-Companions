import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMachine } from "@xstate/react";
import { Bell, BellOff, Cookie, Heart, Images, Moon, Smile, Sun } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { PetCanvas } from "./companion/PetCanvas";
import { useAvatarStore } from "./companion/avatarStore";
import { petMachine } from "./companion/machine";
import { useCompanionStore } from "./companion/store";

const windowPositionKey = "desktop-companion.window-position.v1";
const avatarChangedEvent = "avatar-selection-changed";
const defaultManifestUrl = "/pet/cute-dog/avatar_manifest.json";
const hasTauriRuntime = () => "__TAURI_INTERNALS__" in window;

function currentWindowLabel() {
  return hasTauriRuntime() ? getCurrentWindow().label : "main";
}

export function App() {
  if (currentWindowLabel() === "avatar-library") return <AvatarLibraryView />;
  return <PetView />;
}

function PetView() {
  const [petSnapshot, send] = useMachine(petMachine);
  const state = useCompanionStore((store) => store.state);
  const refresh = useCompanionStore((store) => store.refresh);
  const interact = useCompanionStore((store) => store.interact);
  const selectedAvatar = useAvatarStore((store) => store.selected);
  const refreshAvatars = useAvatarStore((store) => store.refresh);
  const holdTimer = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    void refresh();
    void refreshAvatars();
  }, [refresh, refreshAvatars]);

  useEffect(() => {
    if (!hasTauriRuntime()) return undefined;
    const appWindow = getCurrentWindow();
    const saved = localStorage.getItem(windowPositionKey);
    if (saved) {
      try {
        const position = JSON.parse(saved) as { x: number; y: number };
        void invoke("restore_window_position", position);
      } catch {
        localStorage.removeItem(windowPositionKey);
      }
    }

    const unlistenMoved = appWindow.onMoved(({ payload }) => {
      localStorage.setItem(windowPositionKey, JSON.stringify({ x: payload.x, y: payload.y }));
    });
    const unlistenQuiet = listen("tray-quiet-toggle", () => {
      const current = useCompanionStore.getState().state;
      if (current) void useCompanionStore.getState().interact("pet.quiet_mode_set", { enabled: !current.quiet_mode });
    });
    const unlistenAvatar = listen(avatarChangedEvent, () => {
      void useAvatarStore.getState().refresh();
    });

    return () => {
      void unlistenMoved.then((unlisten) => unlisten());
      void unlistenQuiet.then((unlisten) => unlisten());
      void unlistenAvatar.then((unlisten) => unlisten());
    };
  }, []);

  const runPet = useCallback(async () => {
    if (!petSnapshot.can({ type: "PET" })) return;
    if (await interact("pet.petted")) send({ type: "PET" });
  }, [interact, petSnapshot, send]);

  const beginPointer = () => {
    dragging.current = false;
    if (!hasTauriRuntime()) return;
    holdTimer.current = window.setTimeout(() => {
      dragging.current = true;
      if (petSnapshot.can({ type: "DRAG_START" })) send({ type: "DRAG_START" });
      void getCurrentWindow()
        .startDragging()
        .finally(() => send({ type: "DROP" }));
    }, 180);
  };

  const endPointer = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (!dragging.current) void runPet();
  };

  const feed = async () => {
    if (petSnapshot.can({ type: "FEED" }) && (await interact("pet.fed"))) send({ type: "FEED" });
  };

  const toggleSleep = async () => {
    if (petSnapshot.matches("sleeping")) {
      if (await interact("pet.wake_requested")) send({ type: "WAKE" });
    } else if (petSnapshot.can({ type: "SLEEP" }) && (await interact("pet.sleep_requested"))) {
      send({ type: "SLEEP" });
    }
  };

  const toggleQuiet = () => {
    if (state) void interact("pet.quiet_mode_set", { enabled: !state.quiet_mode });
  };

  const openAvatarLibrary = () => {
    if (hasTauriRuntime()) void invoke("open_avatar_library");
  };

  const visibleAction =
    state?.quiet_mode && (petSnapshot.matches("idle") || petSnapshot.matches("blink")) ? "idle" : String(petSnapshot.value);

  return (
    <main className="pet-window" data-action={String(petSnapshot.value)}>
      <div className="pet-stage">
        <div className="status-rail" aria-label="桌宠状态">
          <span title="心情">
            <Smile aria-hidden="true" />
            <b>{state?.mood ?? "--"}</b>
          </span>
          <span title="亲密度">
            <Heart aria-hidden="true" />
            <b>{state?.affection ?? "--"}</b>
          </span>
          <span title="饥饿">
            <Cookie aria-hidden="true" />
            <b>{state?.hunger ?? "--"}</b>
          </span>
        </div>

        <div
          className="pet-interaction-surface"
          role="button"
          tabIndex={0}
          aria-label="抚摸或拖动桌宠"
          onPointerDown={beginPointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") void runPet();
          }}
        >
          <PetCanvas action={visibleAction} manifestUrl={selectedAvatar?.manifest_url ?? defaultManifestUrl} />
        </div>

        <nav className="pet-controls" aria-label="桌宠互动">
          <button type="button" title="喂食" aria-label="喂食" onClick={() => void feed()} disabled={!petSnapshot.can({ type: "FEED" })}>
            <Cookie aria-hidden="true" />
          </button>
          <button type="button" title={petSnapshot.matches("sleeping") ? "叫醒" : "睡觉"} aria-label={petSnapshot.matches("sleeping") ? "叫醒" : "睡觉"} onClick={() => void toggleSleep()}>
            {petSnapshot.matches("sleeping") ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <button type="button" title={state?.quiet_mode ? "关闭安静模式" : "开启安静模式"} aria-label={state?.quiet_mode ? "关闭安静模式" : "开启安静模式"} onClick={toggleQuiet} disabled={!state}>
            {state?.quiet_mode ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
          </button>
          <button type="button" title="形象库" aria-label="形象库" onClick={openAvatarLibrary}>
            <Images aria-hidden="true" />
          </button>
        </nav>
      </div>
    </main>
  );
}

function AvatarLibraryView() {
  const library = useAvatarStore((store) => store.library);
  const selected = useAvatarStore((store) => store.selected);
  const loading = useAvatarStore((store) => store.loading);
  const error = useAvatarStore((store) => store.error);
  const refresh = useAvatarStore((store) => store.refresh);
  const select = useAvatarStore((store) => store.select);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chooseAvatar = async (avatarId: string) => {
    if (await select(avatarId)) {
      if (hasTauriRuntime()) void emit(avatarChangedEvent);
    }
  };

  return (
    <main className="avatar-library-window">
      <header className="avatar-library-header">
        <h1>形象库</h1>
        <button type="button" title="刷新" aria-label="刷新" onClick={() => void refresh()}>
          <Images aria-hidden="true" />
        </button>
      </header>

      {error ? <p className="avatar-library-message">{error}</p> : null}
      {loading && !library ? <p className="avatar-library-message">加载中</p> : null}

      <section className="avatar-grid" aria-label="可选形象">
        {(library?.avatars ?? []).map((avatar) => {
          const isSelected = avatar.id === selected?.id;
          return (
            <button
              className="avatar-card"
              data-selected={isSelected}
              type="button"
              key={avatar.id}
              onClick={() => void chooseAvatar(avatar.id)}
              aria-pressed={isSelected}
              title={avatar.display_name}
            >
              <img src={avatar.preview_url} alt="" />
              <span>{avatar.display_name}</span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
