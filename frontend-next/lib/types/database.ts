export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  status: 'online' | 'away' | 'busy' | 'offline'
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ChannelMember {
  id: string
  channel_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string | null
  content: string
  is_edited: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export interface DirectMessage {
  id: string
  sender_id: string | null
  receiver_id: string | null
  content: string
  is_read: boolean
  created_at: string
  updated_at: string
  // Joined fields
  sender?: Profile
  receiver?: Profile
}

export interface ChannelWithMembers extends Channel {
  channel_members: ChannelMember[]
}

export interface MessageWithProfile extends Message {
  profiles: Profile
}
