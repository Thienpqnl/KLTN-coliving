export interface TimeOverlapItem {
  startTime: Date | string;
  endTime: Date | string;
  status?: string;
}

export const hasTimeOverlap = (
  startTime: Date | string,
  endTime: Date | string,
  existingStartTime: Date | string,
  existingEndTime: Date | string,
): boolean => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const existingStart = new Date(existingStartTime);
  const existingEnd = new Date(existingEndTime);

  return start < existingEnd && end > existingStart;
};

export const hasBookingConflict = (
  startTime: Date | string,
  endTime: Date | string,
  bookings: TimeOverlapItem[] = [],
): boolean => {
  return bookings.some((booking) => {
    if (booking.status && booking.status === 'CANCELLED') {
      return false;
    }

    return hasTimeOverlap(startTime, endTime, booking.startTime, booking.endTime);
  });
};
