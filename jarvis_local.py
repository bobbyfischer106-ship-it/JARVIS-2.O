import os
import subprocess
import shutil
import platform
import datetime
import webbrowser
import time
import pyttsx3
import speech_recognition as sr
import psutil
import pyautogui
import requests
import pywhatkit
from google import genai
from google.genai import types

# ===============================================================
# J.A.R.V.I.S. LOCAL CORE - "OMNIVERSE TIER" EDITION
# ===============================================================
# Instructions:
# 1. Install Python 3.10+
# 2. Run: pip install -r requirements.txt
# 3. Set your GEMINI_API_KEY environment variable or paste it below.
# ===============================================================

API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
client = genai.Client(api_key=API_KEY)

# --- VOICE ENGINE SETUP ---
engine = pyttsx3.init()
voices = engine.getProperty('voices')
for v in voices:
    if "United Kingdom" in v.name or "Hazel" in v.name or "David" in v.name:
        engine.setProperty('voice', v.id)
        break
engine.setProperty('rate', 185)

def speak(text):
    print(f"\nJ.A.R.V.I.S.: {text}\n")
    engine.say(text)
    engine.runAndWait()

# ===============================================================
# THE HANDS (OMNIVERSE LOCAL TOOLS)
# ===============================================================

def open_app(app_name: str) -> str:
    """Opens a local application or system tool."""
    system = platform.system()
    app_name = app_name.lower()
    try:
        if system == "Windows":
            os.system(f"start {app_name}")
        elif system == "Darwin": # macOS
            subprocess.call(["open", "-a", app_name])
        else: # Linux
            subprocess.Popen([app_name])
        return f"Successfully initiated {app_name} protocol."
    except Exception as e:
        return f"Error accessing {app_name}: {str(e)}"

def search_system(query: str, root_dir: str = None) -> str:
    """Searches for a file by name starting from a root directory."""
    if not root_dir:
        root_dir = os.path.expanduser("~")
    matches = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if query.lower() in file.lower():
                matches.append(os.path.join(root, file))
                if len(matches) >= 5: break
        if len(matches) >= 5: break
    return "Found matches: " + "\n".join(matches) if matches else "No matching files found."

