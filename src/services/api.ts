import { RootstechClass } from '../types';
import { CacheLoader } from './cacheLoader';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const classesCache = new CacheLoader<RootstechClass[]>('rootstech_classes', CACHE_DURATION);

const SESSIONS_URL =
  'https://cms-z.api.familysearch.org/rootstech/api/graphql/delivery/conference?operationName=CalendarDetail&variables=%7B%22profileImage_crop%22%3Atrue%2C%22profileImage_height%22%3A250%2C%22profileImage_width%22%3A250%2C%22promoImage_crop%22%3Afalse%2C%22promoImage_height%22%3A288%2C%22promoImage_width%22%3A512%2C%22thumbnailImage_crop%22%3Afalse%2C%22thumbnailImage_height%22%3A288%2C%22thumbnailImage_width%22%3A512%2C%22id%22%3A%22%2Fcalendar%2Fsessions%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22b87427ca63a55636901cbb17e71dd57e74f7e81cc890feb6468227c97d7123de%22%7D%7D';

const MAINSTAGE_URL =
  'https://cms-z.api.familysearch.org/rootstech/api/graphql/delivery/conference?operationName=CalendarDetail&variables=%7B%22profileImage_crop%22%3Atrue%2C%22profileImage_height%22%3A250%2C%22profileImage_width%22%3A250%2C%22promoImage_crop%22%3Afalse%2C%22promoImage_height%22%3A288%2C%22promoImage_width%22%3A512%2C%22thumbnailImage_crop%22%3Afalse%2C%22thumbnailImage_height%22%3A288%2C%22thumbnailImage_width%22%3A512%2C%22id%22%3A%22%2Fcalendar%2Fmain-stage%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22b87427ca63a55636901cbb17e71dd57e74f7e81cc890feb6468227c97d7123de%22%7D%7D';

const fetchWithHeaders = async (url: string): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
      'x-api-key': 'kktOgVTWL3yBprDpE8TDKGzAG49GXETaf3MUOuq',
      'Host': 'cms-z.api.familysearch.org',
      'Referer': 'https://www.familysearch.org/',
      'Origin': 'https://www.familysearch.org/'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const extractCalendarItems = (json: any): any[] => {
  return json?.data?.CalendarDetail?.stages?.[0]?.calendarItems || [];
};

const asciiOnly = (str: string): string => {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\x00-\x7F]/g, '');
};

const parseCalendarItems = (calendarItems: any[]): RootstechClass[] => {
  const classes = calendarItems
    .filter(item => item && item.item)
    .map(calendarItem => {
      const dateUnixEpoch = calendarItem.date;
      const date = new Date(dateUnixEpoch);

      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Denver'
      });

      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver'
      });

      const title = calendarItem.item?.title || '';
      const speakers = (calendarItem.item?.creators || [])
        .map((creator: any) => creator.name)
        .sort()
        .join(', ');
      const url = calendarItem.item?.url || '';
      const classroom = calendarItem.item?.classroomName !== 'Remote'
        ? calendarItem.item?.classroomName
        : null;
      const location = calendarItem.item?.sessionLocation || '';

      const availableForViewingAfterConference =
        !(location.includes('In Person') && !location.includes('Online'));

      return {
        Date: dateStr,
        Time: timeStr,
        Title: asciiOnly(title),
        Speakers: asciiOnly(speakers),
        Classroom: classroom,
        Location: location,
        'Available for Viewing After Conference': availableForViewingAfterConference ? 'Yes' : 'No',
        url: url,
        timestamp: dateUnixEpoch,
        isReplay: false
      };
    });

  // Mark replays (keep all classes, just flag duplicates)
  const seenUrls = new Set<string>();
  const result: RootstechClass[] = [];

  for (const classItem of classes) {
    if (seenUrls.has(classItem.url)) {
      // This is a replay - keep original location/classroom but mark as replay
      result.push({
        ...classItem,
        isReplay: true
      });
    } else {
      seenUrls.add(classItem.url);
      result.push(classItem);
    }
  }

  return result;
};

const fetchFreshClasses = async (): Promise<RootstechClass[]> => {
  const [sessionsData, mainStageData] = await Promise.all([
    fetchWithHeaders(SESSIONS_URL),
    fetchWithHeaders(MAINSTAGE_URL)
  ]);

  const sessionsItems = extractCalendarItems(sessionsData);
  const mainStageItems = extractCalendarItems(mainStageData);

  const sessionClasses = parseCalendarItems(sessionsItems);
  const mainStageClasses = parseCalendarItems(mainStageItems);

  const allClasses = [...sessionClasses, ...mainStageClasses];

  // Sort by timestamp, then location, then classroom
  allClasses.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;

    const locCompare = a.Location.localeCompare(b.Location);
    if (locCompare !== 0) return locCompare;

    const classroomA = a.Classroom || '';
    const classroomB = b.Classroom || '';
    return classroomA.localeCompare(classroomB);
  });

  // Remove exact duplicates
  const seen = new Map<string, RootstechClass>();
  const droppedClasses: RootstechClass[] = [];

  for (const classItem of allClasses) {
    const key = JSON.stringify(classItem);
    if (seen.has(key)) {
      droppedClasses.push(classItem);
    } else {
      seen.set(key, classItem);
    }
  }

  if (droppedClasses.length > 0) {
    console.log(`Dropped ${droppedClasses.length} duplicate classes:`);
    droppedClasses.forEach((dropped) => {
      console.log(`  - ${dropped.Date} ${dropped.Time} | ${dropped.Title} | ${dropped.Location}${dropped.Classroom ? ` | ${dropped.Classroom}` : ''}`);
    });
  } else {
    console.log('No duplicate classes found');
  }

  const uniqueClasses = Array.from(seen.values());
  return uniqueClasses;
};

export const fetchClasses = async (): Promise<RootstechClass[]> => {
  return classesCache.loadWithCache(fetchFreshClasses);
};
