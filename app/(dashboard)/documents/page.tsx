"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/lib/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("documents").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setMessage("");

    if (file.size > MAX_FILE_SIZE) {
      setMessage("Files must be 25 MB or smaller.");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Workspace session unavailable. Please refresh and try again.");
      setUploading(false);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: false });
    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
    const { error: insertError } = await supabase.from("documents").insert({
      company_id: user.id,
      name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type || file.name.split(".").pop()?.toUpperCase() || "FILE",
      file_size: file.size,
      uploaded_by: user.id,
    });

    if (insertError) setMessage(`Document record failed: ${insertError.message}`);
    else await fetchDocuments();
    setUploading(false);
  };

  const fileIcon = (type: string) => {
    if (type.toLowerCase().includes("pdf")) return "📄";
    if (type.toLowerCase().includes("image")) return "🖼️";
    if (type.toLowerCase().includes("sheet") || type.toLowerCase().includes("excel")) return "📊";
    if (type.toLowerCase().includes("word") || type.toLowerCase().includes("document")) return "📝";
    return "📁";
  };

  if (loading) return <Loading size="lg" message="Loading documents…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Project files</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Documents</h1>
          <p className="text-sm text-slate-500">{documents.length} files · drawings, BOQs, contracts and invoices</p>
        </div>
        <label className="w-fit cursor-pointer">
          <Button type="button" loading={uploading}>{uploading ? "Uploading…" : "+ Upload document"}</Button>
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg" />
        </label>
      </div>

      {message && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

      <Card>
        <p className="mb-4 text-xs text-slate-400">Supported: PDF, Word, Excel, JPG/PNG images and AutoCAD DWG · Maximum 25 MB per file</p>
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">No documents uploaded yet. Add the latest drawing or BOQ to keep the team aligned.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl" aria-hidden>{fileIcon(document.file_type)}</span>
                  <div className="min-w-0">
                    <a href={document.file_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-sky-700 hover:text-sky-900">{document.name}</a>
                    <p className="text-xs text-slate-500">{document.file_type} · {(document.file_size / 1024).toFixed(1)} KB · {formatDate(document.created_at)}</p>
                  </div>
                </div>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">Open ↗</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
