import React, { useState, useEffect } from 'react';
import { AdjustmentApi } from '@/api/AdjustmentApi';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const AdjustmentBadge = () => {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const pendingCount = await AdjustmentApi.getPendingCount();
    setCount(pendingCount);
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="inline-flex"
      >
        <Badge 
          className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white border-0 text-[10px]"
        >
          {count > 99 ? '99+' : count}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdjustmentBadge;