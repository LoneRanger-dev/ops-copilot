'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloudIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { MAX_KB_DOCUMENT_BYTES, hasAllowedExtension } from '@/lib/utils/file';
import { toRoute } from '@/lib/utils/routes';
import { KbUploadProgress } from './kb-upload-progress';

/** Admin upload form (MASTER_BUILD_SPEC.md §23.5 frontend task 1). */
export function KbUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  function validateAndSetFile(candidate: File) {
    setClientError(null);
    if (candidate.size > MAX_KB_DOCUMENT_BYTES) {
      setClientError(
        `File is too large. Maximum size is ${MAX_KB_DOCUMENT_BYTES / 1024 / 1024} MB.`,
      );
      return;
    }
    if (!hasAllowedExtension(candidate.name)) {
      setClientError('Unsupported file type. Allowed: .md, .txt, .pdf, .docx, .html.');
      return;
    }
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setClientError('Choose a file to upload.');
      return;
    }

    setSubmitting(true);
    setClientError(null);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('title', title || file.name);
    if (description) formData.set('description', description);
    if (category) formData.set('category', category);
    if (tags) formData.set('tags', tags);
    formData.set('visibility', visibility);

    try {
      const response = await fetch('/api/v1/kb/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message ?? 'Upload failed.');
      }
      setUploadedDocumentId(body.data.document.id);
      toast.success('Uploaded — indexing started.');
    } catch (error) {
      setClientError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (uploadedDocumentId) {
    return (
      <KbUploadProgress
        documentId={uploadedDocumentId}
        onDone={() => router.push(toRoute('/admin/knowledge'))}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) validateAndSetFile(dropped);
        }}
        className={cn(
          'border-border flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          dragOver && 'border-primary bg-primary/5',
        )}
      >
        <UploadCloudIcon className="text-muted-foreground size-8" />
        <p className="text-sm font-medium">
          {file ? file.name : 'Drag and drop a file, or click to browse'}
        </p>
        <p className="text-muted-foreground text-xs">
          .md, .txt, .pdf, .docx, .html — up to {MAX_KB_DOCUMENT_BYTES / 1024 / 1024} MB
        </p>
        <Input
          type="file"
          accept=".md,.txt,.pdf,.docx,.html,.htm"
          className="mt-2 max-w-xs"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) validateAndSetFile(selected);
          }}
        />
      </div>

      {clientError && (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive py-3 text-sm">
            {clientError}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kb-title">Title</Label>
        <Input
          id="kb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kb-description">Description</Label>
        <Textarea
          id="kb-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kb-category">Category</Label>
          <Input
            id="kb-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kb-tags">Tags (comma-separated)</Label>
          <Input id="kb-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kb-visibility">Visibility</Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger id="kb-visibility" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public — visible to everyone</SelectItem>
            <SelectItem value="internal">Internal — any signed-in user</SelectItem>
            <SelectItem value="restricted">
              Restricted — support engineers and above
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? 'Uploading…' : 'Upload document'}
      </Button>
    </form>
  );
}
