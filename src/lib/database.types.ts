export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      recordings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          original_file_name: string
          duration_seconds: number
          file_size_bytes: number
          mime_type: string
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          original_file_name: string
          duration_seconds: number
          file_size_bytes: number
          mime_type: string
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          original_file_name?: string
          duration_seconds?: number
          file_size_bytes?: number
          mime_type?: string
          status?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
        }
      }
      recording_tags: {
        Row: {
          recording_id: string
          tag_id: string
        }
        Insert: {
          recording_id: string
          tag_id: string
        }
        Update: {
          recording_id?: string
          tag_id?: string
        }
      }
      transcriptions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          recording_id: string
          status: string
          error?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          recording_id: string
          status?: string
          error?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          recording_id?: string
          status?: string
          error?: string | null
        }
      }
      transcript_segments: {
        Row: {
          id: string
          created_at: string
          transcription_id: string
          segment_index: number
          start_time: number
          end_time: number
          text: string
          speaker?: string | null
          confidence?: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          transcription_id: string
          segment_index: number
          start_time: number
          end_time: number
          text: string
          speaker?: string | null
          confidence?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          transcription_id?: string
          segment_index?: number
          start_time?: number
          end_time?: number
          text?: string
          speaker?: string | null
          confidence?: number | null
        }
      }
      meeting_notes: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          recording_id: string
          summary: string
          key_points: string[]
          action_items: string[]
          decisions: string[]
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          recording_id: string
          summary: string
          key_points: string[]
          action_items: string[]
          decisions: string[]
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          recording_id?: string
          summary?: string
          key_points?: string[]
          action_items?: string[]
          decisions?: string[]
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
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
  }
} 