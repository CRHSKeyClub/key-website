import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import SupabaseService from '../services/SupabaseService';

type PhotoLibraryItem = {
  id: string;
  studentName?: string | null;
  studentNumber?: string | null;
  eventName?: string | null;
  eventDate?: string | null;
  status?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  hoursRequested?: number | null;
  fileName: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
};

const statusFilters = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

const AdminPhotoLibraryScreen = () => {
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await SupabaseService.getProofPhotoLibrary();
      setPhotos(results);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Failed to load proof photo library:', err);
      setError(err?.message || 'Failed to load proof photo library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPhotos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return photos.filter((photo) => {
      if (statusFilter !== 'all' && photo.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const fieldsToSearch = [
        photo.studentName,
        photo.studentNumber,
        photo.eventName,
        photo.eventDate,
        photo.status
      ]
        .filter(Boolean)
        .map((value) => value!.toString().toLowerCase());

      return fieldsToSearch.some((value) => value.includes(normalizedSearch));
    });
  }, [photos, statusFilter, searchTerm]);

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPhotos.map((photo) => photo.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const downloadSinglePhoto = (photo: PhotoLibraryItem) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelectedPhotos = async () => {
    if (!selectedIds.size) return;

    try {
      setIsDownloading(true);
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      filteredPhotos
        .filter((photo) => selectedIds.has(photo.id))
        .forEach((photo) => {
          zip.file(photo.fileName, photo.base64Data, { base64: true });
        });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proof-photos-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download selected photos:', err);
      setError('Failed to download selected photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Proof Photo Library</h1>
            <p className="text-gray-300 mt-2">
              Browse, filter, and download proof photos submitted with hour requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadPhotos}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={downloadSelectedPhotos}
              disabled={!selectedIds.size || isDownloading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !selectedIds.size || isDownloading
                  ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isDownloading ? 'Preparing Zip…' : `Download Selected (${selectedIds.size})`}
            </button>
          </div>
        </header>

        <section className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student, S-number, event, or status"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-gray-100 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-red-500/60 bg-red-500/10 text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-label="Loading"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="py-24 text-center text-gray-400 border border-dashed border-slate-700 rounded-2xl bg-slate-800/40">
            No proof photos match your filters yet. Try adjusting your search or check back later.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={`rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected ? 'border-blue-500 bg-slate-800/80 shadow-lg shadow-blue-900/40' : 'border-slate-700 bg-slate-800/40 hover:border-blue-400/60'
                  }`}
                  onClick={() => toggleSelect(photo.id)}
                >
                  <div className="relative">
                    <img
                      src={photo.dataUrl}
                      alt={photo.fileName}
                      className="w-full h-56 object-cover rounded-t-2xl"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-300' : 'bg-slate-900/70 border-slate-500'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadSinglePhoto(photo);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 text-sm bg-slate-900/80 hover:bg-slate-900 rounded-lg border border-slate-700 text-gray-200 transition-colors"
                    >
                      Download
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-blue-300 mb-1">
                        {photo.status ? photo.status.toUpperCase() : 'UNKNOWN'}
                      </p>
                      <h3 className="text-lg font-semibold text-white truncate">{photo.eventName || 'Unnamed Event'}</h3>
                      <p className="text-sm text-gray-300">
                        {photo.studentName || 'Unknown Student'} • {photo.studentNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Submitted: {formatDate(photo.submittedAt)}</p>
                      {photo.reviewedAt && <p>Reviewed: {formatDate(photo.reviewedAt)}</p>}
                      {photo.hoursRequested != null && (
                        <p>Hours Requested: {photo.hoursRequested}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{photo.fileName}</span>
                      <span>{photo.mimeType}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPhotoLibraryScreen;


