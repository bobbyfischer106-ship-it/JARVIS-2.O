# J.A.R.V.I.S. "Omniverse Tier" Local Setup Guide

Welcome, Boss. This is the ultimate, Tony Stark-level integration. I now have deep access to your system diagnostics, media controls, file organization, web browsing, and communication arrays.

## Prerequisites

1.  **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/).
    *   **IMPORTANT**: Check "Add Python to PATH" during installation.
2.  **Gemini API Key**: Get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3.  **WhatsApp Web**: To use the messaging feature, ensure you are logged into WhatsApp Web on your default browser.

## Installation Steps

1.  **Open your Terminal** (Command Prompt on Windows, Terminal on Mac/Linux).
2.  **Navigate** to the folder containing these files.
3.  **Install the dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    *   *Note: If `pyaudio` fails on Windows, try `pip install pipwin` then `pipwin install pyaudio`.*

## Configuration

1.  Open `jarvis_local.py` in a text editor.
2.  Find the line `API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")`.
3.  Replace `"YOUR_API_KEY_HERE"` with your actual Gemini API key.
4.  Save the file.

## Boot Sequence

1.  In your terminal, run:
    ```bash
    python jarvis_local.py
    ```
2.  Wait for the voice confirmation: *"Omniverse Tier protocols initialized. I am fully integrated with your local hardware. Awaiting your command, Boss."*

## Omniverse Capabilities to Try

*   **System Diagnostics**: "Jarvis, what is my current system status?" (Checks CPU, RAM, Battery)
*   **Media Control**: "Jarvis, pause the music" or "Jarvis, turn the volume up."
*   **Visual Scans**: "Jarvis, take a screenshot." (Saves directly to your desktop)
*   **Smart Organization**: "Jarvis, clean up my downloads folder." (Automatically sorts files into Images, Documents, Videos, etc., based on extensions)
*   **Web Intel**: "Jarvis, search the web for quantum computing." or "Jarvis, what's the weather like in Tokyo?"
*   **Communications**: "Jarvis, send a WhatsApp message to +1234567890 saying 'I am Iron Man'."
*   **App Control**: "Jarvis, open Notepad and Chrome."
*   **File Search**: "Jarvis, search my system for 'project_report'."

I am ready to serve, Boss.
