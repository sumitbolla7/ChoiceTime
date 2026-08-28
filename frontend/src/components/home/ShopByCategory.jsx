import { Link } from 'react-router-dom';

const categories = [
  { label: "Men's Watches", path: '/mens-watches', image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=600&auto=format&fit=crop' },
  { label: "Women's Watches", path: '/womens-watches', image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=600&auto=format&fit=crop' },
  { label: 'Sunglasses', path: '/sunglasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop' },
  { label: "Men's Belt", path: '/mens-belts', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=600&auto=format&fit=crop' },
  { label: 'Mens Wallet', path: '/mens-wallet', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop' },
  { label: "Men's Perfumes", path: '/mens-perfumes', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop' },
  { label: 'Accesories', path: '/accessories', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop' },
  { label: "Women's Perfumes", path: '/womens-perfumes', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop' },
  { label: 'Offline Store Videos', path: '/reels', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop', isVideoTag: true }
];

const ShopByCategory = () => {
  return (
    <section className="pt-10 md:pt-14 pb-4 md:pb-6 bg-brown-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase tracking-widest">
            Shop By Category
          </h2>
          <p className="mt-1.5 text-xs md:text-base text-gray-600">
            Explore trending picks & store highlights
          </p>
          <div className="mt-2.5 mx-auto w-14 h-0.5 bg-gray-800 rounded-full"></div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-2.5 sm:gap-4 md:gap-5">
          {categories.map((cat, idx) => (
            <Link
              key={cat.path}
              to={cat.path}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative w-full aspect-[4/4.8] rounded-xl sm:rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm group-hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading={idx < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                {cat.isVideoTag && (
                  <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-white p-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider bg-red-600 px-1.5 py-0.5 rounded shadow">
                      Watch Reels
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <h3 className="mt-2 text-[11px] sm:text-xs md:text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors leading-tight">
                {cat.label}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopByCategory;
