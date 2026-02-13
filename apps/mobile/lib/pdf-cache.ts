import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_DIR = `${FileSystem.cacheDirectory}pdfs/`;
const CACHE_KEY_PREFIX = "pdf_cache_";

/**
 * Get a locally cached PDF file path, downloading if necessary.
 * Returns the local file URI for use with react-native-pdf.
 */
export async function getCachedPDF(
  documentId: string,
  remoteUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const cachedPath = await AsyncStorage.getItem(
    `${CACHE_KEY_PREFIX}${documentId}`
  );

  if (cachedPath) {
    const info = await FileSystem.getInfoAsync(cachedPath);
    if (info.exists) {
      return cachedPath;
    }
    await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${documentId}`);
  }

  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }

  const localPath = `${CACHE_DIR}${documentId}.pdf`;

  const downloadResumable = FileSystem.createDownloadResumable(
    remoteUrl,
    localPath,
    {},
    (downloadProgress) => {
      if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
      }
    }
  );

  const result = await downloadResumable.downloadAsync();

  if (!result || result.status !== 200) {
    throw new Error(
      `Failed to download PDF: status ${result?.status ?? "unknown"}`
    );
  }

  await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${documentId}`, localPath);

  return localPath;
}

/** Remove a single cached PDF. */
export async function removeCachedPDF(documentId: string): Promise<void> {
  const cachedPath = await AsyncStorage.getItem(
    `${CACHE_KEY_PREFIX}${documentId}`
  );
  if (cachedPath) {
    const info = await FileSystem.getInfoAsync(cachedPath);
    if (info.exists) {
      await FileSystem.deleteAsync(cachedPath, { idempotent: true });
    }
    await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${documentId}`);
  }
}

/** Clear all cached PDFs. */
export async function clearPDFCache(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}
