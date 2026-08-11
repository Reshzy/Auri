export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          employee_name: string;
          employee_title: string | null;
          organization_name: string | null;
          office_name: string | null;
          department_name: string | null;
          timezone: string;
          locale: string;
          active_schedule_id: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          employee_name?: string;
          employee_title?: string | null;
          organization_name?: string | null;
          office_name?: string | null;
          department_name?: string | null;
          timezone?: string;
          locale?: string;
          active_schedule_id?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_name?: string;
          employee_title?: string | null;
          organization_name?: string | null;
          office_name?: string | null;
          department_name?: string | null;
          timezone?: string;
          locale?: string;
          active_schedule_id?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_schedules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          weekday_rules: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          weekday_rules: Json;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          weekday_rules?: Json;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      signatories: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          title: string;
          slot: number;
          is_active: boolean;
          effective_from: string | null;
          effective_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          title: string;
          slot: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          title?: string;
          slot?: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accomplishment_presets: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          content: string;
          category: string | null;
          shortcut: string | null;
          use_count: number;
          last_used_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          content: string;
          category?: string | null;
          shortcut?: string | null;
          use_count?: number;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          content?: string;
          category?: string | null;
          shortcut?: string | null;
          use_count?: number;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_periods: {
        Row: {
          id: string;
          user_id: string;
          period_kind: string;
          start_date: string;
          end_date: string;
          status: string;
          schedule_snapshot: Json;
          profile_snapshot: Json;
          signatory_snapshot: Json;
          finalized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_kind: string;
          start_date: string;
          end_date: string;
          status?: string;
          schedule_snapshot: Json;
          profile_snapshot: Json;
          signatory_snapshot: Json;
          finalized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_kind?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          schedule_snapshot?: Json;
          profile_snapshot?: Json;
          signatory_snapshot?: Json;
          finalized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_entries: {
        Row: {
          id: string;
          report_period_id: string;
          user_id: string;
          work_date: string;
          classification: string;
          classification_label: string | null;
          am_arrival: string | null;
          am_departure: string | null;
          pm_arrival: string | null;
          pm_departure: string | null;
          worked_minutes: number;
          calculated_undertime_minutes: number;
          undertime_override_minutes: number | null;
          accomplishments: string[];
          remarks: string | null;
          is_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_period_id: string;
          user_id: string;
          work_date: string;
          classification: string;
          classification_label?: string | null;
          am_arrival?: string | null;
          am_departure?: string | null;
          pm_arrival?: string | null;
          pm_departure?: string | null;
          worked_minutes?: number;
          calculated_undertime_minutes?: number;
          undertime_override_minutes?: number | null;
          accomplishments?: string[];
          remarks?: string | null;
          is_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_period_id?: string;
          user_id?: string;
          work_date?: string;
          classification?: string;
          classification_label?: string | null;
          am_arrival?: string | null;
          am_departure?: string | null;
          pm_arrival?: string | null;
          pm_departure?: string | null;
          worked_minutes?: number;
          calculated_undertime_minutes?: number;
          undertime_override_minutes?: number | null;
          accomplishments?: string[];
          remarks?: string | null;
          is_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      template_versions: {
        Row: {
          id: string;
          template_key: string;
          version: number;
          file_type: string;
          storage_path: string;
          sha256: string;
          manifest: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_key: string;
          version: number;
          file_type: string;
          storage_path: string;
          sha256: string;
          manifest?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_key?: string;
          version?: number;
          file_type?: string;
          storage_path?: string;
          sha256?: string;
          manifest?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_exports: {
        Row: {
          id: string;
          user_id: string;
          report_period_id: string;
          template_version_id: string;
          format: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          sha256: string;
          source_revision: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_period_id: string;
          template_version_id: string;
          format: string;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          sha256: string;
          source_revision: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_period_id?: string;
          template_version_id?: string;
          format?: string;
          storage_path?: string;
          file_name?: string;
          file_size_bytes?: number;
          sha256?: string;
          source_revision?: string;
          is_current?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
