import { useState, useEffect } from 'react';
import tzlookup from 'tz-lookup';

interface Coords {
  latitude: number;
  longitude: number;
}

interface HomeData {
  jewishDate: string | null;
  parsha: string | null;
  omer: string | null;
  nextUpLabel: string | null;
  nextUpTime: string | null;
  candleLighting: string | null;
  havdalah: string | null;
  
  // Holidays (Today + upcoming)
  todayHolidays: { title: string; hebrew?: string; category?: string; dateISO: string }[];
  upcomingHolidays: { title: string; hebrew?: string; category?: string; dateISO: string }[];

  // Debug info
  tzid: string | null;
  civilDate: string | null;
  afterTzeit: boolean;
  nowInTzid: string | null;
  tzeitTime: string | null;
}

// Curated zmanim for "Next Up" feature
const CURATED_ZMANIM = [
  { key: 'alotHaShachar', label: 'Alot HaShachar (Dawn)' },
  { key: 'misheyakir', label: 'Misheyakir' },
  { key: 'sunrise', label: 'Sunrise (Netz)' },
  { key: 'sofZmanShma', label: 'Latest Shema' },
  { key: 'sofZmanTfilla', label: 'Latest Shacharit' },
  { key: 'chatzot', label: 'Chatzot (Midday)' },
  { key: 'minchaGedola', label: 'Mincha Gedola' },
  { key: 'minchaKetana', label: 'Mincha Ketana' },
  { key: 'plagHaMincha', label: 'Plag HaMincha' },
  { key: 'sunset', label: 'Sunset (Shkiah)' },
  { key: 'tzeit', label: 'Nightfall (Tzeit)' },
];

