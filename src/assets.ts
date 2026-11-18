/** Keep stored image paths portable between hosting origins and subdirectories. */
export function assetUrl(
  path: string,
  base = import.meta.env.BASE_URL,
): string {
  if (path.startsWith("data:")) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
}
