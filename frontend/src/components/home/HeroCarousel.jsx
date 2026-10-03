import { Link } from 'react-router-dom';

const HERO_BANNER = 'https://i.ibb.co/V0cYzc91/Whats-App-Image-2026-10-03-at-8-07-13-PM.jpg';

const HeroCarousel = () => (
  <div className="relative w-full pt-0 md:pt-0" style={{ backgroundColor: '#000' }}>
    <Link to="/" className="block">
      <img
        src={HERO_BANNER}
        alt="ChoiceTime Banner"
        className="w-full block select-none"
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
          maxHeight: '420px',
          display: 'block',
        }}
        draggable={false}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </Link>
  </div>
);

export default HeroCarousel;
