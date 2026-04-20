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
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      breakthroughs: {
        Row: {
          achieved_at: string
          friction: string
          grease: string
          id: string
          insight: string
          session_id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          friction: string
          grease: string
          id?: string
          insight: string
          session_id: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          friction?: string
          grease?: string
          id?: string
          insight?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakthroughs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_events: {
        Row: {
          applicable_regulations: string[] | null
          created_at: string
          event_id: string
          event_ts: string
          event_type: string
          id: string
          jurisdiction: string
          payload: Json | null
          processing_time_ms: number | null
          request_id: string
          session_hash: string
        }
        Insert: {
          applicable_regulations?: string[] | null
          created_at?: string
          event_id: string
          event_ts?: string
          event_type: string
          id?: string
          jurisdiction?: string
          payload?: Json | null
          processing_time_ms?: number | null
          request_id: string
          session_hash: string
        }
        Update: {
          applicable_regulations?: string[] | null
          created_at?: string
          event_id?: string
          event_ts?: string
          event_type?: string
          id?: string
          jurisdiction?: string
          payload?: Json | null
          processing_time_ms?: number | null
          request_id?: string
          session_hash?: string
        }
        Relationships: []
      }
      compliance_request_runs: {
        Row: {
          blocked: boolean | null
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          escalated: boolean | null
          jurisdiction: string
          request_id: string
          session_hash: string
          status: string
          total_events: number | null
          total_time_ms: number | null
          user_hash: string | null
          user_tier: string | null
        }
        Insert: {
          blocked?: boolean | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          escalated?: boolean | null
          jurisdiction?: string
          request_id: string
          session_hash: string
          status?: string
          total_events?: number | null
          total_time_ms?: number | null
          user_hash?: string | null
          user_tier?: string | null
        }
        Update: {
          blocked?: boolean | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          escalated?: boolean | null
          jurisdiction?: string
          request_id?: string
          session_hash?: string
          status?: string
          total_events?: number | null
          total_time_ms?: number | null
          user_hash?: string | null
          user_tier?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_session_at: string | null
          streak_days: number
          tier: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_session_at?: string | null
          streak_days?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_session_at?: string | null
          streak_days?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_connections: {
        Row: {
          created_at: string
          from_entity_id: string
          id: string
          session_id: string
          strength: number
          to_entity_id: string
          type: string
        }
        Insert: {
          created_at?: string
          from_entity_id: string
          id?: string
          session_id: string
          strength?: number
          to_entity_id: string
          type: string
        }
        Update: {
          created_at?: string
          from_entity_id?: string
          id?: string
          session_id?: string
          strength?: number
          to_entity_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_connections_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "session_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_connections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_connections_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "session_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      session_entities: {
        Row: {
          created_at: string
          id: string
          label: string
          metadata: Json | null
          session_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          metadata?: Json | null
          session_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          metadata?: Json | null
          session_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_entities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
