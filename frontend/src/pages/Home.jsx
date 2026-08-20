// --- Home Page Section Components ---
import HeroCarousel from '../components/home/HeroCarousel';
import NewsTicker from '../components/home/NewsTicker';
import ShopByCategory from '../components/home/ShopByCategory';
import TrendingReels from '../components/home/TrendingReels';
import SubcategoryMarquee from '../components/home/SubcategoryMarquee';
import CategoryTopSellingSections from '../components/home/CategoryTopSellingSections';

// --- MAIN HOME COMPONENT ---
const Home = () => {
  return (
    <div className="min-h-screen bg-brown-50 font-sans text-brown-800">

      {/* Hero Banner Carousel */}
      <HeroCarousel />

      {/* Scrolling News Ticker */}
      <NewsTicker />

      {/* Shop By Category Grid */}
      <ShopByCategory />

      {/* Admin-managed reels — visible when at least one active reel exists */}
      <TrendingReels />

      {/* Explore Collections - Subcategory Marquee (Our Brands) */}
      <SubcategoryMarquee />

      {/* One row per category: real top sellers from orders; random until sales exist */}
      <CategoryTopSellingSections />

    </div>
  );
};

export default Home;
