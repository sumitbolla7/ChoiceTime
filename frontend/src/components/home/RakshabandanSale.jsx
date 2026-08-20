import { Link } from 'react-router-dom';

// Replace this URL with your Raksha Bandan image
const RAKSHA_BANDAN_IMAGE = 'https://ik.imagekit.io/pyd0fawt1/raksha-bandan-sale?updatedAt=YOUR_TIMESTAMP';

const RakshabandanSale = () => (
  <div className="relative w-full overflow-hidden bg-brown-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 md:py-6">
      <Link to="/" className="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <img
          src={RAKSHA_BANDAN_IMAGE}
          alt="Raksha Bandan Sale"
          className="w-full h-auto object-cover block select-none"
          style={{ maxHeight: '300px' }}
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      </Link>
    </div>
  </div>
);

export default RakshabandanSale;
