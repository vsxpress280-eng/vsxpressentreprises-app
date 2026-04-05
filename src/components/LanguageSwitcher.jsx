import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LanguageSwitcher = ({ className }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  const languages = [
    { code: "fr", label: t("common.french"), flag: "🇫🇷" },
    { code: "es", label: t("common.spanish"), flag: "🇪🇸" },
    { code: "ht", label: t("common.haitian"), flag: "🇭🇹" },
  ];

  // Determine current value, defaulting to 'fr' if current language isn't supported
  const currentValue = ["fr", "es", "ht"].includes(i18n.language) ? i18n.language : "fr";

  return (
    <Select value={currentValue} onValueChange={changeLanguage}>
      <SelectTrigger className={cn("w-[160px] bg-[#0B0B0B] border-[#2A2A2A] text-white hover:bg-[#1E1E1E] transition-colors", className)}>
        <SelectValue placeholder={t("common.language")} />
      </SelectTrigger>
      <SelectContent className="bg-[#0B0B0B] border-[#2A2A2A] text-white">
        {languages.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code} 
            className="focus:bg-[#1E1E1E] focus:text-white cursor-pointer data-[state=checked]:text-[#D4AF37]"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;