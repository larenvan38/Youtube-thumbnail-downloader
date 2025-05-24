import React, { useState, useCallback, FormEvent, useMemo } from 'react';
import { extractVideoId } from './utils/youtubeUtils';

// --- Helper Components ---
const DownloadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center my-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-500"></div>
  </div>
);

interface ErrorMessageProps {
  message: string;
}
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="my-4 p-4 bg-red-700/30 text-red-300 border border-red-500 rounded-lg shadow-md animate-fadeIn">
    <p className="font-semibold">Error</p>
    <p>{message}</p>
  </div>
);

// --- Thumbnail Quality Definitions ---
interface ThumbnailQualityInfo {
  key: string;
  label: string;
  dimensions: string;
  shortCode: string;
}

const THUMBNAIL_QUALITIES: ThumbnailQualityInfo[] = [
  { key: 'maxresdefault.jpg', label: 'Max Resolution', dimensions: '1280x720', shortCode: 'Max' },
  { key: 'sddefault.jpg', label: 'Standard Definition', dimensions: '640x480', shortCode: 'SD' },
  { key: 'hqdefault.jpg', label: 'High Quality', dimensions: '480x360', shortCode: 'HQ' },
  { key: 'mqdefault.jpg', label: 'Medium Quality', dimensions: '320x180', shortCode: 'MQ' },
  { key: 'default.jpg', label: 'Default Quality', dimensions: '120x90', shortCode: 'Default' },
];

interface AvailableThumbnail extends ThumbnailQualityInfo {
  url: string;
}

