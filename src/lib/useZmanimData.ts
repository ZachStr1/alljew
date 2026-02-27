import { useState, useEffect } from 'react';
import tzlookup from 'tz-lookup';

interface Coords {
  latitude: number;
  longitude: number;
}

interface ZmanItem {
  label: string;
  time: string; // Formatted time string
  rawTime: Date; // For sorting/comparison
}

interface ZmanimData {
  dawn: ZmanItem[];
  morning: ZmanItem[];
  afternoon: ZmanItem[];
  evening: ZmanItem[];
  tzid: string | null;
  lastUpdated: string | null;
  isLoading: boolean;
}

// Organized zmanim by category
const ZMANIM_CATEGORIES = {
  dawn: [
    { key: 'alotHaShachar', label: 'Alot HaShachar (Dawn)' },
    { key: 'misheyakir', label: 'Misheyakir' },
    { key: 'misheyakirMachmir', label: 'Misheyakir (Stringent)' },
  ],
  morning: [
    { key: 'sunrise', label: 'Sunrise (Netz HaChama)' },
    { key: 'sofZmanShma', label: 'Latest Shema (MGA)' },
    { key: 'sofZmanShmaMGA19Point8', label: 'Latest Shema (MGA 19.8°)' },
    { key: 'sofZmanShmaGRA', label: 'Latest Shema (GRA)' },
    { key: 'sofZmanTfilla', label: 'Latest Shacharit (MGA)' },
    { key: 'sofZmanTfillaGRA', label: 'Latest Shacharit (GRA)' },
  ],
  afternoon: [
    { key: 'chatzot', label: 'Chatzot (Midday)' },
    { key: 'minchaGedola', label: 'Mincha Gedola' },
    { key: 'minchaKetana', label: 'Mincha Ketana' },
    { key: 'plagHaMincha', label: 'Plag HaMincha' },
  ],
  evening: [
    { key: 'sunset', label: 'Sunset (Shkiah)' },
    { key: 'tzeit', label: 'Nightfall - 3 Stars (8.5°)' },
    { key: 'tzeit42min', label: 'Nightfall - 42 min' },
    { key: 'tzeit72min', label: 'Nightfall - 72 min (Rabbeinu Tam)' },
  ],
};

export function useZmanimData(coords: Coords | null): ZmanimData {
  const [data, setData] = useState<ZmanimData>({
    dawn: [],
    morning: [],
    afternoon: [],
    evening: [],
    tzid: null,
    lastUpdated: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!coords) {
      setData({
        dawn: [],
        morning: [],
        afternoon: [],
        evening: [],
        tzid: null,
        lastUpdated: null,
        isLoading: false,
      });
      return;
    }

    fetchZmanim();

    async function fetchZmanim() {
      setData(prev => ({ ...prev, isLoading: true }));
      
      try {
        const tzid = tzlookup(coords!.latitude, coords!.longitude);
        
        const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&latitude=${coords!.latitude}&longitude=${coords!.longitude}&tzid=${encodeURIComponent(tzid)}`;
        const response = await fetch(zmanimUrl);
        const json = await response.json();
        
        // Helper function to build category
        const buildCategory = (categoryKeys: typeof ZMANIM_CATEGORIES.dawn) => {
          return categoryKeys
            .map(({ key, label }) => {
              const timeStr = json.times[key];
              if (!timeStr) return null;
              
              const rawTime = new Date(timeStr);
              const time = rawTime.toLocaleString('en-US', {
                timeZone: tzid,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              
              return { label, time, rawTime };
            })
            .filter((item): item is ZmanItem => item !== null);
        };
        
        const lastUpdated = new Date().toLocaleString('en-US', {
          timeZone: tzid,
          dateStyle: 'short',
          timeStyle: 'short',
        });
        
        setData({
          dawn: buildCategory(ZMANIM_CATEGORIES.dawn),
          morning: buildCategory(ZMANIM_CATEGORIES.morning),
          afternoon: buildCategory(ZMANIM_CATEGORIES.afternoon),
          evening: buildCategory(ZMANIM_CATEGORIES.evening),
          tzid,
          lastUpdated,
          isLoading: false,
        });
        
      } catch (err) {
        console.error('Error fetching zmanim:', err);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [coords]);

  return data;
}