export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: 'farmer' | 'provider';
  language: string;
  address?: string;
  bio?: string;
  experience?: string;
  rating?: number;
  last_active?: string;
  avatar_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface Tractor {
  id: number;
  owner_id: number;
  model: string;
  status: 'available' | 'busy' | 'maintenance';
  location: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  description?: string;
  price_per_acre?: number;
  price_per_hour?: number;
  hp?: number;
  year?: number;
  fuel_type?: string;
  last_service?: string;
  next_service?: string;
  ai_health_score?: number;
  ai_maintenance_tip?: string;
  maintenance_history?: { date: string; type: string; cost: number; notes: string }[];
}

export interface Booking {
  id: number;
  farmer_id: number;
  provider_id?: number;
  tractor_id?: number;
  acres: number;
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  service_type: string;
  farmer_name?: string;
  farmer_phone?: string;
  farmer_username?: string;
  provider_name?: string;
  provider_phone?: string;
  provider_username?: string;
  rating?: number;
  feedback?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  created_at: string;
}