function isoDateInTz(date: Date, tzid: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tzid,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function normalizeHebcalItemToISODate(itemDate: string, tzid: string): string {
  // If already YYYY-MM-DD, keep it
  if (/^\d{4}-\d{2}-\d{2}$/.test(itemDate)) return itemDate;

  const dt = new Date(itemDate);
  if (Number.isNaN(dt.getTime())) return itemDate.slice(0, 10);
  return isoDateInTz(dt, tzid);
}

function isHolidayCategory(category?: string): boolean {
  return (
    category === 'holiday' ||
    category === 'roshchodesh' ||
    category === 'minor' ||
    category === 'major' ||
    category === 'fast' ||
    category === 'specialshabbat' ||
    category === 'mevarchim'
  );
}

export function useHomeData(coords: Coords | null): HomeData {
  const [data, setData] = useState<HomeData>({
    jewishDate: null,
    parsha: null,
    omer: null,
    nextUpLabel: null,
    nextUpTime: null,
    candleLighting: null,
    havdalah: null,
    todayHolidays: [],
    upcomingHolidays: [],
    tzid: null,
    civilDate: null,
    afterTzeit: false,
    nowInTzid: null,
    tzeitTime: null,
  });

  useEffect(() => {
    if (!coords) {
      setData({
        jewishDate: null,
        parsha: null,
        omer: null,
        nextUpLabel: null,
        nextUpTime: null,
        candleLighting: null,
        havdalah: null,
        todayHolidays: [],
        upcomingHolidays: [],
        tzid: null,
        civilDate: null,
        afterTzeit: false,
        nowInTzid: null,
        tzeitTime: null,
      });
      return;
    }

    fetchData();

    async function fetchData() {
      try {
        // 1. Determine timezone from coords
        const tzid = tzlookup(coords!.latitude, coords!.longitude);
        
        // 2. Fetch zmanim first
        const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&latitude=${coords!.latitude}&longitude=${coords!.longitude}&tzid=${encodeURIComponent(tzid)}`;
        const zmanimRes = await fetch(zmanimUrl);
        const zmanimJson = await zmanimRes.json();
        
        // 3. Get current time and determine if after tzeit
        const now = new Date();
        const tzeitStr = zmanimJson.times.tzeit || zmanimJson.times.sunset;
        const tzeitDate = new Date(tzeitStr);
        const afterTzeit = now > tzeitDate;
        
        // 4. Format current time in target timezone for debugging
        const nowInTzid = now.toLocaleString('en-US', { 
          timeZone: tzid,
          dateStyle: 'short',
          timeStyle: 'long'
        });
        
        const tzeitTimeFormatted = tzeitDate.toLocaleString('en-US', {
          timeZone: tzid,
          timeStyle: 'short'
        });
        
        // 5. Get civil date in target timezone
        // This is the key fix: we need the DATE in the target timezone
        const civilDateInTz = new Date().toLocaleDateString('en-CA', { 
          timeZone: tzid 
        }); // Returns YYYY-MM-DD in target timezone
        
        // 6. Determine which civil date to use for Hebrew converter
        // If after tzeit, the Hebrew date has already changed, but we still
        // want to convert the CURRENT civil date with gs=on flag
        const converterDate = civilDateInTz;
        const useGs = afterTzeit ? '&gs=on' : '';
        
        // 7. Fetch Hebrew date
        const converterUrl = `https://www.hebcal.com/converter?cfg=json&date=${converterDate}&g2h=1${useGs}`;
        const converterRes = await fetch(converterUrl);
        const converterJson = await converterRes.json();
        
        const jewishDate = `${converterJson.hebrew} ${converterJson.hy}`;
        
        // 8. Fetch Shabbat data
        const shabbatUrl = `https://www.hebcal.com/shabbat?cfg=json&latitude=${coords!.latitude}&longitude=${coords!.longitude}&tzid=${encodeURIComponent(tzid)}`;
        const shabbatRes = await fetch(shabbatUrl);
        const shabbatJson = await shabbatRes.json();
        
        // 9. Extract Shabbat info
        let candleLighting: string | null = null;
        let havdalah: string | null = null;
        let parsha: string | null = null;
        
        for (const item of shabbatJson.items || []) {
          if (item.category === 'candles') {
            const candleDate = new Date(item.date);
            candleLighting = candleDate.toLocaleString('en-US', {
              timeZone: tzid,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
          }
          if (item.category === 'havdalah') {
            const havdalahDate = new Date(item.date);
            havdalah = havdalahDate.toLocaleString('en-US', {
              timeZone: tzid,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
          }
          if (item.category === 'parashat') {
            parsha = item.title.replace('Parashat ', '');
          }
        }
        
        // 9.5 Extract holiday info (Today + upcoming)
        const todayISO = civilDateInTz; // already YYYY-MM-DD in tzid
        const holidayCandidates = (shabbatJson.items || [])
          .filter((it: any) => {
            // exclude candles/havdalah from holiday list
            if (it?.category === 'candles' || it?.category === 'havdalah') return false;
            return isHolidayCategory(it?.category);
          })
          .filter((it: any) => it?.title && it?.date)
          .map((it: any) => ({
            title: String(it.title),
            hebrew: it.hebrew ? String(it.hebrew) : undefined,
            category: it.category ? String(it.category) : undefined,
            dateISO: normalizeHebcalItemToISODate(String(it.date), tzid),
          }));

        const todayHolidays = holidayCandidates.filter((h: any) => h.dateISO === todayISO);
        const upcomingHolidays = holidayCandidates
          .filter((h: any) => h.dateISO > todayISO)
          .sort((a: any, b: any) => (a.dateISO < b.dateISO ? -1 : 1))
          .slice(0, 4);
        
        // 10. Determine "Next Up" from curated zmanim
        let nextUpLabel: string | null = null;
        let nextUpTime: string | null = null;
        
        for (const zman of CURATED_ZMANIM) {
          const timeStr = zmanimJson.times[zman.key];
          if (timeStr) {
            const zmanDate = new Date(timeStr);
            if (zmanDate > now) {
              nextUpLabel = zman.label;
              nextUpTime = zmanDate.toLocaleString('en-US', {
                timeZone: tzid,
                hour: 'numeric',
                minute: '2-digit'
              });
              break;
            }
          }
        }
        
        // 11. Check for Omer count
        let omer: string | null = null;
        if (converterJson.omer) {
          omer = `Day ${converterJson.omer}`;
        }
        
        setData({
          jewishDate,
          parsha,
          omer,
          nextUpLabel,
          nextUpTime,
          candleLighting,
          havdalah,
          todayHolidays,
          upcomingHolidays,
          tzid,
          civilDate: civilDateInTz,
          afterTzeit,
          nowInTzid,
          tzeitTime: tzeitTimeFormatted,
        });
        
      } catch (err) {
        console.error('Error fetching home data:', err);
      }
    }
  }, [coords]);

  return data;
}