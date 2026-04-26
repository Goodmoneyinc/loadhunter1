export interface Dispatcher {
  id: string;
  user_id: string;
  company_name: string;
  created_at: string;
}

export interface Driver {
  id: string;
  dispatcher_id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Load {
  id: string;
  load_number: string;
  dispatcher_id: string;
  tracking_id: string | null;
  free_time_hours: number;
  rate_per_hour: number;
  driver_id: string | null;
  status: string;
  facility_address: string;
  scheduled_time: string;
  created_at: string;
  driver?: Driver;
}

export type LoadInsert = Omit<Load, 'id' | 'created_at'> & {
  free_time_hours?: number;
  rate_per_hour?: number;
};

export interface DetentionEvent {
  id: string;
  load_id: string;
  arrival_time: string;
  departure_time: string | null;
  gps_lat: number;
  gps_long: number;
  bol_url: string;
  created_at: string;
}

export interface DashboardStats {
  totalActive: number;
  onTime: number;
  delayed: number;
  avgDetention: number;
}
