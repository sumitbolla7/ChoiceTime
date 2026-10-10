const NewsTicker = () => {
  const marqueeContent = "◆ FREE SHIPPING ON ORDERS OVER ₹4000 ◆ | ● NEW ARRIVALS EVERY WEEK ●";

  return (
    <>
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
        `}
      </style>
      <div className="overflow-hidden bg-black text-white py-2.5">
        <div className="flex w-max items-center whitespace-nowrap animate-marquee">
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className="shrink-0 text-sm font-medium tracking-wider px-8"
              aria-hidden={index > 0}
            >
              {marqueeContent}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default NewsTicker;