// --- Main App Component ---
const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoIdForDownload, setVideoIdForDownload] = useState<string | null>(null);
  
  const [availableThumbnails, setAvailableThumbnails] = useState<AvailableThumbnail[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<AvailableThumbnail | null>(null);

  const fetchAllAvailableThumbnails = useCallback(async (videoId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setAvailableThumbnails([]);
    setSelectedThumbnail(null);
    setVideoIdForDownload(videoId);

    const promises = THUMBNAIL_QUALITIES.map(quality => {
      return new Promise<AvailableThumbnail | null>((resolve) => {
        const url = `https://img.youtube.com/vi/${videoId}/${quality.key}`;
        const img = new Image();
        img.onload = () => resolve({
          url,
          key: quality.key,
          label: quality.label,
          dimensions: quality.dimensions,
          shortCode: quality.shortCode,
        });
        img.onerror = () => resolve(null);
        img.src = url;
      });
    });

    try {
      const results = await Promise.all(promises);
      const foundThumbnails = results.filter(Boolean) as AvailableThumbnail[];

      if (foundThumbnails.length > 0) {
        setAvailableThumbnails(foundThumbnails);
        setSelectedThumbnail(foundThumbnails[0]); // Select the first (highest quality) by default
      } else {
        setError("No thumbnails found for this video. It might be private, deleted, or an invalid link.");
        setVideoIdForDownload(null);
      }
    } catch (e) {
        console.error("Error fetching thumbnails:", e);
        setError("An unexpected error occurred while fetching thumbnails.");
        setVideoIdForDownload(null);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setAvailableThumbnails([]);
    setSelectedThumbnail(null);
    setVideoIdForDownload(null);

    if (!inputValue.trim()) {
      setError("Please enter a YouTube video URL.");
      return;
    }

    const videoId = extractVideoId(inputValue);

    if (!videoId) {
      setError("Invalid YouTube URL or Video ID not found. Please check the link and try again.");
      return;
    }
    
    fetchAllAvailableThumbnails(videoId);
  }, [inputValue, fetchAllAvailableThumbnails]);

  const handleDownload = useCallback(async () => {
    if (!selectedThumbnail || !videoIdForDownload) {
      setError("No thumbnail selected to download.");
      return;
    }
    try {
      const response = await fetch(selectedThumbnail.url, { mode: 'cors' }); // Added mode: 'cors'
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText} (URL: ${selectedThumbnail.url})`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const extension = selectedThumbnail.key.split('.').pop() || 'jpg';
      link.download = `youtube_thumbnail_${videoIdForDownload}_${selectedThumbnail.shortCode.toLowerCase()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setError(null); 
    } catch (e) {
      console.error("Download failed:", e);
      setError(`Failed to download image. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [selectedThumbnail, videoIdForDownload]);

  const handleThumbnailSelect = useCallback((thumbnail: AvailableThumbnail) => {
    setSelectedThumbnail(thumbnail);
  }, []);
  
  const mainPreviewStyle = useMemo(() => {
    if (!selectedThumbnail) return { aspectRatio: '16/9' };
    const [width, height] = selectedThumbnail.dimensions.split('x').map(Number);
    return { aspectRatio: `${width}/${height}` };
  }, [selectedThumbnail]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .thumbnail-item-selected {
          border-color: #0ea5e9 !important; /* sky-500 */
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.5);
        }
      `}</style>
      <div className="w-full max-w-3xl bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 transform transition-all duration-500 hover:shadow-sky-500/30">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600">
            YouTube Thumbnail Downloader
          </h1>
          <p className="text-slate-400 mt-3 text-sm md:text-base">
            Paste a YouTube video link to grab its thumbnails. Select your preferred quality.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-300 mb-1">
              YouTube Video URL
            </label>
            <input
              id="youtube-url"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors duration-200"
              aria-label="YouTube Video URL"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Fetching Thumbnails...
              </>
            ) : (
              'Get Thumbnails'
            )}
          </button>
        </form>

        {error && <ErrorMessage message={error} />}
        
        {isLoading && !error && <LoadingSpinner />}

        {selectedThumbnail && !isLoading && !error && (
          <div className="mt-8 text-center animate-fadeIn">
            <h2 className="text-2xl font-semibold text-slate-200 mb-1">Selected Thumbnail Preview</h2>
            <p className="text-sm text-slate-400 mb-3" aria-live="polite">
              Quality: {selectedThumbnail.label} ({selectedThumbnail.dimensions})
            </p>
            <div className="relative group">
              <img
                src={selectedThumbnail.url}
                alt={`Preview: ${selectedThumbnail.label}`}
                className="rounded-lg shadow-xl mx-auto max-w-full h-auto border-2 border-slate-700 group-hover:border-sky-500 transition-all duration-300 bg-slate-700"
                style={mainPreviewStyle}
                key={selectedThumbnail.url} // Re-render if URL changes
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                 <p className="text-white text-lg font-semibold">{selectedThumbnail.label}</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="mt-6 flex items-center justify-center w-full sm:w-auto mx-auto px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all duration-200 ease-in-out"
              aria-label={`Download ${selectedThumbnail.label} thumbnail`}
            >
              <DownloadIcon />
              Download ({selectedThumbnail.shortCode})
            </button>
          </div>
        )}

        {availableThumbnails.length > 0 && !isLoading && !error && (
          <div className="mt-10 animate-fadeIn">
            <h3 className="text-xl font-semibold text-slate-300 mb-4 text-center">Available Qualities:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableThumbnails.map((thumb) => (
                <button
                  key={thumb.key}
                  onClick={() => handleThumbnailSelect(thumb)}
                  className={`p-2 rounded-lg border-2 bg-slate-700/50 hover:border-sky-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${selectedThumbnail?.key === thumb.key ? 'thumbnail-item-selected border-sky-500' : 'border-slate-600'}`}
                  aria-label={`Select ${thumb.label} (${thumb.dimensions})`}
                  title={`${thumb.label} (${thumb.dimensions})`}
                >
                  <img
                    src={thumb.url}
                    alt={`${thumb.label} thumbnail`}
                    className="w-full h-auto object-cover rounded-md aspect-video bg-slate-600" // aspect-video for 16:9
                    loading="lazy"
                  />
                  <p className="text-xs text-slate-300 mt-2 text-center truncate">{thumb.label}</p>
                  <p className="text-xs text-slate-400 text-center">({thumb.dimensions})</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="text-center mt-12 pb-6">
        <p className="text-slate-500 text-sm">
          Crafted with React & Tailwind CSS.
        </p>
      </footer>
    </div>
  );
};

export default App;
