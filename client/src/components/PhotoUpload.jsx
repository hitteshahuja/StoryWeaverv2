import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import exifr from 'exifr';
import { uploadAPI } from '../lib/api';

export default function PhotoUpload({ onUpload, currentCount = 0 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setError('');

    if (rejectedFiles.length > 0) {
      setError('Some files were rejected. Ensure they are images under 5MB.');
      return;
    }

    if (currentCount + acceptedFiles.length > 12) {
      setError('You can only upload up to 12 images for your book.');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        let locationStr = '';
        try {
          const gps = await exifr.gps(file);
          if (gps && gps.latitude && gps.longitude) {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gps.latitude}&longitude=${gps.longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data.city && data.countryName) locationStr = `${data.city}, ${data.countryName}`;
            else if (data.locality) locationStr = data.locality;
          }
        } catch (exifErr) {
          console.warn('Could not read EXIF data', exifErr);
        }

        const { url } = await uploadAPI.upload(file);
        return { url, location: locationStr, id: Math.random().toString(36).substr(2, 9) };
      });

      const results = await Promise.all(uploadPromises);
      onUpload(results);
    } catch (err) {
      setError('Some uploads failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onUpload, currentCount]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
    maxFiles: 12 - currentCount
  });

  // clearPhoto is removed as each image will have its own delete in Storyboard


  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
                    overflow-hidden min-h-[200px] flex items-center justify-center
                    ${isDragActive ? 'border-dream-500 dark:border-dream-400 bg-dream-50 dark:bg-dream-500/10 scale-[1.01]' : 'border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:border-dream-500 dark:hover:border-dream-500/50 hover:bg-gray-100 dark:hover:bg-white/5'}
                    ${error ? 'border-red-500/50' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-10 h-10 text-dream-500 animate-spin" />
            <span className="text-sm font-medium text-gray-600 dark:text-dream-200">Processing images...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8 px-6 text-center">
            <div className="p-4 rounded-2xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
              {isDragActive
                ? <ImageIcon className="w-10 h-10 text-dream-600 dark:text-dream-300" />
                : <Upload className="w-10 h-10 text-dream-500 dark:text-dream-400" />
              }
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-white/80">
                {isDragActive ? 'Drop them here!' : currentCount > 0 ? 'Add more photos' : 'Upload your photos'}
              </p>
              <p className="text-sm text-gray-500 dark:text-white/40 mt-1">
                Drag & drop up to {12 - currentCount} more images · JPG, PNG, WebP
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}
