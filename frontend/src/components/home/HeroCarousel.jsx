import { Link } from 'react-router-dom';

const RAKSHA_BANDHAN_BANNER = 'https://ik.imagekit.io/pyd0fawt1/raksha%20bandan%20sale%20banner.jpeg';

const HeroCarousel = () => (
  <div className="relative w-full overflow-hidden pt-0 md:pt-0">
    <Link to="/" className="block">
      <picture>
        <source media="(max-width: 767px)" srcSet={RAKSHA_BANDHAN_BANNER} />
        <img
          src={RAKSHA_BANDHAN_BANNER}
          alt="Raksha Bandhan Sale Banner"
          className="w-full h-auto object-cover block select-none"
          draggable={false}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </Link>
  </div>
);

export default HeroCarousel;
