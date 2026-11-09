'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileIcon,
  Maximize2,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  FileCheck
} from 'lucide-react';

interface ChatMessageMediaProps {
  mediaUrl: string;
  mediaType?: string | null;
  caption?: string | null;
  isFromMe?: boolean;
}

export default function ChatMessageMedia({
  mediaUrl,
  mediaType = '',
  caption,
  isFromMe = false,
}: ChatMessageMediaProps) {
  // Image Lightbox state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // PDF Viewer Modal state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'embed' | 'page'>('embed');
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfPageError, setPdfPageError] = useState(false);
  const [pdfPageZoom, setPdfPageZoom] = useState(1);

  // Audio Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // General state
  const [isDownloading, setIsDownloading] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageModalOpen(false);
        setPdfModalOpen(false);
        setZoomLevel(1);
        setPdfPageZoom(1);
      }
    };
    if (imageModalOpen || pdfModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [imageModalOpen, pdfModalOpen]);

  if (!mediaUrl) return null;

  const urlLower = mediaUrl.toLowerCase();
  const typeLower = (mediaType || '').toLowerCase();

  // Media category detection
  const isImage =
    typeLower.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(urlLower);

  const isVideo =
    typeLower.includes('video') ||
    /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(urlLower);

  const isAudio =
    typeLower.includes('audio') ||
    /\.(mp3|wav|ogg|m4a|aac|opus)(\?.*)?$/i.test(urlLower);

  const isPdf = typeLower.includes('pdf') || /\.pdf(\?.*)?$/i.test(urlLower);
  const isSheet = /\.(xls|xlsx|csv)(\?.*)?$/i.test(urlLower);
  const isArchive = /\.(zip|rar|7z|tar|gz)(\?.*)?$/i.test(urlLower);
  const isCode = /\.(json|js|ts|html|css|xml)(\?.*)?$/i.test(urlLower);

  // Clean filename extraction
  const extractFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1].split('?')[0];
      return decodeURIComponent(last).replace(/^\d{10,14}_/, '');
    } catch {
      return 'document';
    }
  };

  const fileName = extractFileName(mediaUrl);

  // Generate page thumbnail URL for Cloudinary PDFs
  const getPdfThumbnailUrl = (url: string, page: number = 1) => {
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url
        .replace(/\/upload\/(v\d+\/)?/, `/upload/pg_${page},w_1400,f_auto,q_auto/$1`)
        .replace(/\.pdf(\?.*)?$/i, '.jpg');
    }
    return null;
  };

  const pdfThumbUrl = isPdf ? getPdfThumbnailUrl(mediaUrl, 1) : null;
  const proxyPdfUrl = `/api/media/pdf?url=${encodeURIComponent(mediaUrl)}`;

  // Direct download trigger (routes PDFs through signed proxy to avoid 401 ACL error)
  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsDownloading(true);
      const downloadUrl = isPdf
        ? `/api/media/pdf?url=${encodeURIComponent(mediaUrl)}&download=true&filename=${encodeURIComponent(fileName)}`
        : mediaUrl;

      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Download request failed');

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName.endsWith('.pdf') || !isPdf ? fileName : `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(
        isPdf
          ? `/api/media/pdf?url=${encodeURIComponent(mediaUrl)}&download=true&filename=${encodeURIComponent(fileName)}`
          : mediaUrl,
        '_blank'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Audio controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ==========================================
  // 1. IMAGE RENDERING & UNIVERSAL LIGHTBOX
  // ==========================================
  if (isImage) {
    return (
      <div className="w-full">
        {/* Chat Bubble Image Preview (Maintains true aspect ratio without distortion) */}
        <div
          onClick={() => {
            setImageModalOpen(true);
            setZoomLevel(1);
          }}
          className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/30 cursor-pointer shadow-md hover:border-emerald-500/40 transition-all duration-200 max-w-full sm:max-w-sm md:max-w-md"
        >
          <img
            src={mediaUrl}
            alt={caption || 'WhatsApp Photo'}
            loading="lazy"
            className="w-full h-auto max-h-[360px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Quick Overlay Bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-3 pointer-events-none">
            <span className="text-[11px] font-mono text-slate-200 truncate max-w-[65%]">
              {fileName}
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageModalOpen(true);
                  setZoomLevel(1);
                }}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur transition shadow"
                title="View Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur transition shadow"
                title="Download Photo"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Universal Aspect Ratio Lightbox Modal */}
        {imageModalOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
            onClick={() => {
              setImageModalOpen(false);
              setZoomLevel(1);
            }}
          >
            {/* Top Fixed Control Bar - Always visible regardless of image aspect ratio */}
            <div
              className="sticky top-0 inset-x-0 z-[110] px-4 py-3.5 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-xs sm:text-sm font-mono font-medium text-slate-200 truncate max-w-xs sm:max-w-md">
                  {fileName}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Reset Zoom Indicator */}
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-emerald-400 font-semibold transition"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {/* Download */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm shadow-emerald-500/20"
                  title="Download Image"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* Open External */}
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                  title="Open Original in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setImageModalOpen(false);
                    setZoomLevel(1);
                  }}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition ml-1"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Viewport - Accommodates ANY ratio (vertical, landscape, ultra-wide) */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-6 w-full h-full select-none">
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel})` }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle zoom on image click
                  setZoomLevel((z) => (z === 1 ? 1.75 : 1));
                }}
              >
                <img
                  src={mediaUrl}
                  alt={caption || 'Full view'}
                  className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl cursor-zoom-in"
                />
              </div>
            </div>

            {/* Caption bar if present */}
            {caption && caption !== 'Media message' && (
              <div
                className="sticky bottom-0 inset-x-0 p-3 bg-slate-950/90 border-t border-white/10 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto font-medium">
                  {caption}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. PDF VIEWER & WHATSAPP-STYLE THUMBNAIL
  // ==========================================
  if (isPdf) {
    return (
      <div className="w-full">
        {/* WhatsApp-Style PDF Card with First-Page Thumbnail */}
        <div
          onClick={() => setPdfModalOpen(true)}
          className="relative group overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 hover:border-rose-500/60 transition-all duration-200 cursor-pointer shadow-lg max-w-full sm:max-w-sm md:max-w-md"
        >
          {/* First Page Preview Thumbnail if available */}
          {pdfThumbUrl && !thumbError ? (
            <div className="relative w-full h-44 sm:h-52 bg-slate-950/60 overflow-hidden border-b border-white/10">
              <img
                src={pdfThumbUrl}
                alt="PDF First Page Preview"
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                <FileText className="w-3 h-3" />
                <span>PDF Document</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-lg">
                  <Eye className="w-4 h-4" />
                  <span>Click to Read PDF</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                  PDF
                </span>
                <p className="text-xs font-mono text-slate-400 mt-1">Multi-page Document</p>
              </div>
            </div>
          )}

          {/* Bottom Document Info & Actions */}
          <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-900/90">
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition">
                {fileName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <span>Click to open in PDF Viewer</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPdfModalOpen(true);
                }}
                className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                title="Read PDF"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Download PDF"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Full PDF Viewer Modal */}
        {pdfModalOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
            onClick={() => setPdfModalOpen(false)}
          >
            {/* Top Fixed Header with Controls */}
            <div
              className="sticky top-0 inset-x-0 z-[110] px-4 py-3 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {fileName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {pdfViewMode === 'embed' ? 'Interactive PDF Reader' : `Page ${pdfPage} Preview`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Switch between Native PDF Engine and Rendered Page View */}
                {pdfThumbUrl && (
                  <button
                    type="button"
                    onClick={() => setPdfViewMode((m) => (m === 'embed' ? 'page' : 'embed'))}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition border border-white/10"
                    title={pdfViewMode === 'embed' ? 'Switch to Page Reader' : 'Switch to Interactive PDF Engine'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">
                      {pdfViewMode === 'embed' ? 'Page View' : 'PDF Engine'}
                    </span>
                  </button>
                )}

                {/* Page View Zoom controls */}
                {pdfViewMode === 'page' && (
                  <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 rounded-xl p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPdfPageZoom((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))))}
                      className="p-1 text-slate-300 hover:text-white rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-emerald-400 px-1">
                      {Math.round(pdfPageZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdfPageZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                      className="p-1 text-slate-300 hover:text-white rounded"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Direct Download */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition shadow-sm shadow-rose-600/20"
                  title="Download PDF"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>

                {/* Open in New Window (via Proxy to avoid 401 ACL error) */}
                <a
                  href={proxyPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Open in New Window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition ml-1"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Interactive PDF Frame Viewport */}
            <div
              className="flex-1 w-full h-full p-2 sm:p-4 overflow-hidden flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-full max-w-6xl bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative flex flex-col">
                {pdfViewMode === 'embed' ? (
                  <iframe
                    src={`${proxyPdfUrl}#toolbar=1`}
                    className="w-full h-full border-0 bg-white"
                    title={fileName}
                  />
                ) : (
                  <div className="flex-1 w-full h-full overflow-auto p-4 flex flex-col items-center justify-start bg-slate-950">
                    <div
                      className="transition-transform duration-200 shadow-2xl rounded-lg overflow-hidden bg-white max-w-full"
                      style={{ transform: `scale(${pdfPageZoom})`, transformOrigin: 'top center' }}
                    >
                      <img
                        src={getPdfThumbnailUrl(mediaUrl, pdfPage) || ''}
                        alt={`Page ${pdfPage}`}
                        onError={() => setPdfPageError(true)}
                        className="max-h-[80vh] w-auto object-contain select-none"
                      />
                    </div>

                    {/* Multi-page controls */}
                    <div className="sticky bottom-4 mt-4 flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setPdfPage((p) => Math.max(1, p - 1));
                          setPdfPageError(false);
                        }}
                        disabled={pdfPage <= 1}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white"
                      >
                        Prev Page
                      </button>
                      <span className="text-xs font-mono text-slate-300">
                        Page {pdfPage}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfPage((p) => p + 1);
                          setPdfPageError(false);
                        }}
                        disabled={pdfPageError}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white"
                      >
                        Next Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. VIDEO MEDIA
  // ==========================================
  if (isVideo) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg max-w-full sm:max-w-sm md:max-w-md">
          <video
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-auto max-h-80 sm:max-h-96 rounded-2xl object-contain bg-black"
          />
          <div className="p-2.5 bg-slate-900/80 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[70%]">
              {fileName}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              <Download className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. AUDIO / VOICE NOTES
  // ==========================================
  if (isAudio) {
    return (
      <div className="w-full min-w-[240px] sm:min-w-[280px]">
        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        <div className="p-3 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md flex items-center gap-3 shadow-md">
          {/* Circular Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlayAudio}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow ${
              isFromMe
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300'
                : 'bg-gradient-to-tr from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Scrubber & Duration */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) audioRef.current.currentTime = val;
              }}
              className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-slate-500" />
                {formatAudioTime(currentTime)}
              </span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>

          {/* Quick Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title="Download Audio"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. OTHER DOCUMENTS (Word, Excel, Zip, etc.)
  // ==========================================
  let badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  let badgeText = 'FILE';
  let IconComponent = FileText;

  if (isSheet) {
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    badgeText = 'EXCEL';
    IconComponent = FileSpreadsheet;
  } else if (isArchive) {
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    badgeText = 'ZIP';
    IconComponent = FileArchive;
  } else if (isCode) {
    badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    badgeText = 'CODE';
    IconComponent = FileCode;
  }

  return (
    <div className="w-full min-w-[230px] sm:min-w-[270px]">
      <div className="p-3 rounded-2xl bg-black/30 hover:bg-black/40 border border-white/10 transition flex items-center justify-between gap-3 shadow-md group">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border flex-shrink-0 ${badgeColor}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition">
              {fileName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeColor}`}>
                {badgeText}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Attachment</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Open Document"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-white/10 transition"
            title="Download Document"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
