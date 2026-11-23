import {
  FLAT_IMAGE_MAX_WIDTH,
  FLAT_IMAGE_TARGET_MB,
  MAX_IMAGE_BYTES,
  PANORAMA_IMAGE_MAX_WIDTH,
  PANORAMA_IMAGE_TARGET_MB,
  THUMB_IMAGE_MAX_WIDTH,
  THUMB_IMAGE_TARGET_MB,
} from "./constants";

export interface PreparedRoomImages {
  mainFile: File;
  thumbFile: File;
  width: number;
  height: number;
  detectedKind: "flat" | "panorama";
}

function readImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 1200;
      const height = img.naturalHeight || 900;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export function detectRoomKindFromRatio(width: number, height: number): "flat" | "panorama" {
  if (height <= 0) return "flat";
  const ratio = width / height;
  return Math.abs(ratio - 2) <= 0.28 ? "panorama" : "flat";
}

export async function compressRoomImageOnDevice(
  inputFile: File,
  overrideKind?: "flat" | "panorama"
): Promise<PreparedRoomImages> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(inputFile.type)) {
    throw new Error("Please select a JPEG, PNG, or WebP photo.");
  }

  const imageCompression = (await import("browser-image-compression")).default;
  const originalDims = await readImageDimensions(inputFile);
  const kind =
    overrideKind ?? detectRoomKindFromRatio(originalDims.width, originalDims.height);

  const maxWidthOrHeight =
    kind === "panorama" ? PANORAMA_IMAGE_MAX_WIDTH : FLAT_IMAGE_MAX_WIDTH;
  const maxSizeMB = kind === "panorama" ? PANORAMA_IMAGE_TARGET_MB : FLAT_IMAGE_TARGET_MB;

  let compressed = await imageCompression(inputFile, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });

  if (compressed.size > MAX_IMAGE_BYTES) {
    compressed = await imageCompression(compressed, {
      maxSizeMB: 0.85,
      maxWidthOrHeight: kind === "panorama" ? 3072 : 1280,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.72,
    });
  }

  const thumb = await imageCompression(inputFile, {
    maxSizeMB: THUMB_IMAGE_TARGET_MB,
    maxWidthOrHeight: THUMB_IMAGE_MAX_WIDTH,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.78,
  });

  const finalDims = await readImageDimensions(compressed);

  const mainFile = new File([compressed], `${Date.now()}.webp`, {
    type: "image/webp",
  });
  const thumbFile = new File([thumb], `${Date.now()}-thumb.webp`, {
    type: "image/webp",
  });

  return {
    mainFile,
    thumbFile,
    width: finalDims.width,
    height: finalDims.height,
    detectedKind: kind,
  };
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
