import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Hook to generate signed URLs for private storage bucket files
 * @param bucketName - The name of the storage bucket
 * @param filePaths - Array of file paths to generate signed URLs for
 * @returns Object with signedUrls array and loading/error states
 */
export function useSignedUrls(bucketName: string, filePaths: string[] | null) {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!filePaths || filePaths.length === 0) {
      setSignedUrls([]);
      return;
    }

    const generateSignedUrls = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const urls: string[] = [];

        for (const filePath of filePaths) {
          // If it's already a signed URL or external URL, use it as-is
          if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            urls.push(filePath);
            continue;
          }

          const { data, error: signError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

          if (signError) {
            console.error("Error creating signed URL:", signError);
            // Push empty string or placeholder for failed URLs
            urls.push("");
          } else if (data?.signedUrl) {
            urls.push(data.signedUrl);
          }
        }

        setSignedUrls(urls);
      } catch (err) {
        console.error("Error generating signed URLs:", err);
        setError(err instanceof Error ? err : new Error("Failed to generate signed URLs"));
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrls();
  }, [bucketName, JSON.stringify(filePaths)]);

  return { signedUrls, isLoading, error };
}

/**
 * Utility function to generate a single signed URL
 * @param bucketName - The name of the storage bucket
 * @param filePath - The file path to generate a signed URL for
 * @returns Promise with the signed URL or null if failed
 */
export async function getSignedUrl(bucketName: string, filePath: string): Promise<string | null> {
  // If it's already a URL, return as-is
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data?.signedUrl || null;
}
