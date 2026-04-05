import React from 'react';
import { motion } from 'framer-motion';

const NotificationBadge = ({ count }) => {
  if (!count) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-[#0f1012]"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
};

export default NotificationBadge;