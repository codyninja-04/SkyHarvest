from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# Replace these with your Telegram bot token and chat ID
TELEGRAM_BOT_TOKEN = '8044786931:AAEas6mCYwHzmpdIV_A8wtmrYhoEIe953y8'
TELEGRAM_CHAT_ID = '7723994204'

def send_telegram_message(text):
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': text,
        'parse_mode': 'HTML'  # Optional, you can remove if you don't want HTML formatting
    }
    response = requests.post(url, data=payload)
    return response.json()

@app.route('/send-telegram', methods=['POST'])
def send_alert():
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({'success': False, 'error': 'No message provided'}), 400
    
    telegram_response = send_telegram_message(message)
    
    if telegram_response.get('ok'):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': telegram_response}), 500

if __name__ == '__main__':
    app.run(port=5000)
