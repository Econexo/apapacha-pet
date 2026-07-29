import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type MediaSource = 'camera' | 'library';

// En web los permisos son no-op: expo-image-picker crea un <input type="file">
// (con `capture` para la cámara) y el permiso lo pide el propio navegador.
async function ensurePermission(source: MediaSource): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

interface ImageOpts {
  aspect?: [number, number];
  allowsEditing?: boolean;
  quality?: number;
}

/** Devuelve la URI local de la imagen elegida, o null si se canceló. */
export async function pickImage(source: MediaSource, opts: ImageOpts = {}): Promise<string | null> {
  if (!(await ensurePermission(source))) return null;
  const common = {
    quality: opts.quality ?? 0.8,
    allowsEditing: opts.allowsEditing ?? false,
    ...(opts.aspect ? { aspect: opts.aspect } : {}),
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...common, mediaTypes: ['images'] as ImagePicker.MediaType[] })
      : await ImagePicker.launchImageLibraryAsync({ ...common, mediaTypes: ['images'] as ImagePicker.MediaType[] });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/** Devuelve la URI y duración del video elegido, o null si se canceló. */
export async function pickVideo(
  source: MediaSource,
  opts: { maxDurationSec?: number } = {}
): Promise<{ uri: string; duration?: number } | null> {
  if (!(await ensurePermission(source))) return null;
  const common = {
    quality: 0.7,
    videoMaxDuration: opts.maxDurationSec ?? 60,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...common, mediaTypes: ['videos'] as ImagePicker.MediaType[] })
      : await ImagePicker.launchImageLibraryAsync({ ...common, mediaTypes: ['videos'] as ImagePicker.MediaType[] });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, duration: asset.duration ?? undefined };
}
