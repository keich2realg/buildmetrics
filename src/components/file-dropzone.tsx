"use client";

import React, { useState, useRef, useCallback } from "react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
}

export function FileDropzone({
  onFilesSelected,
  acceptedTypes = [".pdf", ".png", ".jpg", ".jpeg"],
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const validFiles = Array.from(files).filter((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        return acceptedTypes.includes(ext);
      });
      setSelectedFiles(validFiles);
      onFilesSelected(validFiles);
    },
    [acceptedTypes, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative flex flex-col items-center justify-center 
          rounded-xl border-2 border-dashed p-10 cursor-pointer
          transition-all duration-300 ease-out group
          ${
            isDragOver
              ? "border-steel bg-steel/5 scale-[1.01] shadow-lg shadow-steel/10"
              : "border-border hover:border-steel/40 hover:bg-steel/[0.02]"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple
          onChange={handleChange}
          className="hidden"
        />

        {/* Upload icon */}
        <div
          className={`
            mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300
            ${isDragOver ? "bg-steel/10 text-steel scale-110" : "bg-secondary text-muted-foreground group-hover:bg-steel/10 group-hover:text-steel"}
          `}
        >
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-base font-medium text-anthracite mb-1">
          {isDragOver
            ? "Déposez vos fichiers ici"
            : "Glissez-déposez vos plans ici"}
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          ou{" "}
          <span className="text-steel font-medium underline underline-offset-2">
            parcourez vos fichiers
          </span>
        </p>
        <p className="text-xs text-muted-foreground/70">
          Formats acceptés : PDF, PNG, JPG • Max. 20 Mo
        </p>
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 group/file animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-steel/10 text-steel">
                  {file.name.endsWith(".pdf") ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-anthracite truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
