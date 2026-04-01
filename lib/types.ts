// Generic paginated response from API
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface User {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  avatar_url?: string
  qr_code?: string
  created_at: string
}

// GET /admin/users returns this
export interface UserViewResponse {
  id: string
  email: string
  name: string
  surname: string
  phone: string
  role: string
  library_id?: string
  library_name?: string
  avatar_url?: string
  created_at: string
}

// PATCH /admin/users/{id}
export interface AdminUpdateUserRequest {
  role?: string
  library_id?: string
  email?: string
  name?: string
  surname?: string
  phone?: string
}

// POST /admin/users/staff
export interface CreateStaffRequest {
  email: string
  password: string
  library_id: string
  name: string
  surname: string
  phone: string
}

export interface Book {
  id: string
  title: string
  author_id: string
  genre_id: string
  isbn: string
  cover_url?: string
  description: string
  language: string
  year: number
  total_pages?: number
  avg_rating: number
  book_file?: {
    id: string
    book_id: string
    format: 'pdf' | 'epub' | 'mp3' | string
    file_url: string
  }
}

// GET /books returns this (nested author/genre)
export interface BookViewResponse {
  id: string
  title: string
  author: { id: string; name: string }
  genre: { id: string; name: string }
  isbn: string
  cover_url?: string
  description: string
  language: string
  year: number
  total_pages?: number
  avg_rating: number
  file?: {
    id: string
    book_id: string
    format: 'pdf' | 'epub' | 'mp3' | string
    file_url: string
  }
}

export interface Author {
  id: string
  name: string
  bio?: string
  photo_url?: string
  birth_date?: string
  death_date?: string
}

export interface Genre {
  id: string
  name: string
  slug: string
}

export interface Library {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  phone: string
}

export interface LibraryBook {
  id: string
  library_id: string
  book_id: string
  available_copies: number
  total_copies: number
}

export interface LibraryBookSearchItem {
  library_book_id: string
  book_id: string
  title: string
  author: string
  genre: string
  cover_url?: string
  year: number
  available_copies: number
  total_copies: number
  is_available: boolean
}

export interface Reservation {
  id: string
  user_id: string
  library_book_id?: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  reserved_at: string
  due_date: string
  returned_at?: string
}

// View responses with nested refs
export interface ReservationViewResponse {
  id: string
  user_name: string
  user_id: string
  book_title: string
  book_id: string
  library_name: string
  library_id: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  reserved_at: string
  due_date: string
  returned_at?: string
}

export interface Event {
  id: string
  title: string
  description: string
  location?: string
  cover_url?: string
  starts_at: string
  ends_at: string
  created_at: string
}

export interface BookFile {
  id: string
  book_id: string
  format: string
  file_url: string
  total_pages?: number
}

// GET /admin/stats
export interface AdminStats {
  users_total: number
  books_total: number
  authors_total: number
  reservations_total: number
  reservations_active: number
  reservations_pending: number
  reviews_total: number
}

// GET /staff/library/stats
export interface StaffStats {
  total_books: number
  available_books: number
  active_reservations: number
  pending_reservations: number
  completed_reservations: number
  cancelled_reservations: number
  total_reservations: number
}
