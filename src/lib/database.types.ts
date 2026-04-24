/** Matches CHECK constraint on load_events.event_type */
export type LoadEventTypeDb =
  | 'arrived'
  | 'checked_in'
  | 'moved'
  | 'loading_started'
  | 'departed';

export type Database = {
  public: {
    Tables: {
      dispatchers: {
        Row: {
          id: string;
          user_id: string | null;
          company_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          company_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          company_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          dispatcher_id: string;
          name: string;
          phone: string;
          created_at: string;
          current_lat: number | null;
          current_long: number | null;
          last_gps_update: string | null;
          is_tracking: boolean | null;
          truck_id: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          dispatcher_id: string;
          name?: string;
          phone?: string;
          created_at?: string;
          current_lat?: number | null;
          current_long?: number | null;
          last_gps_update?: string | null;
          is_tracking?: boolean | null;
          truck_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          dispatcher_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
          current_lat?: number | null;
          current_long?: number | null;
          last_gps_update?: string | null;
          is_tracking?: boolean | null;
          truck_id?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      loads: {
        Row: {
          id: string;
          dispatcher_id: string;
          driver_id: string | null;
          status: string;
          facility_address: string;
          scheduled_time: string | null;
          created_at: string;
          facility_lat: string | null;
          facility_long: string | null;
          load_number: string;
          tracking_id: string | null;
          free_time_hours: number;
          rate_per_hour: number;
        };
        Insert: {
          id?: string;
          dispatcher_id: string;
          driver_id?: string | null;
          status?: string;
          facility_address?: string;
          scheduled_time?: string | null;
          created_at?: string;
          facility_lat?: string | null;
          facility_long?: string | null;
          load_number?: string;
          tracking_id?: string | null;
          free_time_hours?: number;
          rate_per_hour?: number;
        };
        Update: {
          id?: string;
          dispatcher_id?: string;
          driver_id?: string | null;
          status?: string;
          facility_address?: string;
          scheduled_time?: string | null;
          created_at?: string;
          facility_lat?: string | null;
          facility_long?: string | null;
          load_number?: string;
          tracking_id?: string | null;
          free_time_hours?: number;
          rate_per_hour?: number;
        };
        Relationships: [];
      };
      detention_events: {
        Row: {
          id: string;
          load_id: string;
          arrival_time: string | null;
          departure_time: string | null;
          gps_lat: string | null;
          gps_long: string | null;
          bol_url: string;
          created_at: string;
          status: string | null;
        };
        Insert: {
          id?: string;
          load_id: string;
          arrival_time?: string | null;
          departure_time?: string | null;
          gps_lat?: string | null;
          gps_long?: string | null;
          bol_url?: string;
          created_at?: string;
          status?: string | null;
        };
        Update: {
          id?: string;
          load_id?: string;
          arrival_time?: string | null;
          departure_time?: string | null;
          gps_lat?: string | null;
          gps_long?: string | null;
          bol_url?: string;
          created_at?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          plan_type: string | null;
          current_period_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          plan_type?: string | null;
          current_period_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          plan_type?: string | null;
          current_period_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
        };
        Insert: {
          id: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [];
      };
      load_events: {
        Row: {
          id: string;
          load_id: string;
          event_type: LoadEventTypeDb;
          timestamp: string;
          gps_lat: string | null;
          gps_long: string | null;
          note: string | null;
          created_at: string;
          source: 'system' | 'user';
          edited_at: string | null;
          original_timestamp: string | null;
        };
        Insert: {
          id?: string;
          load_id: string;
          event_type: LoadEventTypeDb;
          timestamp?: string;
          gps_lat?: string | null;
          gps_long?: string | null;
          note?: string | null;
          created_at?: string;
          source?: 'system' | 'user';
          edited_at?: string | null;
          original_timestamp?: string | null;
        };
        Update: {
          id?: string;
          load_id?: string;
          event_type?: LoadEventTypeDb;
          timestamp?: string;
          gps_lat?: string | null;
          gps_long?: string | null;
          note?: string | null;
          created_at?: string;
          source?: 'system' | 'user';
          edited_at?: string | null;
          original_timestamp?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      insert_load_event_via_tracking: {
        Args: {
          p_tracking_id: string;
          p_event_type: LoadEventTypeDb;
          p_timestamp?: string;
          p_gps_lat?: number | null;
          p_gps_long?: number | null;
          p_note?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
