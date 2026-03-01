export class UI {
    constructor() {
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
                    this.dialogueText.innerHTML += line[charIndex];
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
}
