from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests  # We use the standard requests library for httpSMS
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# httpSMS Credentials (recommended via environment variables)
# - HTTPSMS_API_KEY: your httpsms API key
# - HTTPSMS_FROM_NUMBER: the phone number active in your Android app (E.164), e.g. +91XXXXXXXXXX
HTTPSMS_API_KEY = os.getenv("HTTPSMS_API_KEY", "").strip()
MY_PHONE_NUMBER = os.getenv("HTTPSMS_FROM_NUMBER", "").strip()

def format_phone_number(phone):
    """Format phone number to E.164 format"""
    phone = ''.join(filter(str.isdigit, str(phone)))
    if len(phone) == 10:
        phone = '+91' + phone
    elif not phone.startswith('+'):
        phone = '+' + phone
    return phone

@app.route('/api/send-sms', methods=['POST'])
def send_sms():
    try:
        if not HTTPSMS_API_KEY or not MY_PHONE_NUMBER:
            return jsonify({
                "success": False,
                "error": "Server is missing httpsms credentials. Set HTTPSMS_API_KEY and HTTPSMS_FROM_NUMBER."
            }), 500

        data = request.get_json(silent=True) or {}
        receiver_phone_raw = data.get("mobile_no") or data.get("to")
        receiver_phone = format_phone_number(receiver_phone_raw)
        message_text = (data.get("message") or "").strip()

        if not receiver_phone_raw:
            return jsonify({"success": False, "error": "Missing 'mobile_no' (or 'to') in request body."}), 400
        if not message_text:
            return jsonify({"success": False, "error": "Missing 'message' in request body."}), 400
        
        # httpSMS API Endpoint
        url = "https://api.httpsms.com/v1/messages/send"
        
        # Prepare the payload
        payload = {
            "content": message_text,
            "from": MY_PHONE_NUMBER,
            "to": receiver_phone
        }
        
        # Prepare headers with your API Key
        headers = {
            "x-api-key": HTTPSMS_API_KEY,
            "Content-Type": "application/json"
        }

        # Send request to httpSMS
        response = requests.post(url, json=payload, headers=headers, timeout=20)
        try:
            response_data = response.json()
        except Exception:
            response_data = {"raw": response.text}

        if response.status_code == 200:
            current_date = datetime.now().strftime('%Y-%m-%d')
            print(f"SMS queued via httpSMS to {receiver_phone}")
            
            return jsonify({
                'success': True,
                'status': 'sent',
                'data': response_data
            })
        else:
            return jsonify({
                'success': False,
                'error': (response_data.get('message') if isinstance(response_data, dict) else None) or 'Failed to send SMS',
                'details': response_data,
                'status': 'failed'
            }), response.status_code

    except requests.RequestException as e:
        print(f"httpSMS request error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to reach httpsms API', 'details': str(e)}), 502
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)