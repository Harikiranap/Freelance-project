import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full mb-4"
      />
      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, yoyo: Infinity }}
        className="text-lg font-semibold text-slate-600"
      >
        Loading WorkSphere...
      </motion.h2>
    </div>
  );
}
