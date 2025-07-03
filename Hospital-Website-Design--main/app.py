from flask import Flask, request, jsonify, render_template
import openai
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow frontend JS to call this API

openai.api_key = "OPENAPI KEY"
@app.route('/')
def index():
    return render_template("index.html")

@app.route('/api/message', methods=['POST'])
def chat():
    user_input = request.json.get("message", "")
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": user_input}]
        )
        reply = response.choices[0].message["content"]
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": ""}), 200

if __name__ == '__main__':
    app.run(debug=True)
