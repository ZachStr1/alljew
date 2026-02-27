import { useState, useEffect } from 'react';
import tzlookup from 'tz-lookup';

interface Coords {
  latitude: number;
  longitude: number;
}

interface ShabbatData {
  candleLighting: {
    time: string; // Formatted display time
    date: Date;   // For countdown calculation
  } | null;
  havdalah: {
    time: string;
    date: Date;
  } | null;
  parsha: string | null;
  yomTov: string | null;
  tzid: string | null;
  isLoading: boolean;
  // Countdown state
  isShabbat: boolean; // Are we currently in Shabbat?
  countdownTarget: 'candles' | 'havdalah' | null;
  timeUntilTarget: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null;
}

export function useShabbatData(coords: Coords | null): ShabbatData {
  const [data, setData] = useState<ShabbatData>({
    candleLighting: null,
    havdalah: null,
    parsha: null,
    yomTov: null,
    tzid: null,
    isLoading: true,
    isShabbat: false,
    countdownTarget: null,
    timeUntilTarget: null,
  });

  // Fetch Shabbat data when coords change
  useEffect(() => {
    if (!coords) {
      setData({
        candleLighting: null,
        havdalah: null,
        parsha: null,
        yomTov: null,
        tzid: null,
        isLoading: false,
        isShabbat: false,
        countdownTarget: null,
        timeUntilTarget: null,
      });
      return;
    }

    fetchShabbatData();

    async function fetchShabbatData() {
      setData(prev => ({ ...prev, isLoading: true }));

      try {
        const tzid = tzlookup(coords!.latitude, coords!.longitude);
        
        const shabbatUrl = `https://www.hebcal.com/shabbat?cfg=json&latitude=${coords!.latitude}&longitude=${coords!.longitude}&tzid=${encodeURIComponent(tzid)}`;
        const response = await fetch(shabbatUrl);
        const json = await response.json();

        let candleLighting = null;
        let havdalah = null;
        let parsha = null;
        let yomTov = null;

        for (const item of json.items || []) {
          if (item.category === 'candles') {
            const candleDate = new Date(item.date);
            const time = candleDate.toLocaleString('en-US', {
              timeZone: tzid,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            candleLighting = { time, date: candleDate };
          }

          if (item.category === 'havdalah') {
            const havdalahDate = new Date(item.date);
            const time = havdalahDate.toLocaleString('en-US', {
              timeZone: tzid,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            havdalah = { time, date: havdalahDate };
          }

          if (item.category === 'parashat') {
            parsha = item.title.replace('Parashat ', '');
          }

          if (item.category === 'holiday' && item.yomtov === true) {
            yomTov = item.title;
          }
        }

        // Determine current state
        const now = new Date();
        const isShabbat = candleLighting && havdalah && now >= candleLighting.date && now < havdalah.date;
        const countdownTarget = isShabbat ? 'havdalah' : 'candles';

        setData({
          candleLighting,
          havdalah,
          parsha,
          yomTov,
          tzid,
          isLoading: false,
          isShabbat: isShabbat || false,
          countdownTarget,
          timeUntilTarget: null, // Will be calculated by countdown interval
        });

      } catch (err) {
        console.error('Error fetching Shabbat data:', err);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [coords]);

  // Countdown timer - runs every second
  useEffect(() => {
    if (!data.candleLighting && !data.havdalah) return;

    const interval = setInterval(() => {
      const now = new Date();
      const targetDate = data.isShabbat ? data.havdalah?.date : data.candleLighting?.date;
      
      if (!targetDate) return;

      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        // Time has passed, refetch data
        setData(prev => ({ ...prev, timeUntilTarget: null }));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setData(prev => ({
        ...prev,
        timeUntilTarget: { days, hours, minutes, seconds },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [data.candleLighting, data.havdalah, data.isShabbat]);

  return data;
}