import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, FileText, Check, Lock } from "lucide-react";

const MAX_MB = 5;
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];

function IdUpload({ file, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(f) {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Please upload a JPG, PNG or PDF.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setError("");
    onChange(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }

  function remove() {
    onChange(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1 block font-heading text-xs font-semibold text-slate-700">
        Upload your KIIT ID card
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files[0])}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-3 transition-colors ${dragging
              ? "border-romora-500 bg-romora-50"
              : "border-slate-200 bg-slate-50/60 hover:border-romora-500/70 hover:bg-romora-50/40"
            }`}
        >
          <CloudUpload className="h-8 w-8 shrink-0 text-romora-500" />
          <div>
            <p className="font-heading text-xs font-semibold text-slate-700">
              Drag and drop or <span className="text-romora-500 underline">browse</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">JPG, PNG or PDF, up to 5 MB</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {preview ? (
                <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <FileText className="h-5 w-5 text-romora-500" />
                </div>
              )}
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-emerald-500">
                <Check className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{file.name}</p>
              <p className="text-[10px] font-medium text-emerald-700">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}

      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
        <Lock className="h-3 w-3 shrink-0" />
        Used only to verify you are a KIIT student.
      </p>
    </div>
  );
}

export default IdUpload;