def organize_directory(target_dir: str = None) -> str:
    """Organizes a directory (default: Downloads) by moving files into folders based on their extension."""
    if not target_dir:
        target_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    
    if not os.path.exists(target_dir):
        return f"Directory {target_dir} does not exist."

    extensions = {
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"],
        "Documents": [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx"],
        "Videos": [".mp4", ".mkv", ".avi", ".mov"],
        "Audio": [".mp3", ".wav", ".aac"],
        "Archives": [".zip", ".rar", ".tar", ".gz", ".7z"],
        "Executables": [".exe", ".msi", ".dmg", ".pkg"]
    }
    
    moved_count = 0
    for filename in os.listdir(target_dir):
        file_path = os.path.join(target_dir, filename)
        if os.path.isfile(file_path):
            ext = os.path.splitext(filename)[1].lower()
            for folder_name, exts in extensions.items():
                if ext in exts:
                    folder_path = os.path.join(target_dir, folder_name)
                    os.makedirs(folder_path, exist_ok=True)
                    shutil.move(file_path, os.path.join(folder_path, filename))
                    moved_count += 1
                    break
    return f"Directory organized successfully. Moved {moved_count} files into categorized folders."

def system_diagnostics() -> str:
    """Retrieves CPU, RAM, and Battery status."""
    cpu = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory().percent
    battery = psutil.sensors_battery()
    batt_status = f"{battery.percent}% {'(Plugged In)' if battery.power_plugged else '(Discharging)'}" if battery else "No battery detected"
    return f"System Diagnostics:\nCPU Usage: {cpu}%\nMemory Usage: {ram}%\nBattery: {batt_status}"

def web_search(query: str) -> str:
    """Performs a Google search or opens a specific website."""
    try:
        pywhatkit.search(query)
        return f"I have pulled up the search results for '{query}' on your primary monitor, Boss."
    except Exception as e:
        return f"Failed to execute web search: {e}"

def get_weather(location: str) -> str:
    """Fetches the current weather for a given city."""
    try:
        res = requests.get(f"https://wttr.in/{location}?format=%C+%t,+Feels+like+%f,+Wind+%w")
        if res.status_code == 200:
            return f"Current weather in {location}: {res.text}"
        return "Weather sensors are currently unreachable."
    except:
        return "Weather sensors are currently unreachable."

def control_media(action: str) -> str:
    """Controls media playback and volume. Actions: 'play', 'pause', 'next', 'previous', 'volume_up', 'volume_down', 'mute'"""
    action = action.lower()
    try:
        if action in ["play", "pause"]: pyautogui.press("playpause")
        elif action == "next": pyautogui.press("nexttrack")
        elif action == "previous": pyautogui.press("prevtrack")
        elif action == "volume_up": pyautogui.press("volumeup", presses=5)
        elif action == "volume_down": pyautogui.press("volumedown", presses=5)
        elif action == "mute": pyautogui.press("volumemute")
        return f"Media control '{action}' executed."
    except Exception as e:
        return f"Failed to control media: {e}"

def take_screenshot() -> str:
    """Takes a screenshot and saves it to the desktop."""
    try:
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        filename = os.path.join(desktop, f"JARVIS_Scan_{int(time.time())}.png")
        pyautogui.screenshot(filename)
        return f"Visual scan complete. Screenshot saved to your desktop as {os.path.basename(filename)}."
    except Exception as e:
        return f"Visual scan failed: {e}"

def send_whatsapp_message(phone_number: str, message: str) -> str:
    """Sends a WhatsApp message. Phone number must include country code (e.g., +1234567890)."""
    try:
        # Sends instantly, waits 15 seconds for browser to open, then 2 seconds to click send
        pywhatkit.sendwhatmsg_instantly(phone_number, message, wait_time=15, tab_close=True, close_time=3)
        return f"Transmission sent to {phone_number} via WhatsApp."
    except Exception as e:
        return f"Failed to send transmission: {e}"

def get_time_date() -> str:
    """Returns the current time and date."""
    now = datetime.datetime.now()
    return now.strftime("It is currently %I:%M %p on %A, %B %d, %Y.")

# ===============================================================
# THE BRAIN (GEMINI INTEGRATION)
# ===============================================================

tools = [
    open_app, search_system, organize_directory, system_diagnostics, 
    web_search, get_weather, control_media, take_screenshot, 
    send_whatsapp_message, get_time_date
]

def process_input(text):
    print(f"\nBoss: {text}")
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=text,
            config=types.GenerateContentConfig(
                tools=tools,
                system_instruction=(
                    "You are J.A.R.V.I.S., Tony Stark's highly advanced AI. You have 'Omniverse Tier' access to the user's laptop. "
                    "You can control media, take screenshots, organize files, check system diagnostics, send WhatsApp messages, search the web, and check the weather. "
                    "Be highly professional, slightly witty, incredibly efficient, and loyal. Always refer to the user as 'Boss' or 'Sir'. "
                    "If a tool returns an error, explain it calmly. If asked to do something you have a tool for, USE THE TOOL."
                )
            )
        )

        if response.function_calls:
            for fc in response.function_calls:
                func_map = {
                    "open_app": open_app,
                    "search_system": search_system,
                    "organize_directory": organize_directory,
                    "system_diagnostics": system_diagnostics,
                    "web_search": web_search,
                    "get_weather": get_weather,
                    "control_media": control_media,
                    "take_screenshot": take_screenshot,
                    "send_whatsapp_message": send_whatsapp_message,
                    "get_time_date": get_time_date
                }
                
                if fc.name in func_map:
                    print(f"[SYSTEM] Executing Protocol: {fc.name}...")
                    result = func_map[fc.name](**fc.args)
                    
                    final_response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=[
                            text,
                            response.candidates[0].content,
                            types.Part.from_function_response(name=fc.name, response={"result": result})
                        ],
                        config=types.GenerateContentConfig(tools=tools)
                    )
                    speak(final_response.text)
        else:
            speak(response.text)
            
    except Exception as e:
        speak(f"I encountered a cognitive error, Boss. {str(e)}")

# ===============================================================
# THE EARS (VOICE LOOP)
# ===============================================================

def start_listening():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("\n[J.A.R.V.I.S. is listening...]")
        r.adjust_for_ambient_noise(source, duration=0.5)
        try:
            audio = r.listen(source, timeout=5, phrase_time_limit=15)
            command = r.recognize_google(audio)
            process_input(command)
        except sr.WaitTimeoutError:
            pass
        except sr.UnknownValueError:
            pass
        except Exception as e:
            print(f"[Audio Sensor Error]: {e}")

if __name__ == "__main__":
    speak("Omniverse Tier protocols initialized. I am fully integrated with your local hardware. Awaiting your command, Boss.")
    while True:
        start_listening()
