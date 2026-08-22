import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import Button from '../ui/Button';
import { mediaApi } from '../../lib/api/media';
import { ApiError } from '../../lib/apiClient';
import type { MediaKind } from '../../types/media';

// Mirrors backend/middlewares/upload.middleware.js ALLOWED_MIME_TYPES exactly.
const ALLOWED_MIME_TYPES: Record<string, MediaKind> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
};

// Mirrors the backend's default MAX_UPLOAD_SIZE_MB (see backend/.env.example).
// If that env var is changed on the backend, update this to match.
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaUpload({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(roomId, file),
    onSuccess: () => {
      setSelectedFile(null);
      setValidationError(null);
      setSuccessMessage('Uploaded! It should appear in the gallery now.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['media', roomId] });
      window.setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES[file.type]) {
      setValidationError('Unsupported file type. Allowed: JPEG, PNG, WEBP, MP4, WEBM.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const uploadError =
    uploadMutation.error instanceof ApiError
      ? uploadMutation.error.message
      : uploadMutation.isError
      ? 'Upload failed. Please try again.'
      : null;

  const errorMessage = validationError || uploadError;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={handleFileChange}
          className="text-sm text-ink-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-coral-500/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-coral-700 hover:file:bg-coral-500/20"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={<UploadCloud size={16} />}
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="shrink-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {selectedFile && !errorMessage && (
        <p className="text-xs text-ink-600">
          {selectedFile.name} · {formatFileSize(selectedFile.size)}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-xl bg-coral-500/10 px-4 py-2 text-sm text-coral-700" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700" role="status">
          {successMessage}
        </p>
      )}
    </div>
  );
}

export default MediaUpload;