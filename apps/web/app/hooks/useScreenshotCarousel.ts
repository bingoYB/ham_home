'use client';

import { useEffect, useState } from 'react';
import type { CarouselApi } from '@hamhome/ui';

interface ScreenshotCarouselState {
  current: number;
  count: number;
  setApi: (api: CarouselApi) => void;
  scrollTo: (index: number) => void;
}

export function useScreenshotCarousel(): ScreenshotCarouselState {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    const interval = window.setInterval(() => api.scrollNext(), 4000);
    return () => {
      window.clearInterval(interval);
      api.off('select', onSelect);
    };
  }, [api]);

  return { current, count, setApi, scrollTo: (index: number) => api?.scrollTo(index) };
}
