import { Link } from 'react-router-dom';
import { getLiveImageUrl, handleImageError } from '../../utils/imageFallback';

const HERO_BANNER = 'https://i.ibb.co/V0cYzc91/Whats-App-Image-2026-10-03-at-8-07-13-PM.jpg';

const HeroCarousel = () => (
  <div className="relative w-full overflow-hidden pt-0 md:pt-0">
    <Link to="/" className="block">
      <picture>
        <source media="(max-width: 767px)" srcSet={HERO_BANNER} />
        <img
          src={HERO_BANNER}
          alt="ChoiceTime Banner"
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
