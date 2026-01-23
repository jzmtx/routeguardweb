# 🛡️ RouteGuard - Safety-First Route Planning

RouteGuard is an intelligent route planning application that prioritizes your safety by analyzing crime data, time of day, and environmental factors to suggest the safest path to your destination.

## ✨ Features

- **🗺️ Interactive Map**: Click to set start and end points with automatic geolocation
- **🧠 AI-Powered Explanations**: Gemini AI explains why certain routes are safer
- **📊 Safety Scoring**: Real-time safety analysis based on crime data and context
- **🌙 Time-Aware**: Adjusts risk calculations based on time of day
- **📈 Multiple Routes**: Compare up to 3 alternative routes with safety grades
- **📁 CSV Import**: Upload real crime data from government sources
- **🎲 Sample Data**: Generate realistic demo data for any location
- **🌍 Global Support**: Works anywhere in the world with OpenStreetMap

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip
- Virtual environment (recommended)

### Local Development Setup

1. **Clone the repository**
   ```bash
   cd c:\Users\VITUS\Downloads\ROUTEGAURD
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Mac/Linux
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   copy .env.example .env
   # Edit .env and add your Gemini API key (optional for local testing)
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```

8. **Open in browser**
   ```
   http://localhost:8000
   ```

## 🔑 Getting Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key (starts with `AIza...`)
5. Add to your `.env` file:
   ```
   GEMINI_API_KEY=your_key_here
   ```

**Free Tier Limits**: 60 requests/minute (perfect for MVP testing)

## 📁 Project Structure

```
ROUTEGAURD/
├── core/                      # Django project settings
│   ├── settings.py           # Configuration
│   ├── urls.py               # Main URL routing
│   └── wsgi.py               # WSGI application
├── safe_route_app/           # Main application
│   ├── models.py             # Database models (CrimePoint, SafetyZone)
│   ├── views.py              # API endpoints
│   ├── admin.py              # Admin interface
│   ├── utils/
│   │   ├── scorer.py         # Safety scoring algorithm
│   │   ├── data_generator.py # Sample data generator
│   │   ├── csv_importer.py   # CSV upload handler
│   │   └── gemini_service.py # AI integration
│   ├── static/
│   │   ├── css/style.css     # Styling
│   │   └── js/main.js        # Frontend logic
│   └── templates/
│       └── index.html        # Main interface
├── requirements.txt          # Python dependencies
├── manage.py                 # Django management
└── .env.example              # Environment template
```

## 🎮 How to Use

1. **Set Start Point**: Click "Use My Location" or click anywhere on the map
2. **Set Destination**: Click another location on the map
3. **Calculate Routes**: Click "Find Safest Route"
4. **Review Results**: See safety scores, AI explanations, and route comparisons
5. **Generate Data**: Click "Generate Sample Data" to create demo crime points

## 📊 Safety Scoring Algorithm

The safety score (0-100) is calculated based on:

- **Crime Density**: Number and severity of crimes within 500m of route
- **Crime Types**: Weighted by severity (assault > robbery > theft)
- **Time of Day**: 2x risk multiplier for nighttime (10 PM - 6 AM)
- **Safety Zones**: Bonus points for routes near police stations, hospitals
- **Route Length**: Normalized to account for longer routes

**Grades**:
- A (85-100): Very safe
- B (70-84): Safe
- C (55-69): Moderate risk
- D (40-54): High risk
- F (0-39): Very high risk

## 🌐 Deployment to Render.com (Free)

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📝 CSV Upload Format

Your crime CSV should include these columns (flexible names):

- `latitude` or `lat`: Latitude coordinate
- `longitude` or `lon`: Longitude coordinate
- `crime_type` or `type`: Type of crime
- `date` or `occurred_date`: When it occurred
- `severity` (optional): 1-4 severity level

Example:
```csv
latitude,longitude,crime_type,date,severity
12.9716,77.5946,theft,2024-01-01,2
12.9720,77.5950,assault,2024-01-05,3
```

## 🛠️ Tech Stack🛠️

- **Backend**: Django 5.0 + GeoDjango
- **Database**: PostgreSQL + PostGIS (production) / SQLite + SpatiaLite (dev)
- **Maps**: Leaflet.js + OpenStreetMap
- **Routing**: Leaflet Routing Machine + OSRM
- **AI**: Google Gemini Pro
- **Deployment**: Render.com
- **Styling**: Custom CSS with dark mode

## 🤝 Contributing🤝

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🙏 Acknowledgments

- OpenStreetMap for free map tiles
- OSRM for routing engine
- Google for Gemini AI
- Leaflet.js community

## 📞📞📞 Support

For issues or questions, please open a GitHub issue or contact the development team.

---

**Built with ❤️❤️❤️ for safer communities**



