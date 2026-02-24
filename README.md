# 🥦 NutriCoach — AI-Powered Personal Nutritionist

A complete, production-ready mobile app that serves as your personal AI nutritionist, chef, and grocery planner. Built entirely with free tools for personal use.

## ✨ Features

| Feature | Status |
|---------|--------|
| 👤 Onboarding & Profile (TDEE, macros calculated) | ✅ |
| 💬 AI Nutritionist Chat (streams, history saved) | ✅ |
| 🍽️ 7-Day Meal Plan Generator | ✅ |
| 👨‍🍳 AI Chef — Recipe from ingredients | ✅ |
| 📚 Saved Recipe Library | ✅ |
| 📝 Food Logging (search, barcode, AI parse) | ✅ |
| 🛒 Grocery List (auto-generated, shareable, PDF) | ✅ |
| 📊 Progress Tracker (weight chart, mood, photos) | ✅ |
| 🤖 AI Weekly Summary | ✅ |
| ⚙️ Settings (theme, units, AI provider, export) | ✅ |

## 🛠️ Tech Stack (100% Free)

- **Frontend**: React Native + Expo SDK 50
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4o-mini OR Ollama (local, free)
- **Food Data**: Open Food Facts API (3M+ products, no key needed)
- **Charts**: react-native-chart-kit + react-native-svg
- **Deployment**: Railway / Render (backend) + Expo Go (mobile)

---

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A free Supabase account
- OpenAI API key OR Ollama installed locally

---

### 1. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Storage**, create a bucket named `progress-photos` (set to private)
4. Copy your **Project URL** and **anon public key** from Settings → API

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key  # Settings → API → service_role
AI_PROVIDER=openai                           # or "ollama"
OPENAI_API_KEY=sk-...                        # if using OpenAI
OPENAI_MODEL=gpt-4o-mini
OLLAMA_BASE_URL=http://localhost:11434       # if using Ollama
OLLAMA_MODEL=llama3
PORT=3000
```

Start the backend:
```bash
npm run dev   # development (with nodemon)
npm start     # production
```

Test it's running:
```bash
curl http://localhost:3000/health
# → {"status":"ok","ai_provider":"openai"}
```

---

### 3. Mobile App Setup

```bash
cd mobile
npm install
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
```

> **Note**: Use your machine's local IP (not `localhost`) when running on a physical device.
> Find it with: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

Start the app:
```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

---

### 4. AI Configuration

#### Option A: OpenAI (Recommended — ~$0.01 per meal plan)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

#### Option B: Ollama (100% Free, runs locally)
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3   # or: ollama pull mistral
ollama serve         # starts on localhost:11434
```
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

---

## 📱 First Launch

1. Open the app in Expo Go
2. **Sign up** with your email
3. Check your email and confirm your account
4. **Sign in**
5. Complete the **6-step onboarding** (takes 2-3 minutes)
6. Your TDEE and macro targets are calculated automatically
7. You're ready! Start with the **Meal Plan** tab to generate your first week

---

## 🏗️ Project Structure

```
nutricoach/
├── backend/                   # Node.js + Express API
│   ├── server.js              # Main entry point
│   ├── routes/
│   │   ├── ai.js              # Chat, food parse, weekly summary
│   │   ├── mealplan.js        # 7-day plan generation
│   │   ├── recipe.js          # AI recipe from ingredients
│   │   └── food.js            # Open Food Facts proxy
│   ├── lib/
│   │   ├── ai.js              # OpenAI + Ollama abstraction
│   │   └── supabase.js        # Supabase admin client
│   └── .env.example
│
├── mobile/                    # React Native (Expo)
│   ├── App.js                 # Root component
│   ├── src/
│   │   ├── context/
│   │   │   └── AppContext.js  # Global state (profile, theme, auth)
│   │   ├── navigation/
│   │   │   └── index.js       # Tab + stack navigation
│   │   ├── screens/
│   │   │   ├── AuthScreen.js
│   │   │   ├── OnboardingScreen.js
│   │   │   ├── DashboardScreen.js
│   │   │   ├── ChatScreen.js
│   │   │   ├── MealPlanScreen.js
│   │   │   ├── RecipeDetailScreen.js
│   │   │   ├── RecipeGeneratorScreen.js
│   │   │   ├── SavedRecipesScreen.js
│   │   │   ├── FoodLogScreen.js
│   │   │   ├── FoodSearchScreen.js
│   │   │   ├── BarcodeScreen.js
│   │   │   ├── GroceryScreen.js
│   │   │   ├── ProgressScreen.js
│   │   │   └── SettingsScreen.js
│   │   ├── services/
│   │   │   ├── supabase.js    # All Supabase queries
│   │   │   ├── api.js         # Backend API calls
│   │   │   └── storage.js     # AsyncStorage cache
│   │   ├── utils/
│   │   │   ├── tdee.js        # TDEE + macro calculations
│   │   │   └── helpers.js     # Formatters, grocery builder
│   │   └── components/
│   │       ├── CalorieRing.js # SVG calorie progress ring
│   │       └── MacroBar.js    # Macro progress bar
│   └── .env.example
│
└── supabase/
    └── schema.sql             # Full database schema + RLS
```

---

## ☁️ Deployment

### Backend → Railway (Free tier: 500 hours/month)

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
cd backend
railway init
railway up
railway variables set AI_PROVIDER=openai OPENAI_API_KEY=sk-... # etc
```

### Backend → Render (Alternative, free tier)
- Connect GitHub repo at [render.com](https://render.com)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- Add all env vars from `.env.example`

### Mobile → Expo Go
For personal use, Expo Go is all you need — no App Store submission required.
Just `npx expo start` and scan the QR code.

---

## 💡 Cost Breakdown

| Service | Cost |
|---------|------|
| Supabase (database + auth + storage) | Free (500MB) |
| Railway / Render (backend hosting) | Free tier |
| Expo Go (mobile runner) | Free |
| Open Food Facts API | Free, no key |
| OpenAI GPT-4o-mini | ~$0.01/meal plan, ~$0.001/chat |
| Ollama (local LLM) | $0.00 |

**Total for personal use: ~$0–$1/month** (if using OpenAI)

---

## 🔒 Privacy

- All your data is stored in **your own Supabase instance**
- Row Level Security ensures only your account can access your data
- If using Ollama, no data ever leaves your machine
- Progress photos stored in your private Supabase Storage bucket

---

## 🐛 Troubleshooting

**App can't connect to backend:**
- Check `EXPO_PUBLIC_API_URL` uses your local IP, not `localhost`
- Ensure backend is running (`curl http://YOUR_IP:3000/health`)
- Check firewall allows port 3000

**AI not responding:**
- Verify `OPENAI_API_KEY` is set and valid
- For Ollama: check `ollama serve` is running

**Barcode scan not working:**
- Grant camera permissions in device settings
- Some products may not be in Open Food Facts database

**Meal plan generation fails:**
- Ensure backend is running and reachable
- Check backend logs for AI errors
- For OpenAI: verify API key has sufficient credits

---

## 📊 TDEE Formula

Uses the **Mifflin-St Jeor** equation:
```
BMR (men)   = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
BMR (women) = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
TDEE        = BMR × activity_multiplier
```

Activity multipliers: Sedentary (1.2) → Extra Active (1.9)

Calorie adjustments by goal:
- Lose weight fast: −500 kcal/day
- Lose weight: −300 kcal/day
- Maintain: 0
- Build muscle: +300 kcal/day
- Build muscle fast: +500 kcal/day
