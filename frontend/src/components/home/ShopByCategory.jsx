import { Link } from 'react-router-dom';

const categories = [
  { label: "Men's Watches", path: '/mens-watches', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop' },
  { label: "Women's Watches", path: '/womens-watches', image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=600&auto=format&fit=crop' },
  { label: 'Sunglasses', path: '/sunglasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop' },
  { label: "Men's Belt", path: '/mens-belts', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=600&auto=format&fit=crop' },
  { label: 'Mens Wallet', path: '/mens-wallet', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop' },
  { label: "Men's Perfumes", path: '/mens-perfumes', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop' },
  { label: 'Accesories', path: '/accessories', image: 'https://images.unsplash.com/photo-1611591475281-22920253457a?q=80&w=600&auto=format&fit=crop' },
  { label: "Women's Perfumes", path: '/womens-perfumes', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop' }
];

const ShopByCategory = () => {
  return (
    <section className="pt-12 md:pt-16 pb-3 md:pb-5 bg-brown-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-11">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase tracking-widest">
            Shop By Category
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Explore trending picks for every style
          </p>
          <div className="mt-3 mx-auto w-14 h-0.5 bg-gray-800 rounded-full"></div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-4 sm:gap-5 md:gap-6">
          {categories.map((cat, idx) => (
            <Link
              key={cat.path}
              to={cat.path}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative w-full max-w-[180px] aspect-[4/4.6] rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading={idx < 2 ? 'eager' : 'lazy'}
                  fetchPriority={idx < 2 ? 'high' : 'auto'}
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <h3 className="mt-3 text-xs sm:text-sm md:text-base font-semibold text-gray-700 group-hover:text-gray-900 transition-colors leading-tight tracking-wide">
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
