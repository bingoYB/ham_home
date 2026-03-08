import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useRelativeTime(timestamp: number | undefined): string {
  const { i18n } = useTranslation();
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('');
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const diffInMs = timestamp - now;
      const diffInSeconds = Math.round(diffInMs / 1000);
      
      const rtf = new Intl.RelativeTimeFormat(i18n.language || navigator.language, { numeric: 'auto', style: 'long' });
      
      const absDiff = Math.abs(diffInSeconds);
      if (absDiff < 60) {
        // Less than 1 minute
        setRelativeTime(rtf.format(diffInSeconds, 'second'));
        return;
      }
      
      const diffInMinutes = Math.round(diffInSeconds / 60);
      if (Math.abs(diffInMinutes) < 60) {
        // Less than 1 hour
        setRelativeTime(rtf.format(diffInMinutes, 'minute'));
        return;
      }
      
      const diffInHours = Math.round(diffInMinutes / 60);
      if (Math.abs(diffInHours) < 24) {
        // Less than 1 day
        setRelativeTime(rtf.format(diffInHours, 'hour'));
        return;
      }
      
      const diffInDays = Math.round(diffInHours / 24);
      if (Math.abs(diffInDays) < 30) {
        // Less than 1 month
        setRelativeTime(rtf.format(diffInDays, 'day'));
        return;
      }
      
      const diffInMonths = Math.round(diffInDays / 30);
      if (Math.abs(diffInMonths) < 12) {
        // Less than 1 year
        setRelativeTime(rtf.format(diffInMonths, 'month'));
        return;
      }
      
      const diffInYears = Math.round(diffInDays / 365);
      setRelativeTime(rtf.format(diffInYears, 'year'));
    };

    updateTime();
    
    // Update every 30 seconds to keep the relative time fresh
    const intervalId = setInterval(updateTime, 30000);
    
    return () => clearInterval(intervalId);
  }, [timestamp, i18n.language]);

  return relativeTime;
}
