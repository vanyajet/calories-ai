import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Downscale a picked/captured photo and copy it into the app's documents dir
 * (picker URIs live in cache and can be purged). The stored copy is also what
 * gets uploaded to the AI, so it is kept small.
 */
export async function storePhoto(sourceUri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(sourceUri).resize({ width: 1024 }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true });
  const dest = new File(dir, `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`);
  new File(saved.uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}
