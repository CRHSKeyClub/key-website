import { useEffect, useState } from 'react';
import SupabaseService from '../services/SupabaseService';

type PhotoLibraryItem = {
  id: string;
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
      setPhotos(results);
    } catch (err: any) {
      console.error('Failed to load proof photo library:', err);
      setError(err?.message || 'Failed to load proof photo library. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          <div className="grid gap-px bg-black grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {photos.map((photo) => (
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
      )}
    </div>
  );
};

export default AdminPhotoLibraryScreen;


