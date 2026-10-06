"use client";

import { ImageIcon, LinkIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import type { ImageInput } from "@/lib/api/images";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * An image with upload / from-URL / remove buttons. The API takes a JPG, PNG or WebP file, or its
 * https:// address, which it downloads itself (DECISIONS S10); the size rules are checked by the
 * server, and its 422 message (e.g. "Another picture is still downloading") shows as a toast.
 * The defaults are the logo limits: 2 MB and 200–2000 px on each side.
 */
export function ImageField({
  url,
  alt,
  disabled,
  maxBytes = 2 * 1024 * 1024,
  hint = "JPG, PNG or WebP, up to 2 MB, 200–2000 px.",
  previewClassName,
  onUpload,
  onRemove,
}: {
  url: string | null;
  alt: string;
  disabled?: boolean;
  maxBytes?: number;
  hint?: string;
  /** Sizes the preview, e.g. a wide box for banners; a 80 px square by default. */
  previewClassName?: string;
  onUpload: (image: ImageInput) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "remove" | null>(null);
  const [linking, setLinking] = useState(false);
  const [address, setAddress] = useState("");

  async function run(kind: "upload" | "remove", action: () => Promise<void>, success: string): Promise<boolean> {
    setPending(kind);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setPending(null);
    }
  }

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error("Choose a JPG, PNG or WebP image.");
    if (file.size > maxBytes) return void toast.error(`The image must be ${formatBytes(maxBytes)} or smaller.`);
    void run("upload", () => onUpload({ file }), "Image uploaded.");
  }

  async function fetchFromAddress(event: { preventDefault: () => void }) {
    event.preventDefault();
    const value = address.trim();
    if (!isHttpsUrl(value)) return void toast.error("Enter the picture's full https:// address.");
    // The server downloads it now (up to 15 seconds), so the button spins meanwhile.
    if (await run("upload", () => onUpload({ url: value }), "Image downloaded.")) {
      setAddress("");
      setLinking(false);
    }
  }

  const busy = disabled || pending !== null;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10",
          previewClassName,
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URLs come from the API host
          <img src={url} alt={alt} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={pick} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {pending === "upload" && !linking ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {url ? "Replace" : "Upload"}
          </Button>
          <Button
            type="button"
            variant={linking ? "secondary" : "outline"}
            size="sm"
            disabled={busy}
            aria-expanded={linking}
            onClick={() => setLinking((open) => !open)}
          >
            <LinkIcon />
            From URL
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => run("remove", onRemove, "Image removed.")}
            >
              {pending === "remove" ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              Remove
            </Button>
          )}
        </div>
        {linking && (
          // Not a <form>: the field often sits inside the dialog's own form.
          <div className="flex gap-2">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://example.com/picture.jpg"
              aria-label="Picture address"
              maxLength={2048}
              value={address}
              disabled={busy}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the address instead of submitting the surrounding form.
                if (e.key === "Enter") void fetchFromAddress(e);
              }}
            />
            <Button type="button" size="sm" className="h-auto" disabled={busy || address.trim() === ""} onClick={(e) => void fetchFromAddress(e)}>
              {pending === "upload" && <Loader2Icon className="animate-spin" />}
              Add
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {hint}
          {linking && " KACHI downloads the address itself: https only, up to 5 MB, within 15 seconds."}
        </p>
      </div>
    </div>
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
