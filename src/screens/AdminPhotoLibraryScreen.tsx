import { useEffect, useState } from 'react';
import SupabaseService from '../services/SupabaseService';

type PhotoLibraryItem = {
  id: string;
  eventName?: string | null;
  submittedAt?: string | null;
  fileName: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
};

const AdminPhotoLibraryScreen = () => {
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortEnabled, setSortEnabled] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await SupabaseService.getProofPhotoLibrary();
      const photosWithFaces = await filterPhotosWithFaces(results);
      setPhotos(photosWithFaces);
    } catch (err: any) {
      console.error('Failed to load proof photo library:', err);
      setError(err?.message || 'Failed to load proof photo library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sortPhotos = (list: PhotoLibraryItem[]) => {
    return [...list].sort((a, b) => {
      const aEvent = (a.eventName || '').toLowerCase();
      const bEvent = (b.eventName || '').toLowerCase();

      if (aEvent && bEvent && aEvent !== bEvent) {
        return aEvent.localeCompare(bEvent);
      }

      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;

      return aTime - bTime;
    });
  };

  const buildSections = (list: PhotoLibraryItem[]) => {
    const sections: {
      eventName: string;
      groups: {
        dateLabel: string;
        items: PhotoLibraryItem[];
      }[];
    }[] = [];

    const byEvent = new Map<string, PhotoLibraryItem[]>();

    list.forEach((photo) => {
      const key = (photo.eventName || 'Unknown Event').trim() || 'Unknown Event';
      if (!byEvent.has(key)) {
        byEvent.set(key, []);
      }
      byEvent.get(key)!.push(photo);
    });

    const sortedEventNames = Array.from(byEvent.keys()).sort((a, b) => a.localeCompare(b));

    for (const eventName of sortedEventNames) {
      const items = byEvent.get(eventName) || [];
      const groupsByDate = new Map<string, PhotoLibraryItem[]>();

      items.forEach((photo) => {
        let label = 'Unknown Date/Time';
        if (photo.submittedAt) {
          const d = new Date(photo.submittedAt);
          if (!Number.isNaN(d.getTime())) {
            label = d.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
          }
        }

        if (!groupsByDate.has(label)) {
          groupsByDate.set(label, []);
        }
        groupsByDate.get(label)!.push(photo);
      });

      const groupsArray = Array.from(groupsByDate.entries()).map(([dateLabel, itemsForDate]) => ({
        dateLabel,
        items: itemsForDate
      }));

      sections.push({
        eventName,
        groups: groupsArray
      });
    }

    return sections;
  };

  const filterPhotosWithFaces = async (allPhotos: PhotoLibraryItem[]) => {
    // Use the browser Shape Detection API if available; otherwise, fall back to all photos.
    const FaceDetectorCtor = (window as any).FaceDetector;

    if (!FaceDetectorCtor) {
      console.warn('FaceDetector API not available in this browser; showing all photos.');
      return allPhotos;
    }

    try {
      const detector = new FaceDetectorCtor({
        fastMode: true,
        maxDetectedFaces: 1
      });

      const result: PhotoLibraryItem[] = [];

      for (const photo of allPhotos) {
        const hasFace = await detectFaceInImage(detector, photo.dataUrl);
        if (hasFace) {
          result.push(photo);
        }
      }

      return result;
    } catch (err) {
      console.error('Error during face detection; showing all photos instead.', err);
      return allPhotos;
    }
  };

  const detectFaceInImage = (detector: any, src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const faces = await detector.detect(img);
          resolve(Array.isArray(faces) && faces.length > 0);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
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
          <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-300">
            <span className="opacity-70">
              Showing up to 200 most recent photos with detected faces (if supported).
            </span>
            <button
              onClick={() => setSortEnabled((prev) => !prev)}
              className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-200 bg-black/60 hover:bg-gray-800 transition-colors"
            >
              {sortEnabled ? 'Sorting: Event + Time' : 'Sorting: Original Order'}
            </button>
          </div>
          {buildSections((sortEnabled ? sortPhotos(photos) : photos).slice(0, 200)).map(
            (section) => (
              <div key={section.eventName} className="mb-6">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-200 bg-black">
                  {section.eventName}
                </div>
                {section.groups.map((group) => (
                  <div key={`${section.eventName}-${group.dateLabel}`} className="mb-4">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 bg-black/90 border-t border-b border-gray-800">
                      {group.dateLabel}
                    </div>
                    <div className="grid gap-px bg-black grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                      {group.items.map((photo) => (
                        <div key={photo.id} className="bg-black">
                    <img
                      src={photo.dataUrl}
                      alt={photo.fileName}
                            className="w-full h-40 md:h-44 lg:h-48 object-cover block"
                      loading="lazy"
                    />
                      </div>
                      ))}
                    </div>
                  </div>
                ))}
                </div>
            )
        )}
      </div>
      )}
    </div>
  );
};

export default AdminPhotoLibraryScreen;


