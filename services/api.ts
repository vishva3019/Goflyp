import Constants from 'expo-constants';
import { ALLIANCE_CAMPUS_LAT, ALLIANCE_CAMPUS_LNG } from '../constants/campus';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://localhost:5050/api';

const TOKEN_KEY = '@goflyp_jwt_token';
const REQUEST_TIMEOUT_MS = 10000;

let inMemoryToken: string | null = null;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const ApiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  getToken(): string | null {
    if (inMemoryToken) return inMemoryToken;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  setToken(token: string | null) {
    inMemoryToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const startTime = Date.now();

    // 10-second timeout controller combined with optional caller signal
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const duration = Date.now() - startTime;

      let data: any;
      try {
        data = await response.json();
      } catch (jsonErr) {
        data = {};
      }

      // Safe dev logging - NEVER log tokens, passwords, secrets, or API keys
      if (isDev) {
        console.log(`[API ${method}] ${endpoint} -> ${response.status} (${duration}ms) [Base: ${API_BASE_URL}]`);
      }

      if (!response.ok) {
        const errorObj: any = new Error(data.error || `HTTP ${response.status}: Request failed.`);
        errorObj.code = data.code;
        errorObj.status = response.status;
        throw errorObj;
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timer);
      const duration = Date.now() - startTime;

      let safeErrorMessage = err.message || 'Request failed';
      let code = err.code;
      let status = err.status;

      if (err.name === 'AbortError') {
        safeErrorMessage = `Request timeout: Goflyp backend at ${API_BASE_URL} did not respond within 10 seconds.`;
        code = 'TIMEOUT';
        status = 408;
      } else if (err.message && (err.message.includes('Network request failed') || err.message.includes('Connection refused') || err.message.includes('Failed to fetch'))) {
        safeErrorMessage = `Cannot connect to Goflyp backend at ${API_BASE_URL}. Ensure server is running.`;
        code = 'BACKEND_UNAVAILABLE';
        status = 503;
      }

      if (isDev) {
        console.warn(`[API ${method}] ${endpoint} FAILED (${duration}ms): ${safeErrorMessage} [Base: ${API_BASE_URL}]`);
      }

      const outgoingError: any = new Error(safeErrorMessage);
      outgoingError.code = code;
      outgoingError.status = status;
      throw outgoingError;
    }
  },

  // Auth Endpoints
  async register(payload: any) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(payload: any) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async logout() {
    this.setToken(null);
  },

  async submitVerification(regNumber: string, idCardImageUrl?: string) {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ regNumber, idCardImageUrl }),
    });
  },

  async updateVehicle(payload: any) {
    return this.request('/auth/vehicle', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProfile(payload: {
    fullName?: string;
    phone?: string;
    department?: string;
    regNumber?: string;
    emergencyContact?: string;
    upiId?: string;
  }) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { email: string; token: string; newPassword: string }) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Chat Endpoints
  async getChatMessages(bookingId: string) {
    return this.request(`/chat/${bookingId}`);
  },

  async sendChatMessage(bookingId: string, message: string) {
    return this.request(`/chat/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Rides Endpoints
  async publishRide(payload: any) {
    return this.request('/rides', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async searchRides(params: {
    pickup?: string;
    destination?: string;
    pickupLat?: number;
    pickupLng?: number;
    destLat?: number;
    destLng?: number;
    date?: string;
    time?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.pickup) searchParams.append('pickup', params.pickup);
    if (params.destination) searchParams.append('destination', params.destination);
    if (params.pickupLat) searchParams.append('pickupLat', params.pickupLat.toString());
    if (params.pickupLng) searchParams.append('pickupLng', params.pickupLng.toString());
    if (params.destLat) searchParams.append('destLat', params.destLat.toString());
    if (params.destLng) searchParams.append('destLng', params.destLng.toString());
    if (params.date) searchParams.append('date', params.date);
    if (params.time) searchParams.append('time', params.time);

    return this.request(`/rides/search?${searchParams.toString()}`);
  },

  async getRideDetails(id: string) {
    return this.request(`/rides/${id}`);
  },

  async getCaptainRides() {
    return this.request('/rides/captain/my-rides');
  },

  async cancelRide(id: string) {
    return this.request(`/rides/${id}/cancel`, { method: 'PATCH' });
  },

  // Bookings Endpoints
  async requestSeat(payload: {
    rideId: string;
    pickupName?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffName?: string;
    dropoffLat?: number;
    dropoffLng?: number;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRiderBookings() {
    return this.request('/bookings/rider/my-bookings');
  },

  async getBooking(id: string) {
    return this.request(`/bookings/${id}`);
  },

  async getCaptainRequests(status?: string) {
    const url = status ? `/bookings/captain/requests?status=${encodeURIComponent(status)}` : '/bookings/captain/requests';
    return this.request(url);
  },

  async acceptBooking(id: string) {
    return this.request(`/bookings/${id}/accept`, { method: 'PATCH' });
  },

  async rejectBooking(id: string) {
    return this.request(`/bookings/${id}/reject`, { method: 'PATCH' });
  },

  async cancelBooking(id: string) {
    return this.request(`/bookings/${id}/cancel`, { method: 'PATCH' });
  },

  // Trips Endpoints
  async startTrip(rideId: string) {
    return this.request(`/trips/${rideId}/start`, { method: 'PATCH' });
  },

  async completeTrip(rideId: string) {
    return this.request(`/trips/${rideId}/complete`, { method: 'PATCH' });
  },

  async postTelemetry(payload: { tripId: string; lat: number; lng: number; speed?: number; heading?: number }) {
    return this.request('/trips/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTelemetry(tripId: string) {
    return this.request(`/trips/${tripId}/telemetry`);
  },

  async triggerSOS(payload: { tripId?: string; lat?: number; lng?: number; location?: { lat: number; lng: number }; message?: string; note?: string }) {
    const lat = payload.lat ?? payload.location?.lat ?? ALLIANCE_CAMPUS_LAT;
    const lng = payload.lng ?? payload.location?.lng ?? ALLIANCE_CAMPUS_LNG;
    const message = payload.message ?? payload.note ?? 'Emergency SOS';
    return this.request('/trips/sos', {
      method: 'POST',
      body: JSON.stringify({ tripId: payload.tripId, lat, lng, message }),
    });
  },

  async sendSOS(payload: any) {
    return this.triggerSOS(payload);
  },

  // Payments Endpoints
  async reportPayment(bookingId: string, paymentMethod: 'upi' | 'cash', upiReference?: string) {
    return this.request(`/payments/${bookingId}/report`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, upiReference }),
    });
  },

  async confirmPayment(bookingId: string) {
    return this.request(`/payments/${bookingId}/confirm`, { method: 'PATCH' });
  },

  // Geospatial Endpoints
  async searchPlaces(query: string) {
    return this.request(`/geo/search?q=${encodeURIComponent(query)}`);
  },

  async reverseGeocode(lat: number, lng: number): Promise<{ name: string; address: string; lat: number; lng: number }> {
    return this.request(`/geo/reverse?lat=${lat}&lng=${lng}`);
  },

  async getRoadRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: any[] = [],
    signal?: AbortSignal
  ) {
    return this.request('/geo/route', {
      method: 'POST',
      body: JSON.stringify({ origin, destination, waypoints }),
      signal,
    });
  },

  // Admin Endpoints
  async getAdminStats() {
    return this.request('/admin/stats');
  },

  async getAdminVerifications() {
    return this.request('/admin/verifications');
  },

  async getPendingVerifications() {
    return this.getAdminVerifications();
  },

  async approveVerification(id: string, reviewerNotes?: string) {
    return this.request(`/admin/verifications/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewerNotes }),
    });
  },

  async rejectVerification(id: string, reviewerNotes?: string) {
    return this.request(`/admin/verifications/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewerNotes }),
    });
  },

  async approveVehicle(id: string) {
    return this.request(`/admin/vehicles/${id}/approve`, { method: 'PATCH' });
  },

  async getCampusSettings() {
    return this.request('/admin/campus');
  },

  async updateCampusSettings(payload: any) {
    return this.request('/admin/campus', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getAuditLogs() {
    return this.request('/admin/audit-logs');
  },
};
