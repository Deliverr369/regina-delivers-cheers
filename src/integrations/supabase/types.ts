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
      bulk_image_jobs: {
        Row: {
          attempts: number
          confidence: string | null
          created_at: string
          error_message: string | null
          file_name: string
          final_image_url: string | null
          id: string
          identified_category: string | null
          identified_name: string | null
          identified_size: string | null
          is_existing: boolean | null
          processed_at: string | null
          product_ids: string[] | null
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          confidence?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          final_image_url?: string | null
          id?: string
          identified_category?: string | null
          identified_name?: string | null
          identified_size?: string | null
          is_existing?: boolean | null
          processed_at?: string | null
          product_ids?: string[] | null
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          confidence?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          final_image_url?: string | null
          id?: string
          identified_category?: string | null
          identified_name?: string | null
          identified_size?: string | null
          is_existing?: boolean | null
          processed_at?: string | null
          product_ids?: string[] | null
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_match_jobs: {
        Row: {
          batch_size: number
          created_at: string
          enabled: boolean
          id: string
          last_error: string | null
          last_processed: number | null
          last_remaining: number | null
          last_run_at: string | null
          last_updated: number | null
          min_score: number
          source_label: string
          source_url: string
          total_runs: number
          total_updated: number
          updated_at: string
        }
        Insert: {
          batch_size?: number
          created_at?: string
          enabled?: boolean
          id: string
          last_error?: string | null
          last_processed?: number | null
          last_remaining?: number | null
          last_run_at?: string | null
          last_updated?: number | null
          min_score?: number
          source_label: string
          source_url: string
          total_runs?: number
          total_updated?: number
          updated_at?: string
        }
        Update: {
          batch_size?: number
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_processed?: number | null
          last_remaining?: number | null
          last_run_at?: string | null
          last_updated?: number | null
          min_score?: number
          source_label?: string
          source_url?: string
          total_runs?: number
          total_updated?: number
          updated_at?: string
        }
        Relationships: []
      }
      import_drafts: {
        Row: {
          assigned_store_ids: string[] | null
          availability: string | null
          brand: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          image_action: string | null
          imported_image_url: string | null
          imported_price: number | null
          match_status: string
          matched_product_id: string | null
          price_action: string | null
          product_name: string
          review_notes: string | null
          review_status: string
          session_id: string
          size: string | null
          sku: string | null
          source_url: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          assigned_store_ids?: string[] | null
          availability?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_action?: string | null
          imported_image_url?: string | null
          imported_price?: number | null
          match_status?: string
          matched_product_id?: string | null
          price_action?: string | null
          product_name: string
          review_notes?: string | null
          review_status?: string
          session_id: string
          size?: string | null
          sku?: string | null
          source_url?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          assigned_store_ids?: string[] | null
          availability?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_action?: string | null
          imported_image_url?: string | null
          imported_price?: number | null
          match_status?: string
          matched_product_id?: string | null
          price_action?: string | null
          product_name?: string
          review_notes?: string | null
          review_status?: string
          session_id?: string
          size?: string | null
          sku?: string | null
          source_url?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_drafts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sessions: {
        Row: {
          approved_count: number | null
          created_at: string
          failed_count: number | null
          id: string
          import_type: string
          imported_count: number | null
          rejected_count: number | null
          source_domain: string | null
          source_name: string | null
          source_url: string
          status: string
          total_scanned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_count?: number | null
          created_at?: string
          failed_count?: number | null
          id?: string
          import_type?: string
          imported_count?: number | null
          rejected_count?: number | null
          source_domain?: string | null
          source_name?: string | null
          source_url: string
          status?: string
          total_scanned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_count?: number | null
          created_at?: string
          failed_count?: number | null
          id?: string
          import_type?: string
          imported_count?: number | null
          rejected_count?: number | null
          source_domain?: string | null
          source_name?: string | null
          source_url?: string
          status?: string
          total_scanned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          estimated_price: number | null
          final_price: number | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_price_adjustments: {
        Row: {
          changed_by: string | null
          created_at: string
          field: string
          id: string
          new_value: number | null
          old_value: number | null
          order_id: string
          order_item_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          order_id: string
          order_item_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          order_id?: string
          order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_price_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_price_adjustments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          authorized_amount: number | null
          convenience_fee: number | null
          created_at: string
          delivery_address: string
          delivery_city: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_postal_code: string | null
          estimated_subtotal: number | null
          estimated_total: number | null
          final_confirmed_at: string | null
          final_confirmed_by: string | null
          final_subtotal: number | null
          final_total: number | null
          id: string
          payment_method: string | null
          payment_status: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          authorized_amount?: number | null
          convenience_fee?: number | null
          created_at?: string
          delivery_address: string
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_postal_code?: string | null
          estimated_subtotal?: number | null
          estimated_total?: number | null
          final_confirmed_at?: string | null
          final_confirmed_by?: string | null
          final_subtotal?: number | null
          final_total?: number | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          authorized_amount?: number | null
          convenience_fee?: number | null
          created_at?: string
          delivery_address?: string
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_postal_code?: string | null
          estimated_subtotal?: number | null
          estimated_total?: number | null
          final_confirmed_at?: string | null
          final_confirmed_by?: string | null
          final_subtotal?: number | null
          final_total?: number | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pack_prices: {
        Row: {
          created_at: string
          id: string
          is_hidden: boolean
          pack_size: string
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          pack_size: string
          price: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          pack_size?: string
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beer_pack_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          in_stock: boolean | null
          is_hidden: boolean | null
          name: string
          price: number
          seo_description: string | null
          seo_generated_at: string | null
          seo_keywords: string[] | null
          seo_meta_description: string | null
          seo_meta_title: string | null
          size: string | null
          store_id: string
          subcategory: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_hidden?: boolean | null
          name: string
          price: number
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_keywords?: string[] | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          size?: string | null
          store_id: string
          subcategory?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_hidden?: boolean | null
          name?: string
          price?: number
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_keywords?: string[] | null
          seo_meta_description?: string | null
          seo_meta_title?: string | null
          size?: string | null
          store_id?: string
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string
          created_at: string
          delivery_fee: number | null
          delivery_time: string | null
          hours: string | null
          id: string
          image_url: string | null
          is_open: boolean | null
          name: string
          phone: string | null
          rating: number | null
          reviews_count: number | null
        }
        Insert: {
          address: string
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: string | null
          hours?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
          name: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: string | null
          hours?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
          name?: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
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
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      product_category:
        | "beer"
        | "wine"
        | "spirits"
        | "smokes"
        | "ciders_seltzers"
        | "convenience"
        | "pet_supplies"
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
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      product_category: [
        "beer",
        "wine",
        "spirits",
        "smokes",
        "ciders_seltzers",
        "convenience",
        "pet_supplies",
      ],
    },
  },
} as const
