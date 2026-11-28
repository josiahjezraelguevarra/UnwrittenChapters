import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { MediaItem } from '../../shared/types';
import { mediaFullUrl, mediaThumbUrl } from '../lib/api';

interface PhotoLightboxModalProps {
  slug: string;
  photos: MediaItem[];
  activePhotoId: string | null;
  allowLikes: boolean;
  allowDownload: boolean;
  likeCounts: Record<string, number>;
  visitorLikes: Set<string>;
  onSelectPhoto: (fileId: string) => void;
  onToggleLike: (fileId: string) => void;
  onClose: () => void;
}

export function PhotoLightboxModal({
  slug,
  photos,
  activePhotoId,
  allowLikes,
  allowDownload,
  likeCounts,
  visitorLikes,
  onSelectPhoto,
  onToggleLike,
  onClose
}: PhotoLightboxModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [zoomed, setZoomed] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);

  const currentIndex = useMemo(
    () => (activePhotoId ? photos.findIndex((item) => item.id === activePhotoId) : -1),
    [photos, activePhotoId]
  );

  const activePhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const nextPhoto =
    currentIndex >= 0 && currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activePhoto && !dialog.open) {
      dialog.showModal();
    } else if (!activePhoto && dialog.open) {
      dialog.close();
    }
  }, [activePhoto]);

  useEffect(() => {
    setZoomed(false);
    setFullLoaded(false);
  }, [activePhotoId]);

  useEffect(() => {
    if (!activePhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevPhoto) {
        e.preventDefault();
        onSelectPhoto(prevPhoto.id);
      } else if (e.key === 'ArrowRight' && nextPhoto) {
        e.preventDefault();
        onSelectPhoto(nextPhoto.id);
      } else if ((e.key === 'f' || e.key === 'F') && allowLikes) {
        e.preventDefault();
        onToggleLike(activePhoto.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, prevPhoto, nextPhoto, allowLikes, onSelectPhoto, onToggleLike]);

  const liked = activePhoto ? visitorLikes.has(activePhoto.id) : false;
  const likeCount = activePhoto ? likeCounts[activePhoto.id] || 0 : 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={activePhoto ? `Viewing ${activePhoto.name}` : 'Photo viewer'}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/94 p-0 text-white backdrop:bg-transparent"
    >
      {activePhoto && (
        <div className="flex h-full w-full flex-col">
          {/* Top Controls */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/45 px-3 py-2.5 backdrop-blur-md sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-xs font-medium text-white/90">
                {currentIndex + 1} / {photos.length}
              </span>
              <p className="truncate text-xs font-medium text-white/85 sm:text-sm">
                {activePhoto.name}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-pressed={zoomed}
                aria-label={zoomed ? 'Fit photo to screen' : 'Zoom photo'}
                title={zoomed ? 'Fit to screen' : 'Zoom full size'}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
              >
                {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                <span className="hidden sm:inline">{zoomed ? 'Fit' : 'Zoom'}</span>
              </button>

              {allowLikes && (
                <button
                  type="button"
                  aria-pressed={liked}
                  aria-label={liked ? `Unlike ${activePhoto.name}` : `Like ${activePhoto.name}`}
                  onClick={() => onToggleLike(activePhoto.id)}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                    liked
                      ? 'border-rose-500 bg-rose-600 text-white hover:bg-rose-500'
                      : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                  {likeCount > 0 && <span>{likeCount}</span>}
                </button>
              )}

              {allowDownload && (
                <a
                  href={mediaFullUrl(slug, activePhoto.id, true)}
                  download={activePhoto.name}
                  aria-label={`Download ${activePhoto.name}`}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-950 transition hover:bg-white/90"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close photo viewer"
                className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Photo Stage */}
          <div
            ref={stageRef}
            onClick={(e) => {
              if (e.target === stageRef.current) onClose();
            }}
            onTouchStart={(e) => {
              if (zoomed || e.touches.length !== 1) return;
              touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
              };
            }}
            onTouchEnd={(e) => {
              const start = touchStartRef.current;
              touchStartRef.current = null;
              if (!start || zoomed || e.changedTouches.length === 0) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                if (dx > 0 && prevPhoto) onSelectPhoto(prevPhoto.id);
                else if (dx < 0 && nextPhoto) onSelectPhoto(nextPhoto.id);
              }
            }}
            className={`relative flex flex-1 touch-pan-y items-center justify-center p-3 sm:p-6 ${
              zoomed ? 'overflow-auto' : 'overflow-hidden'
            }`}
          >
            {prevPhoto && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPhoto(prevPhoto.id);
                }}
                className="fixed top-1/2 left-3 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/85 sm:left-5"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
              className={
                zoomed
                  ? 'm-auto flex items-center justify-center'
                  : 'relative flex max-h-full max-w-full items-center justify-center'
              }
            >
              {!fullLoaded && (
                <img
                  src={mediaThumbUrl(slug, activePhoto.id, 1200)}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className={
                    zoomed
                      ? 'h-auto max-w-none rounded-lg opacity-85'
                      : 'max-h-[calc(100dvh-7.5rem)] w-auto max-w-[92vw] rounded-lg object-contain opacity-85'
                  }
                />
              )}
              <img
                key={activePhoto.id}
                src={mediaFullUrl(slug, activePhoto.id, false)}
                alt={activePhoto.name}
                draggable={allowDownload}
                onLoad={() => setFullLoaded(true)}
                onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomed((z) => !z);
                }}
                className={`${!allowDownload ? 'select-none ' : ''}${
                  fullLoaded ? 'opacity-100' : 'pointer-events-none absolute opacity-0'
                } ${
                  zoomed
                    ? 'h-auto max-w-none cursor-zoom-out rounded-lg'
                    : 'max-h-[calc(100dvh-7.5rem)] w-auto max-w-[92vw] cursor-zoom-in rounded-lg object-contain shadow-2xl'
                } transition-opacity duration-200`}
              />
            </div>

            {nextPhoto && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPhoto(nextPhoto.id);
                }}
                className="fixed top-1/2 right-3 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/85 sm:right-5"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
