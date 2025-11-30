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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      directories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_videos: {
        Row: {
          added_at: string | null
          directory_id: string
          id: string
          video_id: string
        }
        Insert: {
          added_at?: string | null
          directory_id: string
          id?: string
          video_id: string
        }
        Update: {
          added_at?: string | null
          directory_id?: string
          id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_videos_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "directories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          type: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          type?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          type?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_videos: {
        Row: {
          added_at: string | null
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          hide_adult_content: boolean | null
          hide_child_content: boolean | null
          hide_sexual_content: boolean | null
          hide_under19_content: boolean | null
          hide_violence_drugs_content: boolean | null
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hide_adult_content?: boolean | null
          hide_child_content?: boolean | null
          hide_sexual_content?: boolean | null
          hide_under19_content?: boolean | null
          hide_violence_drugs_content?: boolean | null
          id: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hide_adult_content?: boolean | null
          hide_child_content?: boolean | null
          hide_sexual_content?: boolean | null
          hide_under19_content?: boolean | null
          hide_violence_drugs_content?: boolean | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          badge_type: Database["public"]["Enums"]["badge_type"]
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_type: Database["public"]["Enums"]["badge_type"]
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_type?: Database["public"]["Enums"]["badge_type"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          age_restriction: string[] | null
          ai_solution: Database["public"]["Enums"]["ai_solution"] | null
          category: Database["public"]["Enums"]["video_category"] | null
          created_at: string | null
          creator_id: string
          description: string | null
          duration: number | null
          has_sexual_content: boolean | null
          has_violence_drugs: boolean | null
          id: string
          prompt_command: string | null
          show_prompt: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          video_url: string
          views: number | null
        }
        Insert: {
          age_restriction?: string[] | null
          ai_solution?: Database["public"]["Enums"]["ai_solution"] | null
          category?: Database["public"]["Enums"]["video_category"] | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration?: number | null
          has_sexual_content?: boolean | null
          has_violence_drugs?: boolean | null
          id?: string
          prompt_command?: string | null
          show_prompt?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          video_url: string
          views?: number | null
        }
        Update: {
          age_restriction?: string[] | null
          ai_solution?: Database["public"]["Enums"]["ai_solution"] | null
          category?: Database["public"]["Enums"]["video_category"] | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration?: number | null
          has_sexual_content?: boolean | null
          has_violence_drugs?: boolean | null
          id?: string
          prompt_command?: string | null
          show_prompt?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          video_id: string
          watched_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          watched_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
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
      ai_solution: "NanoBanana" | "Veo" | "Sora" | "Runway" | "Pika" | "Other"
      badge_type: "best" | "official"
      video_category:
        | "education"
        | "commercial"
        | "fiction"
        | "podcast"
        | "entertainment"
        | "tutorial"
        | "other"
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
      ai_solution: ["NanoBanana", "Veo", "Sora", "Runway", "Pika", "Other"],
      badge_type: ["best", "official"],
      video_category: [
        "education",
        "commercial",
        "fiction",
        "podcast",
        "entertainment",
        "tutorial",
        "other",
      ],
    },
  },
} as const
