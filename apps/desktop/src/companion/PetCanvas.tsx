import { Application, Assets, Container, Sprite } from "pixi.js";
import { useEffect, useRef } from "react";

interface ManifestLayer {
  id: string;
  file: string;
  z: number;
}

interface ManifestAction {
  id: string;
  visible_layers: string[];
}

interface AvatarManifest {
  canvas: { width: number; height: number };
  layers: ManifestLayer[];
  actions: ManifestAction[];
}

interface PetCanvasProps {
  action: string;
  manifestUrl?: string;
}

function assetBaseUrl(manifestUrl: string): string {
  return manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
}

export function PetCanvas({ action, manifestUrl = "/pet/cute-dog/avatar_manifest.json" }: PetCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let initialized = false;
    const app = new Application();

    void (async () => {
      await app.init({
        width: 320,
        height: 320,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio, 2)
      });
      initialized = true;
      if (disposed) {
        app.destroy(true, { children: true, texture: false });
        return;
      }

      app.canvas.className = "pet-canvas";
      host.appendChild(app.canvas);
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) throw new Error(`Avatar manifest failed with HTTP ${manifestResponse.status}`);
      const manifest = (await manifestResponse.json()) as AvatarManifest;
      const baseUrl = assetBaseUrl(manifestUrl);
      const rig = new Container();
      rig.pivot.set(manifest.canvas.width / 2, manifest.canvas.height / 2);
      rig.position.set(manifest.canvas.width / 2, manifest.canvas.height / 2);
      app.stage.addChild(rig);

      const sprites = new Map<string, Sprite>();
      for (const layer of [...manifest.layers].sort((left, right) => left.z - right.z)) {
        const texture = await Assets.load(`${baseUrl}${layer.file}`);
        const sprite = new Sprite(texture);
        sprite.width = manifest.canvas.width;
        sprite.height = manifest.canvas.height;
        sprite.eventMode = "none";
        sprites.set(layer.id, sprite);
        rig.addChild(sprite);
      }

      let elapsed = 0;
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaMS / 1000;
        const current = actionRef.current;
        const definition = manifest.actions.find((candidate) => candidate.id === current) ?? manifest.actions[0];
        const visible = new Set(definition.visible_layers);
        for (const [id, sprite] of sprites) sprite.visible = visible.has(id);

        rig.position.set(160, 160 + Math.sin(elapsed * 2.2) * (current === "sleeping" ? 1 : 3));
        rig.rotation = current === "angry" ? Math.sin(elapsed * 32) * 0.025 : current === "eating" ? Math.sin(elapsed * 9) * 0.018 : 0;
        const bounce = current === "happy" || current === "petted" ? 1 + Math.sin(elapsed * 12) * 0.025 : 1;
        rig.scale.set(bounce, current === "sleeping" ? 0.985 : bounce);
      });
    })().catch(() => {
      host.dataset.error = "true";
    });

    return () => {
      disposed = true;
      if (initialized) app.destroy(true, { children: true, texture: false });
    };
  }, [manifestUrl]);

  return <div ref={hostRef} className="pet-canvas-host" aria-hidden="true" />;
}
