/**
 * An image for an upload endpoint: a file, or its https:// address, which the API downloads
 * itself (DECISIONS S10: at most 5 MB, within 15 seconds, one download at a time per account).
 * Never both.
 */
export type ImageInput = { file: File } | { url: string };

/** The request body: multipart `image` for a file, JSON `image_url` for an address. */
export function imageBody(image: ImageInput): FormData | { image_url: string } {
  if ("url" in image) return { image_url: image.url };
  const form = new FormData();
  form.append("image", image.file);
  return form;
}
