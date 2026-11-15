1. System Overview
Frontend Engine: React Native running on Expo Router to manage dynamic, file-based routing and deep linking.

State Management: Zustand implemented for lightweight, persistent local state synchronization across Auth, Cart, and Theme engines.

Backend Infrastructure: Supabase (PostgreSQL) handling stateless authentication, centralized database storage, and Deno Edge Functions.

Payment Gateway: Razorpay integrated via secure server-side generation and client-side native module execution.

2. Database Architecture
users: Manages authentication profiles and enforces role-based access control (Owner vs. Customer).

stores: Associates physical storefront data directly to authenticated owner accounts.

products: Tracks live inventory, pricing, and low-stock thresholds governed by strict Row Level Security (RLS).

orders: Immutable ledger of successful transactions permanently tied to cryptographically verified Razorpay payment IDs.

3. Core Security & Transaction Flow
Strict RLS Policies: Customers are restricted to read-only access for products; owners have exclusive write privileges isolated to their specific store ID.

Server-Side Verification: The mobile client never modifies stock directly. Edge functions verify HMAC SHA-256 Razorpay signatures before confirming any order.

Concurrency Control: A PostgreSQL SECURITY DEFINER stored procedure handles all inventory deduction, mathematically preventing race conditions and negative stock.

Resilient State: The frontend utilizes optimistic UI updates for immediate user feedback while background-syncing the true state with the cloud database.