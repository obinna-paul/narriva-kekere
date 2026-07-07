"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

// Fixed output size for the exported avatar — matches what the server
// re-optimises to (see userAvatarUrl in lib/storage/cloudinary.ts), just
// generous enough to not look soft on a high-DPI phone screen.
const OUTPUT_SIZE = 400;

async function getCroppedImageBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))),
      "image/jpeg",
      0.92,
    );
  });
}

export interface AvatarCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** Full-screen crop/reposition/zoom step between picking a photo and
 * uploading it — so what someone sees in the picker matches what actually
 * ends up in their circular profile frame, instead of an uncontrolled
 * center-crop deciding that for them. */
export function AvatarCropModal({ imageSrc, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      setError("Couldn't process that image — try a different photo.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="flex flex-col gap-4 bg-black px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4">
        <p className="text-center text-[12.5px] text-white/60">Drag to reposition · Pinch or slide to zoom</p>

        {error && <p className="text-center text-[13px] text-[#F0A0A0]">{error}</p>}

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/60">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 accent-[var(--color-primary)]"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-full border border-white/25 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="flex-1 rounded-full bg-[var(--color-primary)] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
