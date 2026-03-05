"use client";

import { ExternalLink, X } from "lucide-react";
import { FnButton } from "@/components/ui/fn-button";
import ModalPortal from "@/components/ui/modal-portal";

export const toPresentationPreviewUrl = (publicUrl: string) => {
  const normalizedUrl = publicUrl.trim();
  if (!normalizedUrl) {
    return "";
  }

  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    normalizedUrl,
  )}`;
};

type PresentationPreviewModalProps = {
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
};

export default function PresentationPreviewModal({
  fileName,
  isOpen,
  onClose,
  publicUrl,
}: PresentationPreviewModalProps) {
  if (!isOpen) {
    return null;
  }

  const presentationPreviewUrl = toPresentationPreviewUrl(publicUrl);
  const normalizedPublicUrl = publicUrl.trim();

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="presentation-preview-title"
      >
        <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-b-4 border-fnblue bg-background shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-foreground/10 px-4 py-3 md:px-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-fnblue">
                Presentation Preview
              </p>
              <h3
                id="presentation-preview-title"
                className="mt-1 text-lg font-black uppercase tracking-tight md:text-xl"
              >
                {fileName || "Uploaded PPT"}
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close presentation preview"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-md border border-foreground/20 bg-white text-foreground/70 transition-colors hover:bg-fnred/10 hover:text-fnred focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fnred/40"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>

          <div className="relative flex-1 bg-slate-100">
            {presentationPreviewUrl ? (
              <iframe
                title="Uploaded team presentation preview"
                src={presentationPreviewUrl}
                className="h-full w-full"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-foreground/75">
                Preview is unavailable for this file right now.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 bg-white/85 px-4 py-3">
            <p className="text-xs text-foreground/70">
              If preview does not load, open the uploaded file directly.
            </p>
            <div className="flex gap-2">
              {normalizedPublicUrl ? (
                <FnButton asChild tone="gray" size="sm">
                  <a
                    href={normalizedPublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} strokeWidth={3} />
                    Open in New Tab
                  </a>
                </FnButton>
              ) : null}
              <FnButton type="button" size="sm" onClick={onClose}>
                Close
              </FnButton>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
