(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // --- Elements ---
        var settingsBtn = document.getElementById('settingsBtn');
        var settingsModal = document.getElementById('settingsModal');
        var closeModalBtn = document.getElementById('closeModalBtn');
        var saveSettingsBtn = document.getElementById('saveSettingsBtn');
        var apiKeyInput = document.getElementById('apiKey');

        // Audio elements
        var recordBtn = document.getElementById('recordBtn');
        var recordInput = document.getElementById('recordInput');
        var uploadAudioBtn = document.getElementById('uploadAudioBtn');
        var audioFileInput = document.getElementById('audioFileInput');
        var audioStatus = document.getElementById('audioStatus');
        var audioFileName = document.getElementById('audioFileName');

        // Image elements
        var takePhotoBtn = document.getElementById('takePhotoBtn');
        var cameraInput = document.getElementById('cameraInput');
        var uploadImageBtn = document.getElementById('uploadImageBtn');
        var imageFileInput = document.getElementById('imageFileInput');
        var imageStatus = document.getElementById('imageStatus');
        var imageFileName = document.getElementById('imageFileName');

        // Generate
        var generateBtn = document.getElementById('generateBtn');
        var resultSection = document.getElementById('resultSection');
        var rawOutput = document.getElementById('rawOutput');

        // --- State ---
        var apiKey = localStorage.getItem('gemini_api_key') || '';
        var audioFile = null;
        var imageFile = null;

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

        // ============================================
        // AUDIO: Record Voice
        // Clicking the button triggers the hidden <input capture="user">
        // On mobile: opens the native OS voice recorder
        // On desktop: opens a file picker for audio files
        // ============================================
        recordBtn.addEventListener('click', function() {
            recordInput.value = '';
            recordInput.click();
        });

        recordInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                audioFile = this.files[0];
                audioFileName.textContent = audioFile.name || 'Recording';
                audioStatus.classList.remove('hidden');
                generateBtn.disabled = false;
            }
        });

        // AUDIO: Upload file
        uploadAudioBtn.addEventListener('click', function() {
            audioFileInput.value = '';
            audioFileInput.click();
        });

        audioFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                audioFile = this.files[0];
                audioFileName.textContent = audioFile.name;
                audioStatus.classList.remove('hidden');
                generateBtn.disabled = false;
            }
        });

        // ============================================
        // IMAGE: Take Photo
        // Clicking the button triggers the hidden <input capture="environment">
        // On mobile: opens the native camera
        // On desktop: opens a file picker for images
        // ============================================
        takePhotoBtn.addEventListener('click', function() {
            cameraInput.value = '';
            cameraInput.click();
        });

        cameraInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                imageFile = this.files[0];
                imageFileName.textContent = imageFile.name || 'Photo';
                imageStatus.classList.remove('hidden');
            }
        });

        // IMAGE: Upload file
        uploadImageBtn.addEventListener('click', function() {
            imageFileInput.value = '';
            imageFileInput.click();
        });

        imageFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                imageFile = this.files[0];
                imageFileName.textContent = imageFile.name;
                imageStatus.classList.remove('hidden');
            }
        });

        // ============================================
        // GENERATE RECIPE
        // ============================================
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
                btnText.classList.remove('hidden');
                loader.classList.add('hidden');
            });
        }
    }
})();
