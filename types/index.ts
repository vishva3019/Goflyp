export type ThemeMode = 'system' | 'light' | 'dark';

export interface Vehicle {
  make: string;
  model: string;
  registrationNumber: string;
  color: string;
  helmetProvided: boolean;
  verified: boolean;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  university: string;
  department: string;
  graduationYear: string;
  rating: number;
  totalRatings: number;
  isStudentVerified: boolean;
  completedTrips: number;
  co2SavedKg: number;
  vehicle?: Vehicle;
  upiId?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  coordinates: LatLng[];
  polyline: LatLng[];
  provider?: 'osrm' | 'unavailable';
  error?: string;
}

export interface Waypoint {
  id: string;
  name: string;
  address: string;
  eta: string;
  lat?: number;
  lng?: number;
}

export interface Ride {
  id: string;
  riderId: string;
  rider: StudentUser;
  pickupLocation: string;
  destinationLocation: string;
  waypoints: Waypoint[];
  departureTime: string;
  departureDate: string;
  estimatedDuration: string;
  distance: string;
  availableSeats: number;
  totalSeats: number;
  contributionAmount: number;
  vehicle: Vehicle;
  routeCompatibility: number;
  isRecommended: boolean;
  status: 'open' | 'full' | 'started' | 'completed' | 'cancelled';
  note?: string;
  coordinates?: {
    pickup: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: { lat: number; lng: number }[];
  };
}

export type BookingStatus = 'pending' | 'confirmed' | 'started' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  rideId: string;
  ride: Ride;
  passengerId: string;
  passenger: StudentUser;
  pickupPoint: string;
  dropoffPoint: string;
  status: BookingStatus;
  bookedAt: string;
  paymentStatus: 'pending' | 'settled';
  paymentMethod?: 'upi' | 'cash';
  contributionAmount: number;
  transactionRef?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'ride_confirmed' | 'ride_started' | 'seat_request' | 'payment_received' | 'system';
  actionUrl?: string;
}

export type VerificationType = 'student_id' | 'vehicle_rc' | 'driving_license' | 'unknown' | string;
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | string;

export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: VerificationType | null;
  status: VerificationStatus;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  reg_number?: string | null;
  id_card_image_url?: string | null;
  rc_document_url?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  remarks?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  registration_number?: string | null;
  vehicle_color?: string | null;
}

export interface AdminVerificationsResponse {
  verifications: VerificationRequest[];
  vehicles?: any[];
}

