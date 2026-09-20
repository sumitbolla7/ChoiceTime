import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLiveImageUrl, handleImageError } from '../utils/imageFallback';

const ImageGallery = ({ images, isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || !images || images.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative max-w-7xl w-full h-full flex items-center justify-center px-4">
        <button
          onClick={prevImage}
          className="absolute left-4 text-white hover:text-gray-300 z-50"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <img
            src={getLiveImageUrl(images[currentIndex])}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain"
            onError={(e) => handleImageError(e, 800, 800)}
          />
        </div>

        <button
          onClick={nextImage}
          className="absolute right-4 text-white hover:text-gray-300 z-50"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-4xl overflow-x-auto px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                currentIndex === idx ? 'border-white' : 'border-gray-600'
              }`}
            >
              <img src={getLiveImageUrl(img)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" onError={handleImageError} />
            </button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default ImageGallery;

