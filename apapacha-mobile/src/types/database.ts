import type { Availability } from '../lib/availability';
export type { Availability };

export type UserRole = 'owner' | 'host';
export type KycStatus = 'pending' | 'under_review' | 'verified' | 'rejected';
export type ServiceType = 'space' | 'visiter';
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ServicePhase = 'not_started' | 'in_progress';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'receipt_submitted' | 'paid' | 'refunded';

export interface Profile {
  id: string;
  full_name: string;
  last_name: string | null;
  age: number | null;
  address: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  stripe_account_id: string | null;
  is_admin: boolean;
  onboarding_done: boolean;
  signed_contract_url: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  age_years: number;
  weight_kg: number;
  sterilized: boolean;
  medical_alerts: string[];
  image_url: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  host_id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  rating: number;
  image_urls: string[] | null;
  features: string[];
  active: boolean;
  created_at: string;
  availability?: Availability;
}

export interface Visiter {
  id: string;
  host_id: string;
  name: string;
  profession_title: string;
  bio: string;
  price_per_visit: number;
  rating: number;
  total_visits: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  availability?: Availability;
}

export interface Booking {
  id: string;
  owner_id: string;
  pet_id: string;
  service_type: ServiceType;
  service_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  host_response: 'pending' | 'accepted' | 'rejected';
  service_phase: ServicePhase;
  total_price: number;
  insurance_included: boolean;
  payment_receipt_url: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  visit_dates?: string[] | null;        // visitas: fechas puntuales (permite día por medio)
  time_block?: 'am' | 'pm' | null;      // visitas: tramo AM (06–12) / PM (13–21)
  start_time?: string | null;           // legado: hora puntual (ya no se agenda desde la app)
  cancelled_by?: 'owner' | 'host' | 'admin' | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  refund_percent?: number | null;
  refund_amount?: number | null;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export interface HostApplication {
  id: string;
  applicant_id: string;
  service_type: ServiceType;
  kyc_doc_url: string | null;
  safety_evidence_url: string | null;
  selfie_url: string | null;
  evidence_url_2: string | null;
  status: ApplicationStatus;
  submitted_at: string;
  welcome_email_sent: boolean | null;
}
