import { useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { uploadImage } from '@/lib/upload';

interface Props {
  value?: string;
  folder: 'posts' | 'promos' | 'station';
  onChange: (url: string) => void;
}

/** Drag-and-drop image field. Hand-rolled to avoid another dependency. */
export function ImageUpload({ value, folder, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border border-dashed p-5 text-center transition ${
          dragging ? 'border-station bg-station/5' : 'border-hairline'
        }`}>
        {value ? (
          <img src={value} alt="" className="max-h-40 rounded-lg object-cover" />
        ) : (
          <p className="text-sm text-muted">Drop an image here, or choose a file</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}>
            {busy ? 'Uploading…' : value ? 'Replace' : 'Choose file'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange('')}>
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
