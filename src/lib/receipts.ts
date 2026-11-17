import { supabase } from "./supabase";

// Receipt files live in the private Supabase Storage bucket "receipts".
export interface Receipt {
  id: string; // same id as the claim_receipts row
  name: string;
  type: string;
  path?: string; // location in storage (missing only for old sample data)
  note?: string; // short note printed on this file when the claim is previewed or downloaded
}

const BUCKET = "receipts";

/** Shrinks a photo so it stays readable but small (about 150-300 KB). */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality));
  } catch {
    return file;
  }
}

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** Uploads the chosen files to Storage and returns their receipt records. */
export async function saveFiles(files: File[], userId: string): Promise<Receipt[]> {
  const out: Receipt[] = [];
  for (const f of files) {
    const isImage = f.type.startsWith("image/");
    const blob = isImage ? await compressImage(f) : f;
    const id = crypto.randomUUID();
    const type = isImage ? "image/jpeg" : f.type || "application/pdf";
    const safe = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${id}-${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type });
    if (error) throw new Error(error.message);
    out.push({ id, name: f.name, type, path });
  }
  return out;
}

export async function getReceipt(r: Receipt): Promise<Blob | undefined> {
  if (!r.path) return undefined;
  const { data, error } = await supabase.storage.from(BUCKET).download(r.path);
  return error ? undefined : data;
}

export async function removeFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
