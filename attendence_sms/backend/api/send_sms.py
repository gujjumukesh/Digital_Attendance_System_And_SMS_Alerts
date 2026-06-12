from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

load_dotenv()

app = Flask(__name__)
CORS(app)

# Twilio Credentials (recommended via environment variables)
# - TWILIO_ACCOUNT_SID: Your Twilio Account SID from the console
# - TWILIO_AUTH_TOKEN: Your Twilio Auth Token from the console
# - TWILIO_FROM_NUMBER: Your Twilio phone number (E.164 format, e.g., +1XXXXXXXXXX)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()

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
        # Verify credentials exist
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
            return jsonify({
                "success": False, 
                "error": "Server is missing Twilio credentials. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
            }), 500

        data = request.get_json(silent=True) or {}
        receiver_phone_raw = data.get("mobile_no") or data.get("to")
        
        if not receiver_phone_raw:
            return jsonify({"success": False, "error": "Missing 'mobile_no' (or 'to') in request body."}), 400
            
        receiver_phone = format_phone_number(receiver_phone_raw)
        message_text = (data.get("message") or "").strip()

        if not message_text:
            return jsonify({"success": False, "error": "Missing 'message' in request body."}), 400

        # Initialize the Twilio Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        # Send the SMS via Twilio
        message = client.messages.create(
            body=message_text,
            from_=TWILIO_FROM_NUMBER,
            to=receiver_phone
        )

        print(f"SMS queued via Twilio to {receiver_phone}. SID: {message.sid}")
        
        return jsonify({
            'success': True,
            'status': 'sent',
            'data': {
                'sid': message.sid,
                'status': message.status,
                'date_created': str(message.date_created)
            }
        })

    except TwilioRestException as e:
        print(f"Twilio API error: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Twilio gateway error', 
            'details': e.msg,
            'status': 'failed'
        }), e.status
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
