"""
Gemini AI integration for RouteGuard.
Provides natural language safety explanations and recommendations.
"""
import google.generativeai as genai
from django.conf import settings
import json


class GeminiSafetyAdvisor:
    """
    Use Gemini AI to generate natural language safety explanations.
    """
    
    def __init__(self):
        """Initialize Gemini AI with API key from settings."""
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            self.enabled = False
            self.model = None
        else:
            try:
                genai.configure(api_key=api_key)
                # Use Gemini 2.0 Flash (experimental but available)
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
                self.enabled = True
                print("✅ Gemini AI initialized with gemini-2.0-flash-exp")
            except Exception as e:
                print(f"❌ Gemini AI initialization failed: {e}")
                self.enabled = False
                self.model = None
    
    def explain_route_choice(self, route_data, alternative_routes=None):
        """
        Generate natural language explanation for why a route was recommended.
        
        Args:
            route_data: dict with route safety information
            alternative_routes: list of alternative route data (optional)
            
        Returns:
            str: Natural language explanation
        """
        if not self.enabled:
            return self._fallback_explanation(route_data)
        
        try:
            prompt = self._build_explanation_prompt(route_data, alternative_routes)
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini AI error: {e}")
            return self._fallback_explanation(route_data)
    
    def _build_explanation_prompt(self, route_data, alternative_routes):
        """Build the prompt for Gemini AI."""
        
        prompt = f"""You are a safety advisor for a route planning application called RouteGuard. 
Your job is to explain to users why a particular route was recommended over others.

**Recommended Route:**
- Safety Score: {route_data.get('score', 'N/A')}/100 (Grade: {route_data.get('grade', 'N/A')})
- Distance: {route_data.get('distance_km', 'N/A')} km
- Crime incidents nearby: {route_data.get('crime_count', 0)}
- Safety zones nearby: {route_data.get('safety_zone_count', 0)}
- Time of day: {route_data.get('time_of_day', 'unknown')}
- Details: {route_data.get('details', 'No details available')}
"""
        
        if alternative_routes:
            prompt += "\n**Alternative Routes:**\n"
            for i, alt in enumerate(alternative_routes, 1):
                prompt += f"""
Route {i}:
- Safety Score: {alt.get('score', 'N/A')}/100
- Distance: {alt.get('distance_km', 'N/A')} km
- Crime incidents: {alt.get('crime_count', 0)}
"""
        
        prompt += """
**Instructions:**
1. Explain in 2-3 sentences why the recommended route is safer
2. Mention specific factors like crime incidents, safety zones, or time of day
3. If the route is longer, explain why the safety benefit is worth it
4. Be empathetic and reassuring, especially for nighttime travel
5. Keep it concise and actionable

Generate the explanation now:"""
        
        return prompt
    
    def _fallback_explanation(self, route_data):
        """Generate a basic explanation when AI is not available."""
        score = route_data.get('score', 50)
        crime_count = route_data.get('crime_count', 0)
        safety_zones = route_data.get('safety_zone_count', 0)
        time_of_day = route_data.get('time_of_day', 'unknown')
        
        if score >= 85:
            explanation = f"This route has an excellent safety score of {score}/100 with only {crime_count} reported incidents nearby."
        elif score >= 70:
            explanation = f"This route has a good safety score of {score}/100 and is generally safe."
        elif score >= 55:
            explanation = f"This route has a moderate safety score of {score}/100. Exercise normal caution."
        else:
            explanation = f"This route has a safety score of {score}/100. Consider traveling during daylight or with others."
        
        if safety_zones > 0:
            explanation += f" The route passes near {safety_zones} safety zone(s) including police stations or public areas."
        
        if time_of_day in ['evening', 'night']:
            explanation += f" Since you're traveling during {time_of_day}, extra caution is recommended."
        
        return explanation
    
    def generate_safety_tips(self, route_data):
        """
        Generate personalized safety tips for the journey.
        
        Args:
            route_data: dict with route information
            
        Returns:
            list of safety tips
        """
        if not self.enabled:
            return self._fallback_safety_tips(route_data)
        
        try:
            prompt = f"""Generate 3-5 specific safety tips for someone traveling this route:

Route Information:
- Safety Score: {route_data.get('score', 'N/A')}/100
- Time of day: {route_data.get('time_of_day', 'unknown')}
- Crime incidents nearby: {route_data.get('crime_count', 0)}
- Distance: {route_data.get('distance_km', 'N/A')} km

Provide practical, actionable tips. Format as a numbered list."""
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini AI error: {e}")
            return self._fallback_safety_tips(route_data)
    
    def _fallback_safety_tips(self, route_data):
        """Generate basic safety tips when AI is not available."""
        tips = []
        time_of_day = route_data.get('time_of_day', 'unknown')
        score = route_data.get('score', 50)
        
        if time_of_day in ['evening', 'night']:
            tips.append("Stay in well-lit areas and avoid shortcuts through dark alleys")
            tips.append("Keep your phone charged and share your location with a trusted contact")
        
        if score < 70:
            tips.append("Consider traveling with a companion if possible")
            tips.append("Stay alert and avoid distractions like headphones")
        
        tips.append("Trust your instincts - if something feels wrong, find an alternative route")
        tips.append("Keep emergency contacts readily accessible")
        
        return "\n".join([f"{i+1}. {tip}" for i, tip in enumerate(tips)])


# Global instance
_gemini_advisor = None


def get_gemini_advisor():
    """Get or create the global Gemini advisor instance."""
    global _gemini_advisor
    if _gemini_advisor is None:
        _gemini_advisor = GeminiSafetyAdvisor()
    return _gemini_advisor


def explain_route(route_data, alternative_routes=None):
    """
    Convenience function to get route explanation.
    
    Args:
        route_data: dict with route safety information
        alternative_routes: list of alternative routes
        
    Returns:
        str: Natural language explanation
    """
    advisor = get_gemini_advisor()
    return advisor.explain_route_choice(route_data, alternative_routes)
