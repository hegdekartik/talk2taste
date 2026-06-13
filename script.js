(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // --- Safely grab elements ---
        var settingsBtn = document.getElementById('settingsBtn');
        var settingsModal = document.getElementById('settingsModal');
        var closeModalBtn = document.getElementById('closeModalBtn');
        var saveSettingsBtn = document.getElementById('saveSettingsBtn');
        var apiKeyInput = document.getElementById('apiKey');

        var audioDropArea = document.getElementById('audioDropArea');
        var audioInput = document.getElementById('audioInput');
        var audioFileName = document.getElementById('audioFileName');
        var recordBtn = document.getElementById('recordBtn');
        var recordBtnText = document.getElementById('recordBtnText');

        var imageDropArea = document.getElementById('imageDropArea');
        var imageInput = document.getElementById('imageInput');
        var imageFileName = document.getElementById('imageFileName');

        var openWebcamBtn = document.getElementById('openWebcamBtn');
        var webcamModal = document.getElementById('webcamModal');
        var closeWebcamBtn = document.getElementById('closeWebcamBtn');
        var capturePhotoBtn = document.getElementById('capturePhotoBtn');
        var webcamVideo = document.getElementById('webcamVideo');
        var webcamCanvas = document.getElementById('webcamCanvas');

        var generateBtn = document.getElementById('generateBtn');
        var resultSection = document.getElementById('resultSection');
        var rawOutput = document.getElementById('rawOutput');

        // --- State ---
        var apiKey = localStorage.getItem('gemini_api_key') || '';
        var audioFile = null;
        var imageFile = null;
        var mediaRecorder = null;
        var audioChunks = [];
        var isRecording = false;
        var webcamStream = null;

        // Show settings if no key
        if (apiKey) {
            apiKeyInput.value = apiKey;
        } else {
            settingsModal.classList.remove('hidden');
        }

        // --- Settings ---
        settingsBtn.addEventListener('click', function() {
            settingsModal.classList.remove('hidden');
        });
        closeModalBtn.addEventListener('click', function() {
            settingsModal.classList.add('hidden');
        });
        saveSettingsBtn.addEventListener('click', function() {
            apiKey = apiKeyInput.value.trim();
            localStorage.setItem('gemini_api_key', apiKey);
            settingsModal.classList.add('hidden');
        });

        // --- File upload: Audio ---
        audioInput.addEventListener('change', function() {
            var file = this.files[0];
            if (file) {
                audioFile = file;
                audioFileName.textContent = file.name;
                audioDropArea.classList.add('has-file');
                updateGenerateBtn();
            }
        });

        // --- File upload: Image ---
        imageInput.addEventListener('change', function() {
            var file = this.files[0];
            if (file) {
                imageFile = file;
                imageFileName.textContent = file.name;
                imageDropArea.classList.add('has-file');
            }
        });

        // ============================================
        // RECORD VOICE — the critical fix
        // ============================================
        recordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (isRecording) {
                // STOP recording
                stopRecording();
                return;
            }

            // START recording: check browser support
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                alert(
                    'Your browser does not support audio recording.\n\n' +
                    'This usually happens when:\n' +
                    '• You are not on HTTPS (required for microphone access)\n' +
                    '• Your browser is outdated\n\n' +
                    'Please open this page via the HTTPS Vercel URL or localhost.'
                );
                return;
            }

            // Request microphone permission — this triggers the browser popup
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    startRecording(stream);
                })
                .catch(function(err) {
                    console.error('getUserMedia error:', err.name, err.message);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        alert(
                            'Microphone permission was denied.\n\n' +
                            'Please allow microphone access:\n' +
                            '• iOS Safari: Settings → Safari → Microphone\n' +
                            '• Android Chrome: Tap the lock icon in the address bar → Permissions\n' +
                            '• Desktop: Click the microphone icon in the address bar'
                        );
                    } else if (err.name === 'NotFoundError') {
                        alert('No microphone found on this device.');
                    } else {
                        alert('Could not access microphone: ' + err.message);
                    }
                });
        });

        function startRecording(stream) {
            audioChunks = [];

            try {
                mediaRecorder = new MediaRecorder(stream);
            } catch (e) {
                // Fallback: some browsers need specific mimeType
                try {
                    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                } catch (e2) {
                    try {
                        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
                    } catch (e3) {
                        alert('MediaRecorder is not supported in this browser.');
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        return;
                    }
                }
            }

            mediaRecorder.ondataavailable = function(event) {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = function() {
                var mimeType = (mediaRecorder.mimeType || 'audio/webm').split(';')[0];
                var blob = new Blob(audioChunks, { type: mimeType });
                audioFile = blob;

                var ext = mimeType.indexOf('mp4') !== -1 ? '.m4a' : '.webm';
                audioFileName.textContent = 'Recording' + ext;
                audioDropArea.classList.add('has-file');
                updateGenerateBtn();

                // Release mic
                stream.getTracks().forEach(function(t) { t.stop(); });
            };

            mediaRecorder.onerror = function(event) {
                console.error('MediaRecorder error:', event.error);
                alert('Recording error: ' + (event.error ? event.error.message : 'Unknown'));
                stream.getTracks().forEach(function(t) { t.stop(); });
                resetRecordingUI();
            };

            // Use timeslice to ensure data is captured even for short recordings
            mediaRecorder.start(1000);

            isRecording = true;
            recordBtn.classList.add('recording');
            var dot = recordBtn.querySelector('.record-dot');
            if (dot) dot.classList.remove('hidden');
            recordBtnText.textContent = '⏹ Stop Recording';
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            resetRecordingUI();
        }

        function resetRecordingUI() {
            isRecording = false;
            recordBtn.classList.remove('recording');
            var dot = recordBtn.querySelector('.record-dot');
            if (dot) dot.classList.add('hidden');
            recordBtnText.textContent = '🎤 Record Voice';
        }

        // ============================================
        // WEBCAM CAPTURE
        // ============================================
        if (openWebcamBtn) {
            openWebcamBtn.addEventListener('click', function() {
                if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                    alert('Camera is not supported in this browser. Ensure you are on HTTPS.');
                    return;
                }
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(function(stream) {
                        webcamStream = stream;
                        webcamVideo.srcObject = stream;
                        webcamModal.classList.remove('hidden');
                    })
                    .catch(function(err) {
                        console.error('Camera error:', err);
                        alert('Could not access camera: ' + err.message);
                    });
            });
        }

        if (closeWebcamBtn) {
            closeWebcamBtn.addEventListener('click', stopWebcam);
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', function() {
                if (!webcamStream) return;
                webcamCanvas.width = webcamVideo.videoWidth;
                webcamCanvas.height = webcamVideo.videoHeight;
                var ctx = webcamCanvas.getContext('2d');
                ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
                webcamCanvas.toBlob(function(blob) {
                    imageFile = blob;
                    imageFileName.textContent = 'Photo.png';
                    imageDropArea.classList.add('has-file');
                    stopWebcam();
                }, 'image/png');
            });
        }

        function stopWebcam() {
            if (webcamStream) {
                webcamStream.getTracks().forEach(function(t) { t.stop(); });
                webcamStream = null;
            }
            webcamModal.classList.add('hidden');
        }

        // ============================================
        // GENERATE RECIPE
        // ============================================
        function updateGenerateBtn() {
            generateBtn.disabled = !audioFile;
        }

        generateBtn.addEventListener('click', function() {
            handleGenerate();
        });

        function fileToBase64(file) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() {
                    resolve(reader.result.split(',')[1]);
                };
                reader.onerror = function(err) {
                    reject(err);
                };
                reader.readAsDataURL(file);
            });
        }

        function handleGenerate() {
            if (!apiKey) {
                alert('Please set your Gemini API Key in Settings first.');
                settingsModal.classList.remove('hidden');
                return;
            }
            if (!audioFile) return;

            var btnText = generateBtn.querySelector('.btn-text');
            var loader = generateBtn.querySelector('.loader');

            generateBtn.disabled = true;
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
            resultSection.classList.add('hidden');

            var prompt = 'You are an expert chef and transcriber. ' +
                'The user has provided an audio recording of a recipe instruction. ' +
                'If the audio is in Kannada, translate the instructions into English. ' +
                'Provide a clear, step-by-step recipe based on the audio. ' +
                'Also extract the list of ingredients based on the audio. ' +
                'If an image is provided, ensure your recipe name and context match the provided image.';

            var audioMime = (audioFile.type || 'audio/webm').split(';')[0];

            fileToBase64(audioFile).then(function(audioB64) {
                var parts = [
                    { text: prompt },
                    { inline_data: { mime_type: audioMime, data: audioB64 } }
                ];

                var next;
                if (imageFile) {
                    next = fileToBase64(imageFile).then(function(imgB64) {
                        var imgMime = (imageFile.type || 'image/png').split(';')[0];
                        parts.push({ inline_data: { mime_type: imgMime, data: imgB64 } });
                    });
                } else {
                    next = Promise.resolve();
                }

                return next.then(function() {
                    return fetch(
                        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + apiKey,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: parts }] })
                        }
                    );
                });
            }).then(function(response) {
                return response.json().then(function(data) {
                    if (!response.ok) {
                        throw new Error(data.error ? data.error.message : 'API request failed');
                    }
                    return data;
                });
            }).then(function(data) {
                var text = data.candidates[0].content.parts[0].text;
                rawOutput.innerHTML = marked.parse(text);
                rawOutput.classList.remove('hidden');

                document.querySelector('.recipe-content').classList.add('hidden');
                document.getElementById('recipeTitle').classList.add('hidden');

                resultSection.classList.remove('hidden');
                resultSection.scrollIntoView({ behavior: 'smooth' });
            }).catch(function(err) {
                console.error('Generate error:', err);
                alert('Error: ' + err.message);
            }).finally(function() {
                generateBtn.disabled = false;
                generateBtn.querySelector('.btn-text').classList.remove('hidden');
                generateBtn.querySelector('.loader').classList.add('hidden');
            });
        }
    }
})();
