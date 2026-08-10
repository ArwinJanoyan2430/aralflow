import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import image1 from "../assets/image1.png";
import image2 from "../assets/image2.png";
import image3 from "../assets/image3.png";
import image4 from "../assets/image4.png";

const images = [image1, image2, image3, image4];

function FloatingImages() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
      <motion.img
        src={images[currentImage]}
        alt={`Floating image ${currentImage + 1}`}
        animate={{
          y: [0, -10, 0, 10, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute h-65 w-65 rounded-2xl object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.18)] will-change-transform transition-transform duration-300 hover:scale-105 sm:h-72 sm:w-72"
      />
    </div>
  );
}

export default FloatingImages;
