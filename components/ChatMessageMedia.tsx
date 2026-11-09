'use client';

import React, { useState, useRef } from 'react';
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
  Loader2
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!mediaUrl) return null;

  const urlLower = mediaUrl.toLowerCase();
  const typeLower = (mediaType || '').toLowerCase();

  // Determine media category
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

  // Clean filename extraction from URL
  const extractFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1].split('?')[0];
      // Remove leading epoch timestamps if any (e.g. 1794217685283_file.png -> file.png)
      return decodeURIComponent(last).replace(/^\d{10,14}_/, '');
    } catch {
      return 'downloaded_file';
    }
  };

  const fileName = extractFileName(mediaUrl);

  // Direct download helper
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(mediaUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Audio player controls
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

  // 1. IMAGE MEDIA
  if (isImage) {
    return (
      <div className="w-full">
        <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-lg transition-all duration-200 hover:border-emerald-500/30">
          <img
            src={mediaUrl}
            alt={caption || 'WhatsApp Photo'}
            loading="lazy"
            className="w-full h-auto max-h-80 sm:max-h-96 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
            onClick={() => setLightboxOpen(true)}
          />

          {/* Quick Overlay Action Bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-3">
            <span className="text-[11px] font-mono text-slate-300 truncate max-w-[65%]">
              {fileName}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur transition"
                title="View Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur transition"
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

        {/* Fullscreen Lightbox Modal */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox Controls */}
              <div className="w-full flex items-center justify-between pb-3 text-white">
                <span className="text-xs font-mono text-slate-300 truncate max-w-md">
                  {fileName}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                    title="Open original tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-white transition"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lightbox Image */}
              <img
                src={mediaUrl}
                alt={caption || 'Preview'}
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
              {caption && caption !== 'Media message' && (
                <p className="mt-3 text-sm text-slate-200 text-center bg-black/60 px-4 py-2 rounded-xl backdrop-blur max-w-xl">
                  {caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. VIDEO MEDIA
  if (isVideo) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg">
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

  // 3. AUDIO / VOICE NOTE
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
          {/* Play/Pause Button */}
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

          {/* Audio Waveform / Scrubber */}
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

  // 4. DOCUMENTS & ATTACHMENTS (PDF, Word, Excel, Zip, etc.)
  let badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  let badgeText = 'FILE';
  let IconComponent = FileText;

  if (isPdf) {
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    badgeText = 'PDF';
  } else if (isSheet) {
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
              <span className="text-[10px] text-slate-400 font-mono">Document</span>
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

