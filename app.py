import shutil
from flask import Flask, after_this_request, render_template, jsonify, request, send_file
from Recorder import Recorder
from Transcriber import WhisperAPI
from Summarizer import Summarizer
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
recorder = Recorder(is_web=True)
transcriber = WhisperAPI("whisper-1")
summarizer = Summarizer("gpt-4-1106-preview", 0)

UPLOAD_FOLDER = './.tmp_ai_assistant/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/')
def main():
    return render_template('./index.html')


@app.route('/set_key', methods=['POST'])
def set_key():
    data = request.get_json()
    key = data['key']
    transcriber.set_key(key)
    summarizer.set_key(key)
    return jsonify(success=True)


@app.route('/start_recording', methods=['POST'])
def start_recording():
    recorder.start()
    return jsonify(success=True)


@app.route('/stop_recording', methods=['POST'])
def stop_recording():
    file_name = recorder.stop()
    return send_file(file_name, as_attachment=True)


@app.route('/download_recording', methods=['GET'])
def download_recording():
    return send_file('path_to_your_recorded_file', as_attachment=True)


@app.route('/get_time', methods=['GET'])
def get_time():
    return jsonify(time=recorder.get_time())


@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'recordedFile' not in request.files:
        return jsonify(error='No file part')
    file = request.files['recordedFile']
    file.filename = 'recording.wav'
    if file.filename == '':
        return jsonify(error='No selected file')
    if file:
        # Get file type
        filename = secure_filename(file.filename)
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.mkdir(app.config['UPLOAD_FOLDER'])
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        transcription = transcriber.transcribe(
            os.path.join(app.config['UPLOAD_FOLDER'], filename))
        shutil.rmtree(app.config['UPLOAD_FOLDER'])
        return jsonify(transcription=transcription)


@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    content = data['content']
    keywords = data['keywords']
    summary = summarizer.summarize(content, keywords)
    return jsonify(summary=summary)


if __name__ == "__main__":
    app.run(debug=True, port=5015)
