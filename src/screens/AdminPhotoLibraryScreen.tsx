import { useEffect, useState } from 'react';
import { Card } from 'react-bits';
import SupabaseService from '../services/SupabaseService';

type PhotoLibraryItem = {
  id: string;
  eventName?: string | null;
  submittedAt?: string | null;
  studentName?: string | null;
  studentNumber?: string | null;
  description?: string | null;
  fileName: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
};

const AdminPhotoLibraryScreen = () => {
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await SupabaseService.getProofPhotoLibrary();
      // Sort by submittedAt descending (newest first) to mimic Photos app
      const sorted = [...results].sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      });
      setPhotos(sorted);
    } catch (err: any) {
      console.error('Failed to load proof photo library:', err);
      setError(err?.message || 'Failed to load proof photo library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const buildDateSections = (list: PhotoLibraryItem[]) => {
    const byDay = new Map<
      string,
      {
        label: string;
        items: PhotoLibraryItem[];
        sortKey: number;
      }
    >();

    list.forEach((photo) => {
      const date = photo.submittedAt ? new Date(photo.submittedAt) : null;
      if (!date || Number.isNaN(date.getTime())) {
        const key = 'unknown';
        if (!byDay.has(key)) {
          byDay.set(key, {
            label: 'Unknown Date',
            items: [],
            sortKey: 0
          });
        }
        byDay.get(key)!.items.push(photo);
        return;
      }

      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!byDay.has(dayKey)) {
        const label = date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        byDay.set(dayKey, {
          label,
          items: [],
          sortKey: date.getTime()
        });
      }
      byDay.get(dayKey)!.items.push(photo);
    });

    // Sort sections by sortKey descending (newest day first)
    return Array.from(byDay.values()).sort((a, b) => b.sortKey - a.sortKey);
  };

  return (
    <div className="min-h-screen bg-black">
      {error && (
        <div className="px-4 py-3 text-sm text-red-200 bg-red-900">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
          ></div>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-white">
          No proof photos yet.
        </div>
      ) : (
        <div className="p-px bg-black">
          {buildDateSections(photos).map((section) => (
            <div key={section.label} className="mb-6">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-200 bg-black">
                {section.label}
              </div>
              <div className="grid gap-px bg-black grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {section.items.map((photo) => (
                  <Card
                    key={photo.id}
                    className="bg-black group relative overflow-hidden cursor-pointer rounded-none"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.fileName}
                      className="w-full h-32 sm:h-36 md:h-40 object-cover block"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-end">
                      <div className="w-full p-2 sm:p-3 text-[10px] sm:text-xs text-white space-y-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                        <div className="font-semibold truncate">
                          {photo.studentName || 'Unknown Student'}
                          {photo.studentNumber ? ` • ${photo.studentNumber}` : ''}
                        </div>
                        {photo.eventName && (
                          <div className="uppercase tracking-wide text-[9px] text-gray-300 truncate">
                            {photo.eventName}
                          </div>
                        )}
                        {photo.description && (
                          <div className="text-[9px] sm:text-[10px] text-gray-200 line-clamp-3">
                            {photo.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPhotoLibraryScreen;


