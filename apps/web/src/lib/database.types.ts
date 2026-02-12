export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            driver_locations: {
                Row: {
                    accuracy: number | null
                    driver_id: string | null
                    heading: number | null
                    id: string
                    latitude: number
                    longitude: number
                    recorded_at: string | null
                    speed: number | null
                    trip_id: string | null
                }
                Insert: {
                    accuracy?: number | null
                    driver_id?: string | null
                    heading?: number | null
                    id?: string
                    latitude: number
                    longitude: number
                    recorded_at?: string | null
                    speed?: number | null
                    trip_id?: string | null
                }
                Update: {
                    accuracy?: number | null
                    driver_id?: string | null
                    heading?: number | null
                    id?: string
                    latitude?: number
                    longitude?: number
                    recorded_at?: string | null
                    speed?: number | null
                    trip_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "driver_locations_driver_id_fkey"
                        columns: ["driver_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "driver_locations_trip_id_fkey"
                        columns: ["trip_id"]
                        isOneToOne: false
                        referencedRelation: "trips"
                        referencedColumns: ["id"]
                    },
                ]
            }
            external_drivers: {
                Row: {
                    created_at: string | null
                    full_name: string
                    id: string
                    is_active: boolean | null
                    languages: string[] | null
                    notes: string | null
                    organization_id: string
                    phone: string
                    photo_url: string | null
                    updated_at: string | null
                    vehicle_capacity: number | null
                    vehicle_plate: string | null
                    vehicle_type: string | null
                }
                Insert: {
                    created_at?: string | null
                    full_name: string
                    id?: string
                    is_active?: boolean | null
                    languages?: string[] | null
                    notes?: string | null
                    organization_id: string
                    phone: string
                    photo_url?: string | null
                    updated_at?: string | null
                    vehicle_capacity?: number | null
                    vehicle_plate?: string | null
                    vehicle_type?: string | null
                }
                Update: {
                    created_at?: string | null
                    full_name?: string
                    id?: string
                    is_active?: boolean | null
                    languages?: string[] | null
                    notes?: string | null
                    organization_id?: string
                    phone?: string
                    photo_url?: string | null
                    updated_at?: string | null
                    vehicle_capacity?: number | null
                    vehicle_plate?: string | null
                    vehicle_type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "external_drivers_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            itineraries: {
                Row: {
                    budget: string | null
                    created_at: string | null
                    destination: string
                    duration_days: number | null
                    id: string
                    interests: string[] | null
                    raw_data: Json
                    summary: string | null
                    trip_title: string
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    budget?: string | null
                    created_at?: string | null
                    destination: string
                    duration_days?: number | null
                    id?: string
                    interests?: string[] | null
                    raw_data: Json
                    summary?: string | null
                    trip_title: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    budget?: string | null
                    created_at?: string | null
                    destination?: string
                    duration_days?: number | null
                    id?: string
                    interests?: string[] | null
                    raw_data?: Json
                    summary?: string | null
                    trip_title?: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "itineraries_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            notification_logs: {
                Row: {
                    body: string | null
                    created_at: string | null
                    error_message: string | null
                    external_id: string | null
                    id: string
                    notification_type: string
                    recipient_id: string | null
                    recipient_phone: string | null
                    recipient_type: string | null
                    sent_at: string | null
                    status: string | null
                    title: string | null
                    trip_id: string | null
                }
                Insert: {
                    body?: string | null
                    created_at?: string | null
                    error_message?: string | null
                    external_id?: string | null
                    id?: string
                    notification_type: string
                    recipient_id?: string | null
                    recipient_phone?: string | null
                    recipient_type?: string | null
                    sent_at?: string | null
                    status?: string | null
                    title?: string | null
                    trip_id?: string | null
                }
                Update: {
                    body?: string | null
                    created_at?: string | null
                    error_message?: string | null
                    external_id?: string | null
                    id?: string
                    notification_type?: string
                    recipient_id?: string | null
                    recipient_phone?: string | null
                    recipient_type?: string | null
                    sent_at?: string | null
                    status?: string | null
                    title?: string | null
                    trip_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notification_logs_recipient_id_fkey"
                        columns: ["recipient_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "notification_logs_trip_id_fkey"
                        columns: ["trip_id"]
                        isOneToOne: false
                        referencedRelation: "trips"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organizations: {
                Row: {
                    created_at: string | null
                    id: string
                    logo_url: string | null
                    name: string
                    owner_id: string | null
                    primary_color: string | null
                    slug: string
                    subscription_tier: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    logo_url?: string | null
                    name: string
                    owner_id?: string | null
                    primary_color?: string | null
                    slug: string
                    subscription_tier?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    logo_url?: string | null
                    name?: string
                    owner_id?: string | null
                    primary_color?: string | null
                    slug?: string
                    subscription_tier?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "organizations_owner_id_fkey"
                        columns: ["owner_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    budget_max: number | null
                    budget_min: number | null
                    created_at: string | null
                    email: string | null
                    full_name: string | null
                    home_airport: string | null
                    id: string
                    interests: string[] | null
                    last_contacted_at: string | null
                    lead_status: string | null
                    lifecycle_stage: string | null
                    marketing_opt_in: boolean | null
                    notes: string | null
                    organization_id: string | null
                    phone: string | null
                    phone_normalized: string | null
                    preferred_destination: string | null
                    referral_source: string | null
                    role: string | null
                    source_channel: string | null
                    travel_style: string | null
                    travelers_count: number | null
                    updated_at: string | null
                    welcome_email_sent_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    budget_max?: number | null
                    budget_min?: number | null
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    home_airport?: string | null
                    id: string
                    interests?: string[] | null
                    last_contacted_at?: string | null
                    lead_status?: string | null
                    lifecycle_stage?: string | null
                    marketing_opt_in?: boolean | null
                    notes?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    phone_normalized?: string | null
                    preferred_destination?: string | null
                    referral_source?: string | null
                    role?: string | null
                    source_channel?: string | null
                    travel_style?: string | null
                    travelers_count?: number | null
                    updated_at?: string | null
                    welcome_email_sent_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    budget_max?: number | null
                    budget_min?: number | null
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    home_airport?: string | null
                    id?: string
                    interests?: string[] | null
                    last_contacted_at?: string | null
                    lead_status?: string | null
                    lifecycle_stage?: string | null
                    marketing_opt_in?: boolean | null
                    notes?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    phone_normalized?: string | null
                    preferred_destination?: string | null
                    referral_source?: string | null
                    role?: string | null
                    source_channel?: string | null
                    travel_style?: string | null
                    travelers_count?: number | null
                    updated_at?: string | null
                    welcome_email_sent_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            push_tokens: {
                Row: {
                    created_at: string | null
                    fcm_token: string
                    id: string
                    is_active: boolean | null
                    platform: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    fcm_token: string
                    id?: string
                    is_active?: boolean | null
                    platform?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    fcm_token?: string
                    id?: string
                    is_active?: boolean | null
                    platform?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "push_tokens_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            shared_itineraries: {
                Row: {
                    created_at: string | null
                    expires_at: string | null
                    id: string
                    itinerary_id: string | null
                    recipient_phone: string | null
                    share_code: string
                    viewed_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    itinerary_id?: string | null
                    recipient_phone?: string | null
                    share_code: string
                    viewed_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    itinerary_id?: string | null
                    recipient_phone?: string | null
                    share_code?: string
                    viewed_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "shared_itineraries_itinerary_id_fkey"
                        columns: ["itinerary_id"]
                        isOneToOne: false
                        referencedRelation: "itineraries"
                        referencedColumns: ["id"]
                    },
                ]
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
                Relationships: []
            }
            trip_driver_assignments: {
                Row: {
                    created_at: string | null
                    day_number: number
                    dropoff_location: string | null
                    external_driver_id: string | null
                    id: string
                    notes: string | null
                    notification_sent_at: string | null
                    pickup_coordinates: Json | null
                    pickup_location: string | null
                    pickup_time: string | null
                    trip_id: string
                }
                Insert: {
                    created_at?: string | null
                    day_number: number
                    dropoff_location?: string | null
                    external_driver_id?: string | null
                    id?: string
                    notes?: string | null
                    notification_sent_at?: string | null
                    pickup_coordinates?: Json | null
                    pickup_location?: string | null
                    pickup_time?: string | null
                    trip_id: string
                }
                Update: {
                    created_at?: string | null
                    day_number?: number
                    dropoff_location?: string | null
                    external_driver_id?: string | null
                    id?: string
                    notes?: string | null
                    notification_sent_at?: string | null
                    pickup_coordinates?: Json | null
                    pickup_location?: string | null
                    pickup_time?: string | null
                    trip_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "trip_driver_assignments_external_driver_id_fkey"
                        columns: ["external_driver_id"]
                        isOneToOne: false
                        referencedRelation: "external_drivers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "trip_driver_assignments_trip_id_fkey"
                        columns: ["trip_id"]
                        isOneToOne: false
                        referencedRelation: "trips"
                        referencedColumns: ["id"]
                    },
                ]
            }
            trips: {
                Row: {
                    client_id: string | null
                    created_at: string | null
                    driver_id: string | null
                    end_date: string | null
                    id: string
                    itinerary_id: string | null
                    notes: string | null
                    start_date: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    client_id?: string | null
                    created_at?: string | null
                    driver_id?: string | null
                    end_date?: string | null
                    id?: string
                    itinerary_id?: string | null
                    notes?: string | null
                    start_date?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    client_id?: string | null
                    created_at?: string | null
                    driver_id?: string | null
                    end_date?: string | null
                    id?: string
                    itinerary_id?: string | null
                    notes?: string | null
                    start_date?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "trips_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "trips_driver_id_fkey"
                        columns: ["driver_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "trips_itinerary_id_fkey"
                        columns: ["itinerary_id"]
                        isOneToOne: false
                        referencedRelation: "itineraries"
                        referencedColumns: ["id"]
                    },
                ]
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
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const
