export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    role: 'client' | 'driver' | 'admin'
                    phone: string | null
                    phone_normalized: string | null
                    preferred_destination: string | null
                    travelers_count: number | null
                    budget_min: number | null
                    budget_max: number | null
                    travel_style: string | null
                    interests: string[] | null
                    home_airport: string | null
                    notes: string | null
                    lead_status: string | null
                    lifecycle_stage: string | null
                    last_contacted_at: string | null
                    welcome_email_sent_at: string | null
                    marketing_opt_in: boolean | null
                    referral_source: string | null
                    source_channel: string | null
                    organization_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'client' | 'driver' | 'admin'
                    phone?: string | null
                    phone_normalized?: string | null
                    preferred_destination?: string | null
                    travelers_count?: number | null
                    budget_min?: number | null
                    budget_max?: number | null
                    travel_style?: string | null
                    interests?: string[] | null
                    home_airport?: string | null
                    notes?: string | null
                    lead_status?: string | null
                    lifecycle_stage?: string | null
                    last_contacted_at?: string | null
                    welcome_email_sent_at?: string | null
                    marketing_opt_in?: boolean | null
                    referral_source?: string | null
                    source_channel?: string | null
                    organization_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'client' | 'driver' | 'admin'
                    phone?: string | null
                    phone_normalized?: string | null
                    preferred_destination?: string | null
                    travelers_count?: number | null
                    budget_min?: number | null
                    budget_max?: number | null
                    travel_style?: string | null
                    interests?: string[] | null
                    home_airport?: string | null
                    notes?: string | null
                    lead_status?: string | null
                    lifecycle_stage?: string | null
                    last_contacted_at?: string | null
                    welcome_email_sent_at?: string | null
                    marketing_opt_in?: boolean | null
                    referral_source?: string | null
                    source_channel?: string | null
                    organization_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            itineraries: {
                Row: {
                    id: string
                    user_id: string | null
                    trip_title: string
                    destination: string
                    summary: string | null
                    duration_days: number
                    budget: string | null
                    interests: string[] | null
                    raw_data: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    trip_title: string
                    destination: string
                    summary?: string | null
                    duration_days?: number
                    budget?: string | null
                    interests?: string[] | null
                    raw_data: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    trip_title?: string
                    destination?: string
                    summary?: string | null
                    duration_days?: number
                    budget?: string | null
                    interests?: string[] | null
                    raw_data?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            trips: {
                Row: {
                    id: string
                    itinerary_id: string | null
                    client_id: string | null
                    driver_id: string | null
                    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
                    start_date: string | null
                    end_date: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    itinerary_id?: string | null
                    client_id?: string | null
                    driver_id?: string | null
                    status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
                    start_date?: string | null
                    end_date?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    itinerary_id?: string | null
                    client_id?: string | null
                    driver_id?: string | null
                    status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
                    start_date?: string | null
                    end_date?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            driver_locations: {
                Row: {
                    id: string
                    driver_id: string | null
                    trip_id: string | null
                    latitude: number
                    longitude: number
                    heading: number | null
                    speed: number | null
                    accuracy: number | null
                    recorded_at: string
                }
                Insert: {
                    id?: string
                    driver_id?: string | null
                    trip_id?: string | null
                    latitude: number
                    longitude: number
                    heading?: number | null
                    speed?: number | null
                    accuracy?: number | null
                    recorded_at?: string
                }
                Update: {
                    id?: string
                    driver_id?: string | null
                    trip_id?: string | null
                    latitude?: number
                    longitude?: number
                    heading?: number | null
                    speed?: number | null
                    accuracy?: number | null
                    recorded_at?: string
                }
            }
            shared_itineraries: {
                Row: {
                    id: string
                    itinerary_id: string | null
                    share_code: string
                    recipient_phone: string | null
                    expires_at: string
                    viewed_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    itinerary_id?: string | null
                    share_code: string
                    recipient_phone?: string | null
                    expires_at?: string
                    viewed_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    itinerary_id?: string | null
                    share_code?: string
                    recipient_phone?: string | null
                    expires_at?: string
                    viewed_at?: string | null
                    created_at?: string
                }
            }
            organizations: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    logo_url: string | null
                    primary_color: string
                    owner_id: string | null
                    subscription_tier: 'free' | 'pro' | 'enterprise'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    logo_url?: string | null
                    primary_color?: string
                    owner_id?: string | null
                    subscription_tier?: 'free' | 'pro' | 'enterprise'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    logo_url?: string | null
                    primary_color?: string
                    owner_id?: string | null
                    subscription_tier?: 'free' | 'pro' | 'enterprise'
                    created_at?: string
                    updated_at?: string
                }
            }
            external_drivers: {
                Row: {
                    id: string
                    organization_id: string
                    full_name: string
                    phone: string
                    vehicle_type: 'sedan' | 'suv' | 'van' | 'minibus' | 'bus' | null
                    vehicle_plate: string | null
                    vehicle_capacity: number
                    languages: string[] | null
                    photo_url: string | null
                    notes: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    full_name: string
                    phone: string
                    vehicle_type?: 'sedan' | 'suv' | 'van' | 'minibus' | 'bus' | null
                    vehicle_plate?: string | null
                    vehicle_capacity?: number
                    languages?: string[] | null
                    photo_url?: string | null
                    notes?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    full_name?: string
                    phone?: string
                    vehicle_type?: 'sedan' | 'suv' | 'van' | 'minibus' | 'bus' | null
                    vehicle_plate?: string | null
                    vehicle_capacity?: number
                    languages?: string[] | null
                    photo_url?: string | null
                    notes?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            trip_driver_assignments: {
                Row: {
                    id: string
                    trip_id: string
                    external_driver_id: string | null
                    day_number: number
                    pickup_time: string | null
                    pickup_location: string | null
                    pickup_coordinates: Json | null
                    dropoff_location: string | null
                    notes: string | null
                    notification_sent_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    trip_id: string
                    external_driver_id?: string | null
                    day_number: number
                    pickup_time?: string | null
                    pickup_location?: string | null
                    pickup_coordinates?: Json | null
                    dropoff_location?: string | null
                    notes?: string | null
                    notification_sent_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    trip_id?: string
                    external_driver_id?: string | null
                    day_number?: number
                    pickup_time?: string | null
                    pickup_location?: string | null
                    pickup_coordinates?: Json | null
                    dropoff_location?: string | null
                    notes?: string | null
                    notification_sent_at?: string | null
                    created_at?: string
                }
            }
            trip_accommodations: {
                Row: {
                    id: string
                    trip_id: string
                    day_number: number
                    hotel_name: string
                    address: string | null
                    coordinates: Json | null
                    check_in_time: string
                    check_out_time: string
                    confirmation_number: string | null
                    contact_phone: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    trip_id: string
                    day_number: number
                    hotel_name: string
                    address?: string | null
                    coordinates?: Json | null
                    check_in_time?: string
                    check_out_time?: string
                    confirmation_number?: string | null
                    contact_phone?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    trip_id?: string
                    day_number?: number
                    hotel_name?: string
                    address?: string | null
                    coordinates?: Json | null
                    check_in_time?: string
                    check_out_time?: string
                    confirmation_number?: string | null
                    contact_phone?: string | null
                    notes?: string | null
                    created_at?: string
                }
            }
            push_tokens: {
                Row: {
                    id: string
                    user_id: string
                    fcm_token: string
                    platform: 'ios' | 'android'
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    fcm_token: string
                    platform: 'ios' | 'android'
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    fcm_token?: string
                    platform?: 'ios' | 'android'
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            notification_logs: {
                Row: {
                    id: string
                    trip_id: string | null
                    recipient_id: string | null
                    recipient_phone: string | null
                    recipient_type: 'client' | 'driver' | null
                    notification_type: 'trip_confirmed' | 'driver_assigned' | 'daily_briefing' | 'client_landed' | 'itinerary_update' | 'manual' | 'general'
                    title: string | null
                    body: string | null
                    status: 'pending' | 'sent' | 'delivered' | 'failed'
                    external_id: string | null
                    error_message: string | null
                    sent_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    trip_id?: string | null
                    recipient_id?: string | null
                    recipient_phone?: string | null
                    recipient_type?: 'client' | 'driver' | null
                    notification_type: 'trip_confirmed' | 'driver_assigned' | 'daily_briefing' | 'client_landed' | 'itinerary_update' | 'manual' | 'general'
                    title?: string | null
                    body?: string | null
                    status?: 'pending' | 'sent' | 'delivered' | 'failed'
                    external_id?: string | null
                    error_message?: string | null
                    sent_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    trip_id?: string | null
                    recipient_id?: string | null
                    recipient_phone?: string | null
                    recipient_type?: 'client' | 'driver' | null
                    notification_type?: 'trip_confirmed' | 'driver_assigned' | 'daily_briefing' | 'client_landed' | 'itinerary_update'
                    title?: string | null
                    body?: string | null
                    status?: 'pending' | 'sent' | 'delivered' | 'failed'
                    external_id?: string | null
                    error_message?: string | null
                    sent_at?: string | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
