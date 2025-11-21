import { useEffect, useState } from 'react';
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

const PhotoCard = ({
  photo,
  onClick
}: {
  photo: PhotoLibraryItem;
  onClick?: () => void;
}) => {
  return (
    <div
      className="group relative overflow-hidden cursor-pointer rounded-xl border border-white/5 bg-slate-900/40 shadow-sm hover:shadow-md hover:border-white/20 transition-all duration-150"
      onClick={onClick}
    >
      <img
        src={photo.dataUrl}
        alt={photo.fileName}
        className="w-full h-32 sm:h-36 md:h-40 object-cover block"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end">
        <div className="w-full p-2 sm:p-3 text-[10px] sm:text-xs text-white space-y-1">
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
    </div>
  );
};

const AdminPhotoLibraryScreen = () => {
  const [photos, setPhotos] = useState<PhotoLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<PhotoLibraryItem | null>(null);

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

      const filtered = await filterPhotosWithFaces(sorted);
      setPhotos(filtered);
    } catch (err: any) {
      console.error('Failed to load proof photo library:', err);
      setError(err?.message || 'Failed to load proof photo library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stricter face filter: require at least one reasonably large face
  const filterPhotosWithFaces = async (allPhotos: PhotoLibraryItem[]) => {
    const FaceDetectorCtor = (window as any).FaceDetector;

    if (!FaceDetectorCtor) {
      console.warn('FaceDetector API not available; showing all photos.');
      return allPhotos;
    }

    try {
      const detector = new FaceDetectorCtor({
        fastMode: true,
        maxDetectedFaces: 3
      });

      const result: PhotoLibraryItem[] = [];
      for (const photo of allPhotos) {
        const hasStrongFace = await detectFaceInImage(detector, photo.dataUrl);
        if (hasStrongFace) {
          result.push(photo);
        }
      }
      return result;
    } catch (err) {
      console.error('Face detection failed; falling back to all photos.', err);
      return allPhotos;
    }
  };

  const detectFaceInImage = (detector: any, src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const faces = await detector.detect(img);
          if (!Array.isArray(faces) || faces.length === 0) {
            resolve(false);
            return;
          }

          const imgArea = img.naturalWidth * img.naturalHeight || 1;
          const minAreaRatio = 0.025; // at least 2.5% of the image area
          const minSize = 40; // minimum width/height in pixels

          const passes = faces.some((face: any) => {
            const box = face.boundingBox || face.boundingClientRect || face.box;
            if (!box) return false;

            const w = box.width ?? 0;
            const h = box.height ?? 0;
            if (w < minSize || h < minSize) return false;

            const areaRatio = (w * h) / imgArea;
            return areaRatio >= minAreaRatio;
          });

          resolve(passes);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
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
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onClick={() => setActivePhoto(photo)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setActivePhoto(null)}>
          <div className="flex items-start justify-end p-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActivePhoto(null);
              }}
              className="text-white/80 hover:text-white rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={activePhoto.dataUrl}
              alt={activePhoto.fileName}
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div
            className="border-t border-white/10 bg-black/95 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold">
              {activePhoto.studentName || 'Unknown Student'}
              {activePhoto.studentNumber ? ` • ${activePhoto.studentNumber}` : ''}
            </div>
            {activePhoto.eventName && (
              <div className="uppercase tracking-wide text-[11px] text-gray-300">
                {activePhoto.eventName}
              </div>
            )}
            {activePhoto.description && (
              <div className="text-gray-200 whitespace-pre-wrap">
                {activePhoto.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPhotoLibraryScreen;


