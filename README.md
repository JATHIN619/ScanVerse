# ScanVerse: AI-Based Smart Retail & Business Analytics Platform

ScanVerse is a dual-role full-stack e-commerce engine designed to eliminate checkout queues and prevent retail shrinkage. It features an interactive customer self-checkout flow and an advanced Business Intelligence dashboard for store owners, protected by a physical AI verification layer.


## 🚀 Key Features
*   **Dynamic Cart & Bundle Engine:** Calculates multi-item promotional knapsack discounts in real-time.
*   **AI Retail Strategist & Recommendations:** Uses Google Gemini and `pgvector` embeddings for contextual product suggestions.
*   **Computer Vision Loss Prevention:** A YOLOv8 and DeepSORT edge-camera pipeline cross-references physical exit-gate items against the digital Razorpay receipt.
*   **Advanced Business Analytics:** Custom PostgreSQL RPCs track exact revenue, market basket pairings, and quantify monetary losses from abandoned cart metrics.

## 🛠 Tech Stack
*   **Frontend:** React Native, Expo Router, Zustand
*   **Backend & DB:** Supabase, PostgreSQL, Edge Functions
*   **AI/ML:** OpenCV, YOLOv8, Google Gemini API, pgvector
*   **Payments:** Razorpay API natively integrated

## ⚙️ Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
3. Create a .env file in the root directory with the following keys:
   ```Code snippet
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key  EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
4. Start the Expo development server:
   ```bash
   npx expo start
5. Database: Execute supabase_schema.sql in your Supabase SQL editor to provision the relational tables, vector extensions, and custom RPC analytics functions.