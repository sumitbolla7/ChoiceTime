import { Link } from 'react-router-dom';

const DESKTOP_BANNER = 'https://ik.imagekit.io/l6od6mlo3j/static/pcbanner.png';
const MOBILE_BANNER = 'https://ik.imagekit.io/l6od6mlo3j/static/phone%20banner.png';

const HeroCarousel = () => (
  <div className="relative w-full overflow-hidden pt-24 md:pt-52">
    <Link to="/" className="block">
      <picture>
        <source media="(max-width: 767px)" srcSet={MOBILE_BANNER} />
        <img
          src={DESKTOP_BANNER}
          alt="Banner"
          className="w-full h-auto object-cover block select-none"
          style={{ maxHeight: '30vh' }}
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
