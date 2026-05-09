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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          transcript: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          transcript?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          transcript?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          created_at: string
          due_date: string
          due_time: string | null
          id: string
          lead_id: string
          outcome: string | null
          reminder_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          due_time?: string | null
          id?: string
          lead_id: string
          outcome?: string | null
          reminder_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          due_time?: string | null
          id?: string
          lead_id?: string
          outcome?: string | null
          reminder_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_products: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          product: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          product: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          product?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_products_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          alternate_phone: string | null
          architect_name: string | null
          company_name: string | null
          contact_name: string | null
          contact_phone: string | null
          contractor_name: string | null
          created_at: string
          estimated_budget: number | null
          expected_completion: string | null
          id: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          num_floors: number | null
          owner_id: string
          priority: Database["public"]["Enums"]["lead_priority"]
          project_size_sqft: number | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          site_address: string | null
          site_name: string
          stage: Database["public"]["Enums"]["construction_stage"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          alternate_phone?: string | null
          architect_name?: string | null
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contractor_name?: string | null
          created_at?: string
          estimated_budget?: number | null
          expected_completion?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          num_floors?: number | null
          owner_id: string
          priority?: Database["public"]["Enums"]["lead_priority"]
          project_size_sqft?: number | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          site_address?: string | null
          site_name: string
          stage?: Database["public"]["Enums"]["construction_stage"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          alternate_phone?: string | null
          architect_name?: string | null
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contractor_name?: string | null
          created_at?: string
          estimated_budget?: number | null
          expected_completion?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          num_floors?: number | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["lead_priority"]
          project_size_sqft?: number | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          site_address?: string | null
          site_name?: string
          stage?: Database["public"]["Enums"]["construction_stage"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          id: string
          image_type: string
          image_url: string
          lead_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_type?: string
          image_url: string
          lead_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          lead_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sales_rep"
      construction_stage:
        | "Excavation"
        | "Foundation"
        | "RCC Structure"
        | "Brickwork"
        | "Plaster"
        | "Waterproofing"
        | "Electrical Rough-In"
        | "Plumbing Rough-In"
        | "Flooring"
        | "Ceiling"
        | "Painting"
        | "Interior Fit-Out"
        | "Façade Installation"
        | "Final Finishing"
        | "Handover"
      lead_priority: "Hot" | "Warm" | "Cold"
      lead_status:
        | "New"
        | "Qualified"
        | "Quotation Sent"
        | "Negotiation"
        | "Follow-Up"
        | "Converted"
        | "Lost"
        | "Dormant"
      project_type:
        | "Residential"
        | "Commercial"
        | "Retail"
        | "Hospitality"
        | "Institutional"
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
      app_role: ["admin", "sales_rep"],
      construction_stage: [
        "Excavation",
        "Foundation",
        "RCC Structure",
        "Brickwork",
        "Plaster",
        "Waterproofing",
        "Electrical Rough-In",
        "Plumbing Rough-In",
        "Flooring",
        "Ceiling",
        "Painting",
        "Interior Fit-Out",
        "Façade Installation",
        "Final Finishing",
        "Handover",
      ],
      lead_priority: ["Hot", "Warm", "Cold"],
      lead_status: [
        "New",
        "Qualified",
        "Quotation Sent",
        "Negotiation",
        "Follow-Up",
        "Converted",
        "Lost",
        "Dormant",
      ],
      project_type: [
        "Residential",
        "Commercial",
        "Retail",
        "Hospitality",
        "Institutional",
      ],
    },
  },
} as const
