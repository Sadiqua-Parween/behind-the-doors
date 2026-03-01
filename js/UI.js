export class UI {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.reticle = document.getElementById('reticle');
        this.prompt = document.getElementById('interaction-prompt');
        this.dialogueContainer = document.getElementById('dialogue-container');
        this.dialogueText = document.getElementById('dialogue-text');
        this.inventoryContainer = document.getElementById('inventory-container');

        this.isTyping = false;
        this.currentDialogue = [];
        this.dialogueIndex = 0;
        this.typeSpeed = 40; // ms per char

        // Global click listener for dialogue progression
        window.addEventListener('mousedown', (e) => {
            if (this.isDialogueActive()) {
                // Prevent Interaction.js from seeing this click and immediately re-triggering dialogue
                e.stopImmediatePropagation();

                if (this.isTyping) {
                    // Skip typing
                    this.finishTyping();
                } else {
                    // Next line
                    this.nextLine();
                }
            }
        });

        // Global keydown listener for Space and Enter mapping
        window.addEventListener('keydown', (e) => {
            if (this.isDialogueActive() && (e.code === 'Space' || e.code === 'Enter')) {
                e.stopImmediatePropagation();
                e.preventDefault();

                if (this.isTyping) {
                    this.finishTyping(); // Skip typing
                } else {
                    this.nextLine(); // Next line
                }
            }
        });
    }

    showReticle() {
        this.reticle.style.display = 'block';
    }

    hideReticle() {
        this.reticle.style.display = 'none';
    }

    setReticleActive(active) {
        if (active) {
            this.reticle.classList.add('active');
            this.prompt.classList.remove('hidden');
        } else {
            this.reticle.classList.remove('active');
            this.prompt.classList.add('hidden');
        }
    }

    setPromptText(text) {
        this.prompt.innerText = `[ ${text} ]`;
    }

    // Dialogue System
    isDialogueActive() {
        return !this.dialogueContainer.classList.contains('hidden');
    }

    showDialogue(lines) {
        if (typeof lines === 'string') {
            this.currentDialogue = [lines];
        } else {
            this.currentDialogue = lines;
        }

        this.dialogueIndex = 0;
        this.dialogueContainer.classList.remove('hidden');
        this.reticle.style.display = 'none'; // hide reticle during dialogue
        this.prompt.classList.add('hidden');
        this.typeLine();
    }

    typeLine() {
        if (this.dialogueIndex >= this.currentDialogue.length) {
            this.closeDialogue();
            return;
        }

        this.isTyping = true;
        this.dialogueText.innerHTML = '';
        const line = this.currentDialogue[this.dialogueIndex];
        let charIndex = 0;

        // Clear any existing typing interval
        if (this.typeInterval) clearInterval(this.typeInterval);

        // (Text-To-Speech has been removed per user request)
        this.typeInterval = setInterval(() => {
            if (charIndex < line.length) {
                // handle HTML like <br> or colored spans roughly
                if (line[charIndex] === '<') {
                    let tag = '';
                    while (line[charIndex] !== '>' && charIndex < line.length) {
                        tag += line[charIndex];
                        charIndex++;
                    }
                    tag += '>';
                    this.dialogueText.innerHTML += tag;
                } else {
                    const char = line[charIndex];
                    this.dialogueText.innerHTML += char;
                    if (this.audioManager && char !== ' ' && Math.random() > 0.3) {
                        this.audioManager.playDialogueBlip();
                    }
                    charIndex++;
                }
            } else {
                this.finishTyping();
            }
        }, this.typeSpeed);
    }

    finishTyping() {
        clearInterval(this.typeInterval);
        this.dialogueText.innerHTML = this.currentDialogue[this.dialogueIndex];
        this.isTyping = false;
    }

    nextLine() {
        this.dialogueIndex++;
        this.typeLine();
    }

    closeDialogue() {
        this.dialogueContainer.classList.add('hidden');
        this.reticle.style.display = 'block';
        this.currentDialogue = [];

        // Ensure voice cuts off when window closes
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    // Inventory System
    addInventoryItem(name, id) {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.id = 'inv-' + id;
        item.innerText = name;
        this.inventoryContainer.appendChild(item);

        // Animate in
        if (window.gsap) {
            gsap.fromTo(item, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.5 });
        }
    }

    // Timer UI
    showTimer() {
        document.getElementById('timer-container').classList.remove('hidden');
    }

    updateTimer(secondsLeft) {
        const timerContainer = document.getElementById('timer-container');
        const timerText = document.getElementById('timer-text');

        // Format to 2 decimal places
        timerText.innerText = secondsLeft.toFixed(2);

        if (secondsLeft <= 10.0 && !timerContainer.classList.contains('urgent')) {
            timerContainer.classList.add('urgent');
        }
    }

    hideTimer() {
        document.getElementById('timer-container').classList.add('hidden');
    }

    // Game Over UI
    showGameOver() {
        this.hideTimer();
        this.hideReticle();
        document.getElementById('dialogue-container').classList.add('hidden');
        document.getElementById('game-over').classList.remove('hidden');

        // Disable pointer lock so they can click the button
        document.exitPointerLock();
    }

    // Keypad UI
    setupKeypad() {
        this.keypadContainer = document.getElementById('keypad-container');
        this.keypadInput = document.getElementById('keypad-input');
        this.keypadError = document.getElementById('keypad-error');
        this.expectedCode = "";
        this.onKeypadSuccess = null;

        const buttons = document.querySelectorAll('.key-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent click passing through
                e.preventDefault();
                e.stopPropagation();

                const val = e.target.innerText;
                if (val === 'C') {
                    this.keypadInput.value = "";
                    this.keypadError.classList.add('hidden');
                } else if (val === 'E') {
                    this.submitKeypad();
                } else {
                    if (this.keypadInput.value.length < 4) {
                        this.keypadInput.value += val;
                        this.keypadError.classList.add('hidden');
                    }
                }
            });
        });

        // Hide if clicking outside
        this.keypadContainer.addEventListener('mousedown', (e) => {
            if (e.target === this.keypadContainer) {
                this.hideKeypad();
            }
        });
    }

    showKeypad(code, onSuccessCallback) {
        if (!this.keypadContainer) this.setupKeypad();
        this.expectedCode = code;
        this.onKeypadSuccess = onSuccessCallback;

        this.keypadInput.value = "";
        this.keypadError.classList.add('hidden');
        this.keypadContainer.classList.remove('hidden');
        this.hideReticle();

        // Unlock mouse so they can click the keypad
        document.exitPointerLock();
    }

    hideKeypad() {
        if (this.keypadContainer) {
            this.keypadContainer.classList.add('hidden');
        }
        this.showReticle();
    }

    submitKeypad() {
        if (this.keypadInput.value === this.expectedCode) {
            this.hideKeypad();
            if (this.onKeypadSuccess) this.onKeypadSuccess();
        } else {
            this.keypadError.classList.remove('hidden');
            this.keypadInput.value = ""; // Clear on fail
            // Restart CSS animation by re-triggering reflow
            this.keypadError.style.animation = 'none';
            this.keypadError.offsetHeight; /* trigger reflow */
            this.keypadError.style.animation = null;
        }
    }
}
