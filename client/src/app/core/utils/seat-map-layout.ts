export interface SeatMapLayoutSeat {
  section?: string;
  row?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SeatMapLayoutGroup {
  key: string;
  label: string;
  sections: string[];
}

export interface SeatMapLayoutBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SeatMapRowGuide {
  label: string;
  top: number;
  left: number;
  right: number;
}

const sectionName = (seat: SeatMapLayoutSeat): string =>
  String(seat.section || 'Ostalo').trim() || 'Ostalo';

const formatSectionLabel = (section: string): string => section
  .toLocaleLowerCase('sr-RS')
  .replace(/(^|\s)\S/g, (value) => value.toLocaleUpperCase('sr-RS'));

export const buildSeatMapGroups = <T extends SeatMapLayoutSeat>(
  seats: T[]
): SeatMapLayoutGroup[] => {
  const sections = [...new Set(seats.map(sectionName))];
  const parterSections = sections.filter((section) =>
    section.toLocaleLowerCase('sr-RS').includes('parter')
  );
  const gallerySections = sections.filter((section) => {
    const normalized = section.toLocaleLowerCase('sr-RS');
    return normalized.includes('galerija') || normalized.includes('centralna');
  });
  const assigned = new Set([...parterSections, ...gallerySections]);
  const groups: SeatMapLayoutGroup[] = [];

  if (parterSections.length) {
    groups.push({ key: 'parter', label: 'Parter', sections: parterSections });
  }
  if (gallerySections.length) {
    groups.push({ key: 'galerija', label: 'Galerija', sections: gallerySections });
  }

  sections
    .filter((section) => !assigned.has(section))
    .forEach((section) => groups.push({
      key: `section-${section}`,
      label: formatSectionLabel(section),
      sections: [section],
    }));

  return groups;
};

export const seatMapGroupForSection = (
  groups: SeatMapLayoutGroup[],
  section: string
): SeatMapLayoutGroup | undefined => groups.find((group) => group.sections.includes(section));

export const seatsForSeatMapGroup = <T extends SeatMapLayoutSeat>(
  seats: T[],
  group?: SeatMapLayoutGroup
): T[] => {
  if (!group) return seats;
  const includedSections = new Set(group.sections);
  return seats.filter((seat) => includedSections.has(sectionName(seat)));
};

export const calculateSeatMapBounds = <T extends SeatMapLayoutSeat>(
  seats: T[],
  groupKey: string,
  canvasWidth: number,
  canvasHeight: number
): SeatMapLayoutBounds => {
  if (!seats.length) {
    return {
      minX: 0,
      minY: 0,
      width: Math.max(1, Number(canvasWidth) || 1),
      height: Math.max(1, Number(canvasHeight) || 1),
    };
  }

  const maxX = Math.max(...seats.map((seat) => Number(seat.x || 0))) + 55;
  const maxY = Math.max(...seats.map((seat) => Number(seat.y || 0))) + 46;
  const isParter = groupKey === 'parter';

  return {
    minX: 0,
    minY: 0,
    width: isParter
      ? Math.max(960, maxX)
      : Math.max(700, Number(canvasWidth) || 0, maxX),
    height: isParter
      ? Math.max(820, maxY)
      : Math.max(500, Number(canvasHeight) || 0, maxY),
  };
};

export const seatMapSeatWidth = (seat: SeatMapLayoutSeat): number =>
  Math.max(18, Math.min(24, Number(seat.width || 22)));

export const seatMapSeatHeight = (seat: SeatMapLayoutSeat): number =>
  Math.max(18, Math.min(24, Number(seat.height || 22)));

export const buildSeatMapRowGuides = <T extends SeatMapLayoutSeat>(
  seats: T[],
  bounds: SeatMapLayoutBounds,
  groupKey: string
): SeatMapRowGuide[] => {
  if (groupKey !== 'parter') return [];

  const rows = new Map<string, T[]>();
  seats
    .filter((seat) => sectionName(seat) === 'Parter' && Boolean(seat.row))
    .forEach((seat) => {
      const row = String(seat.row);
      rows.set(row, [...(rows.get(row) || []), seat]);
    });

  return [...rows.entries()]
    .map(([label, rowSeats]) => {
      const xValues = rowSeats.map((seat) => Number(seat.x || 0) - bounds.minX);
      const top = rowSeats.reduce(
        (sum, seat) => sum + Number(seat.y || 0) - bounds.minY,
        0
      ) / rowSeats.length;
      return {
        label,
        top,
        left: Math.max(8, Math.min(...xValues) - 38),
        right: Math.min(bounds.width - 8, Math.max(...xValues) + 38),
      };
    })
    .sort((left, right) => left.top - right.top);
};
