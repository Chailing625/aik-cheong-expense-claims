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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      claim_days: {
        Row: {
          accom: number
          claim_id: string
          day: number
          ent: number
          food: number
          location: string
          others: number
          parking: number
          petrol: number
          toll: number
        }
        Insert: {
          accom?: number
          claim_id: string
          day: number
          ent?: number
          food?: number
          location?: string
          others?: number
          parking?: number
          petrol?: number
          toll?: number
        }
        Update: {
          accom?: number
          claim_id?: string
          day?: number
          ent?: number
          food?: number
          location?: string
          others?: number
          parking?: number
          petrol?: number
          toll?: number
        }
        Relationships: [
          {
            foreignKeyName: "claim_days_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_events: {
        Row: {
          actor: string
          claim_id: string
          comment: string | null
          created_at: string
          event_date: string
          id: string
          label: string
          type: string
        }
        Insert: {
          actor: string
          claim_id: string
          comment?: string | null
          created_at?: string
          event_date?: string
          id?: string
          label: string
          type: string
        }
        Update: {
          actor?: string
          claim_id?: string
          comment?: string | null
          created_at?: string
          event_date?: string
          id?: string
          label?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_receipts: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          name: string
          note: string
          storage_path: string
          type: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          name: string
          note?: string
          storage_path: string
          type: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          name?: string
          note?: string
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_receipts_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          checked_by_date: string | null
          checked_by_name: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          half: number
          id: string
          notes: string
          period_month: string
          period_text: string
          reference_no: string
          reject_reason: string | null
          salesperson_id: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          checked_by_date?: string | null
          checked_by_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          half: number
          id?: string
          notes?: string
          period_month: string
          period_text: string
          reference_no?: string
          reject_reason?: string | null
          salesperson_id: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          checked_by_date?: string | null
          checked_by_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          half?: number
          id?: string
          notes?: string
          period_month?: string
          period_text?: string
          reference_no?: string
          reject_reason?: string | null
          salesperson_id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: string | null
          salesperson_id: string | null
          username: string | null
        }
        Insert: {
          active?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          role?: string | null
          salesperson_id?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: string | null
          salesperson_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      salespeople: {
        Row: {
          account_name: string
          account_no: string
          area: string
          bank: string
          created_at: string
          id: string
          name: string
          position: string
          suspended: boolean
        }
        Insert: {
          account_name: string
          account_no: string
          area: string
          bank: string
          created_at?: string
          id?: string
          name: string
          position: string
          suspended?: boolean
        }
        Update: {
          account_name?: string
          account_no?: string
          area?: string
          bank?: string
          created_at?: string
          id?: string
          name?: string
          position?: string
          suspended?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_decide: { Args: never; Returns: boolean }
      current_app_role: { Args: never; Returns: string }
      decide_claims: {
        Args: { p_approve: boolean; p_comment?: string; p_ids: string[] }
        Returns: undefined
      }
      delete_claim: { Args: { p_id: string }; Returns: undefined }
      has_perm: { Args: { p_perm: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      malaysia_today: { Args: never; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
