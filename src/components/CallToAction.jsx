import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from "react-i18next";

const CallToAction = () => {
  const { t } = useTranslation();
  return (
    <motion.h1
      className='text-xl font-bold text-white leading-8 w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {t("common.welcomeChat", "Let's turn your ideas into reality")}
    </motion.h1>
  );
};

export default CallToAction;