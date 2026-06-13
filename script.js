document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKey');
    
    // Audio
    const audioDropArea = document.getElementById('audioDropArea');
    const audioInput = document.getElementById('audioInput');
    const audioFileName = document.getElementById('audioFileName');
    const recordBtn = document.getElementById('recordBtn');
    const recordBtnText = document.getElementById('recordBtnText');
    const recordDot = recordBtn.querySelector('.record-dot');
    
    // Image
    const imageDropArea = document.getElementById('imageDropArea');
    const imageInput = document.getElementById('imageInput');
    const imageFileName = document.getElementById('imageFileName');
    
    // Webcam
    const openWebcamBtn = document.getElementById('openWebcamBtn');
    const webcamModal = document.getElementById('webcamModal');
    const closeWebcamBtn = document.getElementById('closeWebcamBtn');
    const capturePhotoBtn = document.getElementById('capturePhotoBtn');
    const webcamVideo = document.getElementById('webcamVideo');
    const webcamCanvas = document.getElementById('webcamCanvas');
    
    // Generate
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = generateBtn.querySelector('.loader');
    
    // Results
    const resultSection = document.getElementById('resultSection');
    const rawOutput = document.getElementById('rawOutput');

    // --- State ---
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let audioFile = null; // Can be a File or Blob
    let imageFile = null; // Can be a File or Blob

    // Recording State
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let stream = null; // webcam stream

    if (apiKey) {
        apiKeyInput.value = apiKey;
    } else {
        settingsModal.classList.remove('hidden');
    }

    // --- Event Listeners ---
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    
    saveSettingsBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('gemini_api_key', apiKey);
        settingsModal.classList.add('hidden');
    });

    // File Drop & Select handlers
    setupFileDrop(audioDropArea, audioInput, (file) => {
        if (file && file.type.startsWith('audio/')) {
            audioFile = file;
            audioFileName.textContent = file.name;
            audioDropArea.classList.add('has-file');
            checkFormValidity();
        } else {
            alert('Please select a valid audio file.');
        }
    });

    setupFileDrop(imageDropArea, imageInput, (file) => {
        if (file && file.type.startsWith('image/')) {
            imageFile = file;
            imageFileName.textContent = file.name;
            imageDropArea.classList.add('has-file');
        } else {
            alert('Please select a valid image file.');
        }
    });

    // --- Audio Recording Logic ---
    recordBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (!isRecording) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Recording is not supported in this browser. Ensure you are on HTTPS.");
                return;
            }

            // Ask for permission explicitly (triggers browser popup on mobile)
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(audioStream) {
                    mediaRecorder = new MediaRecorder(audioStream);
                    audioChunks = [];

                    mediaRecorder.addEventListener("dataavailable", function(event) {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener("stop", function() {
                        const mimeType = mediaRecorder.mimeType || 'audio/webm';
                        const audioBlob = new Blob(audioChunks, { type: mimeType });
                        audioFile = audioBlob;
                        audioFileName.textContent = "Recorded_Audio" + (mimeType.includes('mp4') ? '.m4a' : '.webm');
                        audioDropArea.classList.add('has-file');
                        checkFormValidity();
                        
                        // Release microphone tracks
                        audioStream.getTracks().forEach(track => track.stop());
                    });

                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.classList.add('recording');
                    recordDot.classList.remove('hidden');
                    recordBtnText.textContent = "Stop Recording";
                })
                .catch(function(err) {
                    console.error("Microphone access denied or error:", err);
                    alert("Permission denied or microphone unavailable. Please allow microphone access in your browser settings and try again.");
                });
        } else {
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordDot.classList.add('hidden');
            recordBtnText.textContent = "🎤 Record Voice";
        }
    });

    // --- Webcam Capture Logic ---
    if (openWebcamBtn) {
        openWebcamBtn.addEventListener('click', async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Camera access is not supported in this browser or context. Make sure you are using a secure connection (HTTPS or localhost).");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                webcamVideo.srcObject = stream;
                webcamModal.classList.remove('hidden');
            } catch (err) {
                console.error("Camera access denied or error:", err);
                alert("Could not access the camera. Please check your browser permissions.");
            }
        });
    }

    closeWebcamBtn.addEventListener('click', stopWebcam);

    capturePhotoBtn.addEventListener('click', () => {
        if (!stream) return;
        
        webcamCanvas.width = webcamVideo.videoWidth;
        webcamCanvas.height = webcamVideo.videoHeight;
        const ctx = webcamCanvas.getContext('2d');
        ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
        
        webcamCanvas.toBlob((blob) => {
            imageFile = blob;
            imageFileName.textContent = "Webcam_Capture.png";
            imageDropArea.classList.add('has-file');
            stopWebcam();
        }, 'image/png');
    });

    function stopWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        webcamModal.classList.add('hidden');
    }

    generateBtn.addEventListener('click', handleGenerate);

    // --- Helper Functions ---
    function setupFileDrop(dropArea, inputEl, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
        });

        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                inputEl.files = files; // Sync input
                callback(files[0]);
            }
        }, false);

        inputEl.addEventListener('change', function() {
            if (this.files.length) {
                callback(this.files[0]);
            }
        });
    }

    function checkFormValidity() {
        if (audioFile) {
            generateBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    async function handleGenerate() {
        if (!apiKey) {
            alert('Please configure your Gemini API Key in settings first.');
            settingsModal.classList.remove('hidden');
            return;
        }

        if (!audioFile) return;

        // Set Loading state
        generateBtn.disabled = true;
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        resultSection.classList.add('hidden');

        try {
            const audioBase64 = await fileToBase64(audioFile);
            let imageBase64 = null;
            if (imageFile) {
                imageBase64 = await fileToBase64(imageFile);
            }

            const promptText = `You are an expert chef and transcriber. 
The user has provided an audio recording of a recipe instruction.
If the audio is in Kannada, translate the instructions into English.
Provide a clear, step-by-step recipe based on the audio.
Also extract the list of ingredients based on the audio.
If an image is provided, ensure your recipe name and context match the provided image.`;

            // Mime types need to be explicit. Remove codecs if present (e.g. audio/webm;codecs=opus -> audio/webm)
            const rawAudioMime = audioFile.type || 'audio/webm';
            const audioMimeType = rawAudioMime.split(';')[0];
            
            const rawImageMime = imageFile?.type || 'image/png';
            const imageMimeType = rawImageMime.split(';')[0];

            const contents = [
                {
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: audioMimeType, data: audioBase64 } }
                    ]
                }
            ];

            if (imageBase64) {
                contents[0].parts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contents })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to generate recipe');
            }

            const textOutput = data.candidates[0].content.parts[0].text;
            
            // Render the raw output first using Marked
            rawOutput.innerHTML = marked.parse(textOutput);
            rawOutput.classList.remove('hidden');
            
            document.querySelector('.recipe-content').classList.add('hidden');
            document.getElementById('recipeTitle').classList.add('hidden');

            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error generating recipe:', error);
            alert('Error: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }
});
