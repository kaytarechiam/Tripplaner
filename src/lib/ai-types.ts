import type { ItineraryItem, Trip } from './supabase'

export type { Trip, ItineraryItem }

export type ItineraryChange =
  | { type: 'reorder'; itemId: string; newIndex: number }
  | { type: 'update_time'; itemId: string; newTime: string }
  | { type: 'update_category'; itemId: string; newCategory: string }
  | { type: 'delete'; itemId: string }
  | { type: 'add'; day: number; item: Omit<ItineraryItem, 'id' | 'trip_id' | 'created_at'> }
  | { type: 'swap'; itemIdA: string; itemIdB: string }

export function changeGetItemId(change: ItineraryChange): string | undefined {
  if (change.type === 'reorder') return change.itemId
  if (change.type === 'update_time') return change.itemId
  if (change.type === 'update_category') return change.itemId
  if (change.type === 'delete') return change.itemId
  if (change.type === 'swap') return change.itemIdA
  return undefined
}

export interface AISuggestion {
  id: string
  change: ItineraryChange
  reason: string
  beforeLabel: string
  afterLabel: string
  confidence: number // 0-1
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  suggestions?: AISuggestion[]
  tripContext?: {
    tripName: string
    destination: string
    dayCount: number
    currentDay: number
    itemCount: number
  }
}