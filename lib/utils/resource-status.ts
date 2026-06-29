import { SharedResource } from '@/lib/services/shared-space-client.service';

export type ResourceRealTimeStatus = 'ACTIVE' | 'BUSY' | 'MAINTENANCE';

export const getResourceRealTimeStatus = (resource: SharedResource): ResourceRealTimeStatus => {
  if (resource.status === 'MAINTENANCE') return 'MAINTENANCE';

  const now = new Date();

  const hasActiveBooking = resource.resourceBookings?.some(booking => {
    console.log("BOOKING ", booking)
    if (booking.status !== 'APPROVED') return false;
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    return now >= start && now < end;
  });

  return hasActiveBooking ? 'BUSY' : 'ACTIVE';
};