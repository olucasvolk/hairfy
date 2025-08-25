import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Barbershop {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  website?: string;
  instagram?: string;
  whatsapp?: string;
  booking_link?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number; // in cents
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  barbershop_id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  specialties?: string[];
  is_active: boolean;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  email?: string;
  phone: string;
  birth_date?: string;
  notes?: string;
  last_visit?: string;
  total_visits: number;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'nao_compareceu';

export interface Appointment {
  id: string;
  barbershop_id: string;
  client_id: string;
  staff_member_id?: string;
  service_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  service_name: string;
  service_price: number; // in cents
  products_total: number; // in cents
  duration_minutes: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  staff_name?: string;
  notes?: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  barbershop_id: string;
  name: string;
  description?: string;
  price: number; // in cents
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentProduct {
    id: string;
    appointment_id: string;
    product_id: string;
    quantity: number;
    price_at_time_of_sale: number;
}

export interface Sale {
    id: string;
    barbershop_id: string;
    client_id?: string;
    staff_member_id?: string;
    total_amount: number; // in cents
    sale_date: string;
    notes?: string;
}

export interface SaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    price_at_time_of_sale: number; // in cents
}


export interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'basico' | 'profissional' | 'premium';
  price_monthly: number; // in cents
  price_yearly: number; // in cents
  max_staff?: number; // null = unlimited
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  barbershop_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  is_trial: boolean;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}
