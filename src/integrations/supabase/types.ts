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
      ai_insights: {
        Row: {
          action_items: Json | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean
          property_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean
          property_id?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean
          property_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_workflows: {
        Row: {
          action_config: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          updated_at: string
          user_id: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Insert: {
          action_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          updated_at?: string
          user_id: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Update: {
          action_config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          updated_at?: string
          user_id?: string
          workflow_type?: Database["public"]["Enums"]["workflow_type"]
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          expires_at: string
          guest_count: number
          id: string
          notes: string | null
          payment_status: string
          property_id: string
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          expires_at?: string
          guest_count?: number
          id?: string
          notes?: string | null
          payment_status?: string
          property_id: string
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          expires_at?: string
          guest_count?: number
          id?: string
          notes?: string | null
          payment_status?: string
          property_id?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          compliance_item_id: string
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_dismissed: boolean
          message: string
          property_id: string
        }
        Insert: {
          alert_type: string
          compliance_item_id: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          message: string
          property_id: string
        }
        Update: {
          alert_type?: string
          compliance_item_id?: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          message?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          category: Database["public"]["Enums"]["compliance_category"]
          created_at: string
          description: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          inspector_name: string | null
          issue_date: string | null
          last_inspection_date: string | null
          name: string
          next_inspection_date: string | null
          notes: string | null
          property_id: string
          reminder_days: number | null
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          description?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          inspector_name?: string | null
          issue_date?: string | null
          last_inspection_date?: string | null
          name: string
          next_inspection_date?: string | null
          notes?: string | null
          property_id: string
          reminder_days?: number | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          description?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          inspector_name?: string | null
          issue_date?: string | null
          last_inspection_date?: string | null
          name?: string
          next_inspection_date?: string | null
          notes?: string | null
          property_id?: string
          reminder_days?: number | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_assignments: {
        Row: {
          assigned_at: string
          consultant_id: string
          id: string
          property_id: string
        }
        Insert: {
          assigned_at?: string
          consultant_id: string
          id?: string
          property_id: string
        }
        Update: {
          assigned_at?: string
          consultant_id?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          name: string
          property_id: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          name: string
          property_id?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          property_id?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          payment_method: string | null
          property_id: string
          reference_number: string | null
          tenant_id: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          property_id: string
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          property_id?: string
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_agreements: {
        Row: {
          created_at: string
          currency: string
          document_id: string | null
          id: string
          landlord_name: string
          landlord_signed: boolean
          landlord_signed_at: string | null
          landlord_user_id: string
          lease_end: string
          lease_start: string
          property_id: string
          rent_amount: number
          status: string
          tenant_name: string
          tenant_signed: boolean
          tenant_signed_at: string | null
          tenant_user_id: string
          terms: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          document_id?: string | null
          id?: string
          landlord_name: string
          landlord_signed?: boolean
          landlord_signed_at?: string | null
          landlord_user_id: string
          lease_end: string
          lease_start: string
          property_id: string
          rent_amount: number
          status?: string
          tenant_name: string
          tenant_signed?: boolean
          tenant_signed_at?: string | null
          tenant_user_id: string
          terms?: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          document_id?: string | null
          id?: string
          landlord_name?: string
          landlord_signed?: boolean
          landlord_signed_at?: string | null
          landlord_user_id?: string
          lease_end?: string
          lease_start?: string
          property_id?: string
          rent_amount?: number
          status?: string
          tenant_name?: string
          tenant_signed?: boolean
          tenant_signed_at?: string | null
          tenant_user_id?: string
          terms?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_agreements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          photo_urls: string[] | null
          priority: string
          property_id: string
          rating: number | null
          repair_notes: string | null
          resolved_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          photo_urls?: string[] | null
          priority?: string
          property_id: string
          rating?: number | null
          repair_notes?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          photo_urls?: string[] | null
          priority?: string
          property_id?: string
          rating?: number | null
          repair_notes?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_metrics: {
        Row: {
          calculated_at: string
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          property_id: string | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          property_id?: string | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_metrics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          acquisition_cost: number | null
          address: string
          amenities: Json
          annual_expenses: number | null
          created_at: string
          currency: string
          current_value: number | null
          description: string | null
          id: string
          image_url: string | null
          landlord_id: string | null
          listing_type: string
          monthly_rent: number
          name: string
          property_type: string
          region: string
          units: number
          updated_at: string
        }
        Insert: {
          acquisition_cost?: number | null
          address: string
          amenities?: Json
          annual_expenses?: number | null
          created_at?: string
          currency?: string
          current_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          landlord_id?: string | null
          listing_type?: string
          monthly_rent?: number
          name: string
          property_type?: string
          region?: string
          units?: number
          updated_at?: string
        }
        Update: {
          acquisition_cost?: number | null
          address?: string
          amenities?: Json
          annual_expenses?: number | null
          created_at?: string
          currency?: string
          current_value?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          landlord_id?: string | null
          listing_type?: string
          monthly_rent?: number
          name?: string
          property_type?: string
          region?: string
          units?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempts: number
          blocked_until: string | null
          created_at: string
          first_attempt: string
          id: string
          identifier: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt?: string
          id?: string
          identifier: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt?: string
          id?: string
          identifier?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          features: Json
          id: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          property_limit: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          property_limit?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          property_limit?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_requests: {
        Row: {
          category: string
          created_at: string
          id: string
          landlord_response: string | null
          message: string
          priority: string
          property_id: string
          responded_at: string | null
          status: string
          subject: string
          tenant_user_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          landlord_response?: string | null
          message: string
          priority?: string
          property_id: string
          responded_at?: string | null
          status?: string
          subject: string
          tenant_user_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          landlord_response?: string | null
          message?: string
          priority?: string
          property_id?: string
          responded_at?: string | null
          status?: string
          subject?: string
          tenant_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          lease_end: string
          lease_start: string
          payment_status: string
          property_id: string
          rent_amount: number
          tenant_type: string
          unit_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lease_end: string
          lease_start: string
          payment_status?: string
          property_id: string
          rent_amount: number
          tenant_type?: string
          unit_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lease_end?: string
          lease_start?: string
          payment_status?: string
          property_id?: string
          rent_amount?: number
          tenant_type?: string
          unit_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["workflow_type"]
          created_at: string
          dismissed_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          property_id: string | null
          read_at: string | null
          severity: string
          tenant_id: string | null
          title: string
          triggered_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["workflow_type"]
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          property_id?: string | null
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title: string
          triggered_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["workflow_type"]
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          property_id?: string | null
          read_at?: string | null
          severity?: string
          tenant_id?: string | null
          title?: string
          triggered_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_alerts_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_maintenance_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_subscription: {
        Args: { _user_id: string }
        Returns: {
          features: Json
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          property_limit: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_consultant_for_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_landlord_of_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_of_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      release_expired_bookings: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "consultant" | "landlord" | "tenant" | "maintenance"
      compliance_category:
        | "tenancy_agreement"
        | "land_title"
        | "service_charge"
        | "building_permit"
        | "fire_safety"
        | "environmental"
        | "utility_registration"
        | "insurance"
        | "other"
      compliance_status:
        | "compliant"
        | "pending"
        | "expired"
        | "non_compliant"
        | "not_applicable"
      subscription_plan: "free" | "basic" | "pro" | "business"
      workflow_status: "active" | "paused" | "triggered" | "completed"
      workflow_type:
        | "overdue_rent"
        | "lease_expiry"
        | "low_occupancy"
        | "compliance_expiry"
        | "high_maintenance"
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
    Enums: {
      app_role: ["admin", "consultant", "landlord", "tenant", "maintenance"],
      compliance_category: [
        "tenancy_agreement",
        "land_title",
        "service_charge",
        "building_permit",
        "fire_safety",
        "environmental",
        "utility_registration",
        "insurance",
        "other",
      ],
      compliance_status: [
        "compliant",
        "pending",
        "expired",
        "non_compliant",
        "not_applicable",
      ],
      subscription_plan: ["free", "basic", "pro", "business"],
      workflow_status: ["active", "paused", "triggered", "completed"],
      workflow_type: [
        "overdue_rent",
        "lease_expiry",
        "low_occupancy",
        "compliance_expiry",
        "high_maintenance",
      ],
    },
  },
} as const
