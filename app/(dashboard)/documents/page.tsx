"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Document } from "@/lib/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

    await supabase.from("documents").insert({
      company_id: user.id,
      name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    });

    setUploading(false);
    e.target.value = "";
    fetchDocuments();
  };

  const fileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    if (type.includes("word") || type.includes("document")) return "📝";
    return "📁";
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">{documents.length} documents</p>
        </div>
        <label className="cursor-pointer">
          <Button loading={uploading}>
            {uploading ? "Uploading..." : "+ Upload Document"}
          </Button>
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg" />
        </label>
      </div>

      <Card>
        <p className="text-xs text-gray-400 mb-4">
          Supported: PDF, Word, Excel, Images (JPG/PNG), AutoCAD (DWG)
        </p>

        {documents.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No documents uploaded yet.</div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{fileIcon(doc.file_type)}</span>
                  <div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800">
                      {doc.name}
                    </a>
                    <p className="text-xs text-gray-500">
                      {doc.file_type} · {(doc.file_size / 1024).toFixed(1)} KB · {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
