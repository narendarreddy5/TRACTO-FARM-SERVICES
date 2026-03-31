import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface VoiceIntent {
  intentType: 'booking' | 'machinery_info' | 'status_check' | 'greeting' | 'unknown';
  acres?: number;
  date?: string;
  location?: string;
  serviceType?: string;
  tractorModel?: string;
  bookingId?: string;
  language: string;
  isComplete: boolean;
  missingInfo: string[];
  data?: any; // For passing context data to response generator
}

export const processVoiceIntent = async (text: string, currentLanguage: string = 'en'): Promise<VoiceIntent> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following agricultural voice command from a farmer.
    Determine the intentType:
    - 'booking': User wants to book a service (e.g., "book a tractor", "need plowing").
    - 'machinery_info': User wants information about tractors or equipment (e.g., "tell me about Mahindra 575", "what tractors do you have?").
    - 'status_check': User wants to check their booking status (e.g., "where is my tractor?", "check my booking status").
    - 'greeting': Simple hello or welcome.
    - 'unknown': Anything else.

    Extract relevant fields:
    - For 'booking': acres (number), date (YYYY-MM-DD), location (string), serviceType (Plowing, Sowing, Manuring, Irrigation, Weeding, Harvesting).
    - For 'machinery_info': tractorModel (string).
    - For 'status_check': bookingId (string, if mentioned).

    The current date is ${new Date().toISOString().split('T')[0]}.
    If information is missing for a booking, list it in 'missingInfo'.
    'isComplete' should be true if the intent is fully understood (for booking, all 4 fields must be present).
    Input text: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intentType: { type: Type.STRING },
          acres: { type: Type.NUMBER },
          date: { type: Type.STRING },
          location: { type: Type.STRING },
          serviceType: { type: Type.STRING },
          tractorModel: { type: Type.STRING },
          bookingId: { type: Type.STRING },
          language: { type: Type.STRING },
          isComplete: { type: Type.BOOLEAN },
          missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["intentType", "isComplete", "missingInfo"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return { ...result, language: currentLanguage };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { intentType: 'unknown', language: currentLanguage, isComplete: false, missingInfo: ["error"] };
  }
};

export const generateVoiceResponse = async (intent: VoiceIntent, language: string): Promise<string> => {
  let prompt = "";
  
  if (intent.intentType === 'booking') {
    prompt = intent.isComplete 
      ? `Confirm the ${intent.serviceType} service booking for ${intent.acres} acres on ${intent.date} at ${intent.location}. Keep it short and friendly in ${language}.`
      : `Ask the farmer for the missing information: ${intent.missingInfo.join(', ')}. Be polite and helpful in ${language}.`;
  } else if (intent.intentType === 'machinery_info') {
    if (intent.data) {
      prompt = `Provide information about the machinery based on this data: ${JSON.stringify(intent.data)}. If no specific tractor was found, list available ones briefly. Respond in ${language}.`;
    } else {
      prompt = `The user asked about machinery: "${intent.tractorModel || 'general info'}". Tell them you are looking that up or ask for a specific model. Respond in ${language}.`;
    }
  } else if (intent.intentType === 'status_check') {
    if (intent.data) {
      prompt = `The user is checking their booking status. Here is their booking data: ${JSON.stringify(intent.data)}. Summarize the status of their recent bookings. Respond in ${language}.`;
    } else {
      prompt = `Tell the user you are checking their booking status. Respond in ${language}.`;
    }
  } else if (intent.intentType === 'greeting') {
    prompt = `Give a warm welcome to the TRACTO voice assistant. Tell them they can book services, check machinery info, or check booking status. Respond in ${language}.`;
  } else {
    prompt = `The user said something I didn't quite get: "${intent.missingInfo.join(' ')}". Ask them to repeat or clarify if they want to book, check machinery, or check status. Respond in ${language}.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Sorry, I didn't catch that.";
};

export const generateTractorReport = async (tractor: any, bookings: any[], language: string): Promise<string> => {
  const prompt = `As an AI agricultural machinery expert, provide a concise performance and maintenance report for this tractor.
  Tractor Model: ${tractor.model}
  Specifications: ${tractor.hp} HP, Year ${tractor.year}, Fuel: ${tractor.fuel_type}
  Current Health Score: ${tractor.ai_health_score}/100
  Last Service: ${tractor.last_service || 'Unknown'}
  Next Service: ${tractor.next_service || 'Unknown'}
  Recent Bookings: ${bookings.slice(0, 5).map(b => `${b.service_type} on ${b.date}`).join(', ')}
  
  Provide:
  1. A summary of current condition.
  2. Maintenance recommendation.
  3. Efficiency tip for the owner.
  
  Respond in ${language}. Keep it professional and scannable.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Report generation failed.";
};
