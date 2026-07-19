// ─── Enums ────────────────────────────────────────────────────────────────────
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Urgency = 'critical' | 'urgent' | 'planned';
export type RequestStatus = 'pending' | 'notified' | 'donor_found' | 'fulfilled' | 'cancelled' | 'expired';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deactivated';
export type Language = 'fa' | 'ps' | 'en';

// ─── User (matches Laravel User::toProfileArray()) ────────────────────────────
export interface User {
  id: number;
  phone: string;
  email?: string | null;
  full_name: string;
  blood_type: BloodType;
  province_id: number;
  district_id: number;
  province_name?: string;
  district_name?: string;
  province_names?: { en: string; fa: string; ps: string };
  district_names?: { en: string; fa: string; ps: string };
  lat?: number | null;
  lng?: number | null;
  age: number;
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
  is_donor: boolean;
  is_available: boolean;
  donation_count: number;
  reliability_score: number;
  language_pref: Language;
  status: UserStatus;
  is_verified: boolean;
  last_donation_at?: string | null;
  next_eligible_at?: string | null;
  is_eligible: boolean;
  days_until_eligible: number;
  has_email: boolean;
  created_at: string;
}

// ─── Province / District ──────────────────────────────────────────────────────
export interface Province {
  id: number;
  name_en: string;
  name_fa: string;
  name_ps: string;
  lat_centroid: number;
  lng_centroid: number;
}

export interface District {
  id: number;
  province_id: number;
  name_en: string;
  name_fa: string;
  name_ps: string;
  lat_centroid: number;
  lng_centroid: number;
}

// ─── Blood Request ────────────────────────────────────────────────────────────
export interface BloodRequest {
  id: number;
  blood_type_needed: BloodType;
  urgency: Urgency;
  province_id: number;
  district_id: number;
  province_name?: string;
  province_name_fa?: string;
  province_name_ps?: string;
  district_name?: string;
  district_name_fa?: string;
  district_name_ps?: string;
  units_needed: number;
  donors_accepted: number;
  notes?: string | null;
  status: RequestStatus;
  current_wave: number;
  expires_at: string;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  contact_phone?: string;
}

// ─── Acceptance ───────────────────────────────────────────────────────────────
export interface Acceptance {
  id: number;
  donor_id: number;
  blood_type: BloodType;
  full_name: string;
  phone: string;
  is_verified: boolean;
  donation_count: number;
  reliability_score: number;
  province_name: string;
  district_name: string;
  accepted_at: string;
  is_fulfilled: boolean;
}

// ─── Donor Notification ───────────────────────────────────────────────────────
export interface DonorNotification {
  id: number;
  request_id: number;
  wave: number;
  score: number;
  notified_at: string;
  response: 'pending' | 'accepted' | 'declined' | 'no_response';
  response_window_ends_at: string;
  blood_type_needed: BloodType;
  urgency: Urgency;
  notes?: string | null;
  request_status: RequestStatus;
  units_needed: number;
  province_name: string;
  province_name_fa: string;
  province_name_ps?: string;
  district_name: string;
  district_name_fa: string;
  district_name_ps?: string;
  distance_km?: number | null;
}

// ─── In-App Notification ──────────────────────────────────────────────────────
export interface InAppNotification {
  id: number;
  user_id: number;
  request_id?: number | null;
  type: string;
  title_en: string;
  title_fa: string;
  title_ps?: string | null;
  body_en: string;
  body_fa: string;
  body_ps?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Donation History ─────────────────────────────────────────────────────────
export interface DonationRecord {
  id: number;
  request_id: number;
  blood_type: BloodType;
  province_name: string;
  district_name: string;
  confirmed_by_requester: boolean;
  donated_at: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface Admin {
  id: number;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin';
}

export interface DashboardData {
  users: { total: number; donors: number; active: number; new_today: number; new_this_week: number };
  donors: { active_now: number };
  requests: {
    by_status: Record<string, number>;
    today: number;
    this_week: number;
    fulfillment_rate: number;
    avg_minutes_to_first_donor: number;
  };
  analytics: {
    by_blood_type: Array<{ blood_type_needed: BloodType; count: number }>;
    by_province: Array<{ name_en: string; count: number }>;
    daily_requests: Array<{ date: string; count: number }>;
  };
  fcm_configured: boolean;
}
