import { motion } from 'framer-motion';
import { UploadCloud, FolderPlus, Images } from 'lucide-react';
import Button from '@/components/ui/Button';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const photos = [
  {
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80',
    rotate: -8,
    className: 'top-0 left-4 z-10',
  },
  {
    src: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=500&q=80',
    rotate: 5,
    className: 'top-10 right-0 z-20',
  },
  {
    src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=500&q=80',
    rotate: -3,
    className: 'top-40 left-16 z-30',
  },
];

function Hero() {
  return (
    <section className="container-page flex flex-col items-center gap-16 pb-24 pt-16 lg:flex-row lg:items-center lg:gap-12 lg:pt-24">
      {/* Left: text content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col items-center text-center lg:w-1/2 lg:items-start lg:text-left"
      >
        <motion.span
          variants={itemVariants}
          className="mb-5 inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-coral-600 shadow-glass"
        >
          Shared albums for real-life moments
        </motion.span>

        <motion.h1
          variants={itemVariants}
          className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
        >
          Keep Every Memory Together.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-6 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg"
        >
          Never ask your friends to send photos again. Create a room, invite
          everyone, upload memories, and download them anytime.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
        >
          <Button variant="primary" size="lg" icon={<UploadCloud size={20} />}>
            Upload Memories
          </Button>
          <Button variant="outline" size="lg" icon={<FolderPlus size={20} />}>
            Create Room
          </Button>
          <Button variant="ghost" size="lg" icon={<Images size={20} />}>
            Your Memora
          </Button>
        </motion.div>
      </motion.div>

      {/* Right: signature polaroid stack visual */}
      <div className="relative h-80 w-full max-w-md lg:h-96 lg:w-1/2">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.src}
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: photo.rotate }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
            whileHover={{ scale: 1.05, rotate: 0, zIndex: 40 }}
            className={`absolute w-48 rounded-2xl bg-white p-2 shadow-polaroid sm:w-56 ${photo.className}`}
          >
            <img
              src={photo.src}
              alt="Shared memory"
              className="h-40 w-full rounded-xl object-cover sm:h-48"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default Hero;