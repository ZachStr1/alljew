import { useState, useEffect } from 'react';
import tzlookup from 'tz-lookup';

interface Coords {
  latitude: number;
  longitude: number;
}

interface TefillaWindow {
  name: string;
  emoji: string;
  status: 'past' | 'current' | 'upcoming';
  timeRange: string;
  description: string;
  startTime?: Date;
  endTime?: Date;
}

interface DaveningData {
  currentTefilla: string | null; // e.g., "Shacharit" or "Mincha"
  tefillaWindows: TefillaWindow[];
  tzid: string | null;
  isLoading: boolean;
  hebrewDate: string | null;
}

export function useDaveningData(coords: Coords | null): DaveningData {
  const [data, setData] = useState<DaveningData>({
    currentTefilla: null,
    tefillaWindows: [],
    tzid: null,
    isLoading: true,
    hebrewDate: null,
  });

  useEffect(() => {
    if (!coords) {
      setData({
        currentTefilla: null,
        tefillaWindows: [],
        tzid: null,
        isLoading: false,
        hebrewDate: null,
      });
      return;
    }

    fetchDaveningData();

    async function fetchDaveningData() {
      setData(prev => ({ ...prev, isLoading: true }));

      try {
        const tzid = tzlookup(coords!.latitude, coords!.longitude);
        
        // Fetch zmanim
        const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&latitude=${coords!.latitude}&longitude=${coords!.longitude}&tzid=${encodeURIComponent(tzid)}`;
        const zmanimRes = await fetch(zmanimUrl);
        const zmanimJson = await zmanimRes.json();

        // Get Hebrew date
        const civilDateInTz = new Date().toLocaleDateString('en-CA', { 
          timeZone: tzid 
        });
        const tzeitStr = zmanimJson.times.tzeit || zmanimJson.times.sunset;
        const tzeitDate = new Date(tzeitStr);
        const afterTzeit = new Date() > tzeitDate;
        const useGs = afterTzeit ? '&gs=on' : '';
        
        const converterUrl = `https://www.hebcal.com/converter?cfg=json&date=${civilDateInTz}&g2h=1${useGs}`;
        const converterRes = await fetch(converterUrl);
        const converterJson = await converterRes.json();
        const hebrewDate = `${converterJson.hebrew} ${converterJson.hy}`;

        const now = new Date();

        // Helper to parse time and determine status
        const parseTime = (timeStr: string | undefined): Date | null => {
          if (!timeStr) return null;
          return new Date(timeStr);
        };

        const formatTime = (date: Date | null): string => {
          if (!date) return 'N/A';
          return date.toLocaleString('en-US', {
            timeZone: tzid,
            hour: 'numeric',
            minute: '2-digit',
          });
        };

        const getStatus = (start: Date | null, end: Date | null): 'past' | 'current' | 'upcoming' => {
          if (!start || !end) return 'upcoming';
          if (now < start) return 'upcoming';
          if (now >= start && now <= end) return 'current';
          return 'past';
        };

        // Build tefilla windows
        const alotHaShachar = parseTime(zmanimJson.times.alotHaShachar);
        const sunrise = parseTime(zmanimJson.times.sunrise);
        const sofZmanShma = parseTime(zmanimJson.times.sofZmanShma);
        const sofZmanTfilla = parseTime(zmanimJson.times.sofZmanTfilla);
        const chatzot = parseTime(zmanimJson.times.chatzot);
        const minchaGedola = parseTime(zmanimJson.times.minchaGedola);
        const minchaKetana = parseTime(zmanimJson.times.minchaKetana);
        const plagHaMincha = parseTime(zmanimJson.times.plagHaMincha);
        const sunset = parseTime(zmanimJson.times.sunset);
        const tzeit = parseTime(zmanimJson.times.tzeit);

        const tefillaWindows: TefillaWindow[] = [];

        // Shacharit (from Alot HaShachar to Chatzot)
        if (alotHaShachar && chatzot) {
          tefillaWindows.push({
            name: 'Shacharit',
            emoji: '🌅',
            status: getStatus(alotHaShachar, chatzot),
            timeRange: `${formatTime(alotHaShachar)} - ${formatTime(chatzot)}`,
            description: 'Morning prayers. Shema by ' + formatTime(sofZmanShma),
            startTime: alotHaShachar,
            endTime: chatzot,
          });
        }

        // Mincha (from Mincha Gedola to Sunset)
        if (minchaGedola && sunset) {
          tefillaWindows.push({
            name: 'Mincha',
            emoji: '☀️',
            status: getStatus(minchaGedola, sunset),
            timeRange: `${formatTime(minchaGedola)} - ${formatTime(sunset)}`,
            description: 'Afternoon prayers. Preferably after Mincha Ketana (' + formatTime(minchaKetana) + ')',
            startTime: minchaGedola,
            endTime: sunset,
          });
        }

        // Maariv (from Tzeit onward - no real end, but we'll use next Alot as proxy)
        if (tzeit) {
          // For display purposes, show as "from tzeit" with no end time shown
          tefillaWindows.push({
            name: 'Maariv',
            emoji: '🌙',
            status: getStatus(tzeit, null),
            timeRange: `From ${formatTime(tzeit)}`,
            description: 'Evening prayers after nightfall',
            startTime: tzeit,
            endTime: undefined,
          });
        }

        // Determine current tefilla
        let currentTefilla: string | null = null;
        for (const window of tefillaWindows) {
          if (window.status === 'current') {
            currentTefilla = window.name;
            break;
          }
        }

        // If no current tefilla but we're between sunset and tzeit, it's a transition period
        if (!currentTefilla && sunset && tzeit && now >= sunset && now < tzeit) {
          currentTefilla = 'Transition (Sunset to Tzeit)';
        }

        setData({
          currentTefilla,
          tefillaWindows,
          tzid,
          isLoading: false,
          hebrewDate,
        });

      } catch (err) {
        console.error('Error fetching davening data:', err);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [coords]);

  return data;
}