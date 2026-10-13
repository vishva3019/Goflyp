import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../services/api';
import { useAuth } from './AuthContext';
import {
  ALLIANCE_CAMPUS_NAME,
  ALLIANCE_CAMPUS_LAT,
  ALLIANCE_CAMPUS_LNG,
} from '../constants/campus';

export interface RideItem {
  id: string;
  captainId: string;
  captain: {
    id: string;
    name: string;
    rating: number;
    totalRatings: number;
    isVerified: boolean;
    department: string;
    avatar?: string;
    phone?: string;
    upiId?: string;
  };
  vehicle: {
    make: string;
    model: string;
    registrationNumber: string;
    color: string;
    helmetProvided: boolean;
    verified: boolean;
  };
  pickupLocation: string;
  destinationLocation: string;
  pickupCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  waypoints: any[];
  departureTime: string;
  departureDate: string;
  availableSeats: number;
  totalSeats: number;
  contributionAmount: number;
  distanceKm: number;
  durationMinutes: number;
  routePolyline: { lat: number; lng: number }[];
  routeCompatibility?: number;
  detourKm?: number;
  note?: string;
  status: string;
}

export interface BookingItem {
  id: string;
  ride_id: string;
  rider_id: string;
  pickup_name: string;
  dropoff_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  contribution_amount: number;
  booked_at: string;
  origin_name?: string;
  destination_name?: string;
  departure_date?: string;
  departure_time?: string;
  distance_km?: number;
  duration_minutes?: number;
  captain_name?: string;
  captain_phone?: string;
  captain_rating?: number;
  captain_verified?: boolean;
  captain_upi?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  payment_status?: 'pending' | 'reported' | 'confirmed' | 'disputed';
  payment_method?: 'upi' | 'cash';
  upi_reference?: string;
  rider_name?: string;
  rider_phone?: string;
  rider_department?: string;
  rider_verified?: boolean;
}

interface SearchFilter {
  pickup: string;
  destination: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  date: string;
  time: string;
}

