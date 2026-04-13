export type UserRole = 'owner' | 'host';
export type KycStatus = 'pending' | 'verified' | 'rejected';
export type ServiceType = 'space' | 'visiter';
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
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
  image_urls: string[];
  features: string[];
  active: boolean;
  created_at: string;
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
  total_price: number;
  insurance_included: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface HostApplication {
  id: string;
  applicant_id: string;
  service_type: ServiceType;
  kyc_doc_url: string | null;
  safety_evidence_url: string | null;
  status: ApplicationStatus;
  submitted_at: string;
}
