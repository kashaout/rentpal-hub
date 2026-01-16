import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  property_id: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  properties?: {
    name: string;
  } | null;
}

export function useDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          properties:property_id (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      category,
      propertyId,
    }: {
      file: File;
      category: string;
      propertyId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      setUploading(true);

      // Create file path: user_id/timestamp_filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert record into documents table
      const { error: insertError } = await supabase.from("documents").insert({
        name: file.name,
        file_path: fileName,
        file_type: fileExt || "unknown",
        file_size: file.size,
        category,
        property_id: propertyId || null,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Clean up uploaded file if insert fails
        await supabase.storage.from("documents").remove([fileName]);
        throw insertError;
      }

      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully");
      setUploading(false);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: Document) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const downloadDocument = async (document: Document) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (error) {
      toast.error("Download failed");
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = document.name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    documents,
    isLoading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
}
