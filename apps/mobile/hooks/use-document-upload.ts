import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useApiUpload } from "@/lib/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UseDocumentUploadOptions {
  onSuccess?: () => void;
}

export function useDocumentUpload({ onSuccess }: UseDocumentUploadOptions = {}) {
  const apiUpload = useApiUpload();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert("File too large", "Maximum file size is 50MB.");
        return;
      }

      setUploading(true);

      const formData = new FormData();
      // RN's FormData accepts { uri, type, name } objects for file uploads,
      // but TypeScript's DOM lib only types the value as Blob | string.
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/pdf",
        name: file.name || "document.pdf",
      } as unknown as Blob);

      const res = await apiUpload("/api/documents/upload", formData);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error || "Upload failed. Please try again.";
        Alert.alert("Upload failed", message);
        return;
      }

      onSuccess?.();
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setUploading(false);
    }
  }, [apiUpload, onSuccess]);

  return { pickAndUpload, uploading };
}
