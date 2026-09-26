/**
 * Descarga una imagen (por ejemplo el logo del negocio, subido a Supabase
 * Storage) y la convierte a base64 para poder insertarla en un PDF con
 * jsPDF. Si falla (sin logo, sin conexión, CORS, etc.) devuelve null y
 * el comprobante simplemente se genera sin logo, sin romper nada.
 */
export async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}
