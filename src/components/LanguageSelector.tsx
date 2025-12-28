import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { languages, type LanguageCode } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'default',
  className = '',
}) => {
  const { i18n } = useTranslation();

  const handleChange = (value: LanguageCode) => {
    i18n.changeLanguage(value);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  if (variant === 'compact') {
    return (
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger className={`w-16 ${className}`}>
          <span className="text-lg">{currentLang.flag}</span>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={i18n.language} onValueChange={handleChange}>
      <SelectTrigger className={`w-[180px] ${className}`}>
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{currentLang.flag}</span>
            <span>{currentLang.name}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