interface RideContextType {
  rides: RideItem[];
  riderBookings: BookingItem[];
  captainRides: any[];
  captainRequests: BookingItem[];
  activeBooking: BookingItem | null;
  activeCaptainTrip: any | null;
  searchFilter: SearchFilter;
  setSearchFilter: React.Dispatch<React.SetStateAction<SearchFilter>>;
  isLoadingRides: boolean;
  isLoadingBookings: boolean;
  ridesError: string | null;
  notifications: any[];
  markNotificationAsRead: (id: string) => void;
  fetchRides: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchCaptainData: () => Promise<void>;
  publishRide: (payload: any) => Promise<any>;
  requestSeat: (payload: any) => Promise<any>;
  acceptBooking: (bookingId: string) => Promise<void>;
  rejectBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  startTrip: (rideId: string) => Promise<void>;
  completeTrip: (rideId: string) => Promise<any>;
  reportPayment: (bookingId: string, method: 'upi' | 'cash', ref?: string) => Promise<void>;
  confirmPayment: (bookingId: string) => Promise<void>;
  getRideById: (id: string) => Promise<any>;
  getBookingById: (id: string) => Promise<any>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, activeRole } = useAuth();

  const [rides, setRides] = useState<RideItem[]>([]);
  const [riderBookings, setRiderBookings] = useState<BookingItem[]>([]);
  const [captainRides, setCaptainRides] = useState<any[]>([]);
  const [captainRequests, setCaptainRequests] = useState<BookingItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [ridesError, setRidesError] = useState<string | null>(null);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const [searchFilter, setSearchFilter] = useState<SearchFilter>({
    pickup: ALLIANCE_CAMPUS_NAME,
    destination: 'Electronic City Metro Station (Phase 1)',
    pickupLat: ALLIANCE_CAMPUS_LAT,
    pickupLng: ALLIANCE_CAMPUS_LNG,
    destLat: 12.8452,
    destLng: 77.6602,
    date: 'Today',
    time: '5:30 PM',
  });

  const fetchRides = useCallback(async () => {
    setIsLoadingRides(true);
    setRidesError(null);
    try {
      const data = await ApiClient.searchRides({
        pickup: searchFilter.pickup,
        destination: searchFilter.destination,
        pickupLat: searchFilter.pickupLat,
        pickupLng: searchFilter.pickupLng,
        destLat: searchFilter.destLat,
        destLng: searchFilter.destLng,
        date: searchFilter.date,
        time: searchFilter.time,
      });
      setRides(data.rides || []);
    } catch (err: any) {
      setRidesError(err.message || 'Unable to fetch real campus rides.');
      setRides([]);
    } finally {
      setIsLoadingRides(false);
    }
  }, [
    searchFilter.pickup,
    searchFilter.destination,
    searchFilter.pickupLat,
    searchFilter.pickupLng,
    searchFilter.destLat,
    searchFilter.destLng,
    searchFilter.date,
    searchFilter.time,
  ]);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated || activeRole !== 'rider') return;
    setIsLoadingBookings(true);
    try {
      const data = await ApiClient.getRiderBookings();
      setRiderBookings(data.bookings || []);
    } catch (e) {
      setRiderBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [isAuthenticated, activeRole]);

  const fetchCaptainData = useCallback(async () => {
    if (!isAuthenticated || activeRole !== 'captain') return;
    try {
      const [ridesRes, reqRes] = await Promise.all([
        ApiClient.getCaptainRides(),
        ApiClient.getCaptainRequests(),
      ]);
      setCaptainRides(ridesRes.rides || []);
      setCaptainRequests(reqRes.requests || []);
    } catch (e) {
      setCaptainRides([]);
      setCaptainRequests([]);
    }
  }, [isAuthenticated, activeRole]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeRole === 'captain') {
        fetchCaptainData();
      } else {
        fetchBookings();
      }
    }
  }, [isAuthenticated, activeRole, fetchBookings, fetchCaptainData]);

  const publishRide = useCallback(async (payload: any) => {
    const res = await ApiClient.publishRide(payload);
    await fetchCaptainData();
    await fetchRides();
    return res;
  }, [fetchCaptainData, fetchRides]);

  const requestSeat = useCallback(async (payload: any) => {
    const res = await ApiClient.requestSeat(payload);
    await fetchBookings();
    await fetchRides();
    return res;
  }, [fetchBookings, fetchRides]);

  const acceptBooking = useCallback(async (bookingId: string) => {
    // Optimistic update
    setCaptainRequests((prev) =>
      prev.map((req) => (req.id === bookingId ? { ...req, status: 'accepted' as const } : req))
    );
    try {
      await ApiClient.acceptBooking(bookingId);
    } finally {
      await fetchCaptainData();
    }
  }, [fetchCaptainData]);

  const rejectBooking = useCallback(async (bookingId: string) => {
    // Optimistic update
    setCaptainRequests((prev) => prev.filter((req) => req.id !== bookingId));
    try {
      await ApiClient.rejectBooking(bookingId);
    } finally {
      await fetchCaptainData();
    }
  }, [fetchCaptainData]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    await ApiClient.cancelBooking(bookingId);
    await fetchBookings();
  }, [fetchBookings]);

  const startTrip = useCallback(async (rideId: string) => {
    await ApiClient.startTrip(rideId);
    await fetchCaptainData();
    await fetchBookings();
  }, [fetchCaptainData, fetchBookings]);

  const completeTrip = useCallback(async (rideId: string) => {
    const res = await ApiClient.completeTrip(rideId);
    await fetchCaptainData();
    await fetchBookings();
    return res;
  }, [fetchCaptainData, fetchBookings]);

  const reportPayment = useCallback(async (bookingId: string, method: 'upi' | 'cash', ref?: string) => {
    await ApiClient.reportPayment(bookingId, method, ref);
    await fetchBookings();
  }, [fetchBookings]);

  const confirmPayment = useCallback(async (bookingId: string) => {
    await ApiClient.confirmPayment(bookingId);
    await fetchCaptainData();
  }, [fetchCaptainData]);

  const getRideById = useCallback(async (id: string) => {
    return ApiClient.getRideDetails(id);
  }, []);

  const getBookingById = useCallback(async (id: string) => {
    const res = await ApiClient.getBooking(id);
    return res.booking || res;
  }, []);

  // Compute active booking for rider
  const activeBooking =
    riderBookings.find(
      (b) => b.status === 'accepted' || b.status === 'pending' || (b as any).ride_status === 'started'
    ) || null;

  // Compute active trip for captain
  const activeCaptainTrip =
    captainRides.find((r) => r.status === 'started' || r.status === 'published') || null;

  return (
    <RideContext.Provider
      value={{
        rides,
        riderBookings,
        captainRides,
        captainRequests,
        activeBooking,
        activeCaptainTrip,
        searchFilter,
        setSearchFilter,
        isLoadingRides,
        isLoadingBookings,
        ridesError,
        notifications,
        markNotificationAsRead,
        fetchRides,
        fetchBookings,
        fetchCaptainData,
        publishRide,
        requestSeat,
        acceptBooking,
        rejectBooking,
        cancelBooking,
        startTrip,
        completeTrip,
        reportPayment,
        confirmPayment,
        getRideById,
        getBookingById,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRides = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRides must be used within a RideProvider');
  }
  return context;
};
