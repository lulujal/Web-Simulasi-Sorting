/* ============================================================
   SIMULASI SORTING INTERAKTIF — APPLICATION LOGIC
   ============================================================ */

// ---- UTILITY FUNCTIONS ----
function randomArray(size, min = 5, max = 95) {
    const arr = [];
    while (arr.length < size) {
        const v = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!arr.includes(v)) arr.push(v);
    }
    return arr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getSpeedDelay(speedVal) {
    const map = { 1: 1200, 2: 800, 3: 500, 4: 300, 5: 150 };
    return map[speedVal] || 500;
}

// ============================================================
// BLOCK RENDERER — renders array blocks into a container
// ============================================================
class BlockRenderer {
    constructor(container, opts = {}) {
        this.container = container;
        this.blockWidth = opts.blockWidth || 56;
        this.gap = opts.gap || 6;
        this.maxBarExtra = opts.maxBarExtra || 80;
        this.minBarHeight = opts.minBarHeight || 45;
    }

    render(array, highlights = {}) {
        this.container.innerHTML = '';
        if (!array || array.length === 0) return;
        const maxVal = Math.max(...array);

        array.forEach((value, index) => {
            const block = document.createElement('div');
            block.className = 'block';
            block.dataset.index = index;
            block.dataset.value = value;

            const h = this.minBarHeight + (value / maxVal) * this.maxBarExtra;
            block.style.height = `${h}px`;

            // Index label
            const idxLabel = document.createElement('span');
            idxLabel.className = 'block-index';
            idxLabel.textContent = index;
            block.appendChild(idxLabel);

            // Value
            const valSpan = document.createElement('span');
            valSpan.className = 'block-value';
            valSpan.textContent = value;
            block.appendChild(valSpan);

            // Apply highlight classes
            if (highlights.sorted && highlights.sorted.includes(index)) block.classList.add('sorted');
            if (highlights.comparing && highlights.comparing.includes(index)) block.classList.add('comparing');
            if (highlights.swapping && highlights.swapping.includes(index)) block.classList.add('swapping');
            if (highlights.minimum === index) block.classList.add('minimum');
            if (highlights.key === index) block.classList.add('key');
            if (highlights.dimmed && highlights.dimmed.includes(index)) block.classList.add('dimmed');
            if (highlights.targetPos === index) block.classList.add('target-pos');
            if (highlights.clickable && highlights.clickable.includes(index)) block.classList.add('clickable');

            this.container.appendChild(block);
        });
    }

    getBlock(index) {
        return this.container.querySelector(`.block[data-index="${index}"]`);
    }

    async animateSwap(i, j) {
        const blockI = this.getBlock(i);
        const blockJ = this.getBlock(j);
        if (!blockI || !blockJ) return;
        const dist = (Math.abs(j - i)) * (this.blockWidth + this.gap);
        blockI.style.setProperty('--swap-dist', `${dist}px`);
        blockJ.style.setProperty('--swap-dist', `${dist}px`);
        blockI.classList.add(j > i ? 'swap-right' : 'swap-left');
        blockJ.classList.add(j > i ? 'swap-left' : 'swap-right');
        await sleep(400);
        blockI.classList.remove('swap-right', 'swap-left');
        blockJ.classList.remove('swap-right', 'swap-left');
    }

    shakeBlock(index) {
        const block = this.getBlock(index);
        if (!block) return;
        block.classList.add('shake');
        setTimeout(() => block.classList.remove('shake'), 600);
    }

    glowBlock(index) {
        const block = this.getBlock(index);
        if (!block) return;
        block.classList.add('glow');
        setTimeout(() => block.classList.remove('glow'), 700);
    }
}

// ============================================================
// STEP GENERATORS — pre-compute algorithm steps
// ============================================================
function generateSelectionSortSteps(arr) {
    const steps = [];
    const a = [...arr];
    const n = a.length;
    let totalComp = 0, totalSwap = 0;

    steps.push({
        type: 'init', array: [...a],
        desc: `Array awal: [${a.join(', ')}]. Selection Sort mencari elemen terkecil di bagian yang belum terurut, lalu menukarnya ke posisi yang tepat.`,
        sorted: [], comparing: [], minimum: -1, swapping: [], comp: 0, swap: 0
    });

    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        steps.push({
            type: 'start_iter', array: [...a],
            desc: `Iterasi ke-${i + 1}: Mencari elemen terkecil dari posisi ${i} sampai ${n - 1}. Minimum sementara: ${a[i]} (posisi ${i}).`,
            sorted: Array.from({ length: i }, (_, k) => k), comparing: [], minimum: i, swapping: [],
            comp: totalComp, swap: totalSwap
        });

        for (let j = i + 1; j < n; j++) {
            totalComp++;
            const isSmaller = a[j] < a[minIdx];
            steps.push({
                type: 'compare', array: [...a],
                desc: `Membandingkan ${a[j]} (posisi ${j}) dengan ${a[minIdx]} (minimum sementara, posisi ${minIdx}). ${isSmaller ? `Karena ${a[j]} < ${a[minIdx]}, minimum baru = ${a[j]}.` : `Karena ${a[j]} ≥ ${a[minIdx]}, minimum tetap ${a[minIdx]}.`}`,
                sorted: Array.from({ length: i }, (_, k) => k),
                comparing: [j, minIdx], minimum: minIdx, swapping: [],
                comp: totalComp, swap: totalSwap
            });

            if (isSmaller) {
                minIdx = j;
            }
        }

        if (minIdx !== i) {
            totalSwap++;
            steps.push({
                type: 'swap', array: [...a],
                desc: `Menukar ${a[i]} (posisi ${i}) dengan ${a[minIdx]} (posisi ${minIdx}).`,
                sorted: Array.from({ length: i }, (_, k) => k),
                comparing: [], minimum: -1, swapping: [i, minIdx],
                comp: totalComp, swap: totalSwap
            });
            [a[i], a[minIdx]] = [a[minIdx], a[i]];
        } else {
            steps.push({
                type: 'no_swap', array: [...a],
                desc: `Elemen ${a[i]} sudah berada di posisi yang tepat. Tidak perlu pertukaran.`,
                sorted: Array.from({ length: i }, (_, k) => k),
                comparing: [], minimum: -1, swapping: [],
                comp: totalComp, swap: totalSwap
            });
        }

        steps.push({
            type: 'mark_sorted', array: [...a],
            desc: `Posisi ${i} sudah final dengan nilai ${a[i]}.`,
            sorted: Array.from({ length: i + 1 }, (_, k) => k),
            comparing: [], minimum: -1, swapping: [],
            comp: totalComp, swap: totalSwap
        });
    }

    steps.push({
        type: 'done', array: [...a],
        desc: `Pengurutan selesai! Array terurut: [${a.join(', ')}].`,
        sorted: Array.from({ length: n }, (_, k) => k),
        comparing: [], minimum: -1, swapping: [],
        comp: totalComp, swap: totalSwap
    });
    return steps;
}

function generateInsertionSortSteps(arr) {
    const steps = [];
    const a = [...arr];
    const n = a.length;
    let totalComp = 0, totalSwap = 0;

    steps.push({
        type: 'init', array: [...a],
        desc: `Array awal: [${a.join(', ')}]. Insertion Sort mengambil elemen satu per satu dan menyisipkannya ke posisi yang tepat di bagian yang sudah terurut.`,
        sorted: [0], comparing: [], key: -1, keyValue: null, shifting: [], insertAt: -1,
        comp: 0, swap: 0
    });

    for (let i = 1; i < n; i++) {
        const key = a[i];
        steps.push({
            type: 'pick_key', array: [...a],
            desc: `Iterasi ke-${i}: Mengambil elemen ${key} (posisi ${i}) sebagai "kunci" untuk disisipkan ke bagian terurut [${a.slice(0, i).join(', ')}].`,
            sorted: Array.from({ length: i }, (_, k) => k), comparing: [],
            key: i, keyValue: key, shifting: [], insertAt: -1,
            comp: totalComp, swap: totalSwap
        });

        let j = i - 1;
        while (j >= 0) {
            totalComp++;
            if (a[j] > key) {
                steps.push({
                    type: 'compare_shift', array: [...a],
                    desc: `Membandingkan kunci ${key} dengan ${a[j]} (posisi ${j}). Karena ${a[j]} > ${key}, geser ${a[j]} ke kanan.`,
                    sorted: Array.from({ length: i }, (_, k) => k),
                    comparing: [j], key: -1, keyValue: key, shifting: [j], insertAt: -1,
                    comp: totalComp, swap: totalSwap
                });
                totalSwap++;
                a[j + 1] = a[j];
                j--;
            } else {
                steps.push({
                    type: 'compare_stop', array: [...a],
                    desc: `Membandingkan kunci ${key} dengan ${a[j]} (posisi ${j}). Karena ${a[j]} ≤ ${key}, kunci disisipkan setelah posisi ${j}.`,
                    sorted: Array.from({ length: i }, (_, k) => k),
                    comparing: [j], key: -1, keyValue: key, shifting: [], insertAt: -1,
                    comp: totalComp, swap: totalSwap
                });
                break;
            }
        }
        if (j < 0) {
            steps.push({
                type: 'compare_stop', array: [...a],
                desc: `Sudah mencapai awal array. Kunci ${key} disisipkan di posisi 0.`,
                sorted: Array.from({ length: i }, (_, k) => k),
                comparing: [], key: -1, keyValue: key, shifting: [], insertAt: -1,
                comp: totalComp, swap: totalSwap
            });
        }

        a[j + 1] = key;
        steps.push({
            type: 'insert', array: [...a],
            desc: `Menyisipkan kunci ${key} di posisi ${j + 1}. Bagian terurut: [${a.slice(0, i + 1).join(', ')}].`,
            sorted: Array.from({ length: i + 1 }, (_, k) => k),
            comparing: [], key: -1, keyValue: key, shifting: [], insertAt: j + 1,
            comp: totalComp, swap: totalSwap
        });
    }

    steps.push({
        type: 'done', array: [...a],
        desc: `Pengurutan selesai! Array terurut: [${a.join(', ')}].`,
        sorted: Array.from({ length: n }, (_, k) => k),
        comparing: [], key: -1, keyValue: null, shifting: [], insertAt: -1,
        comp: totalComp, swap: totalSwap
    });
    return steps;
}

// ============================================================
// MODE 1: INTERACTIVE MANUAL
// ============================================================
class InteractiveMode {
    constructor() {
        this.array = [];
        this.originalArray = [];
        this.algo = 'selection';
        this.currentIter = 0;
        this.totalSteps = 0;
        this.isActive = false;
        this.renderer = new BlockRenderer(document.getElementById('blocks-interactive'));

        // DOM refs
        this.algoSelect = document.getElementById('algo-interactive');
        this.sizeSelect = document.getElementById('size-interactive');
        this.btnNew = document.getElementById('btn-new-interactive');
        this.btnReset = document.getElementById('btn-reset-interactive');
        this.instructionBox = document.getElementById('instruction-interactive');
        this.instructionText = this.instructionBox.querySelector('.instruction-text');
        this.iterDisplay = document.getElementById('iter-interactive');
        this.stepDisplay = document.getElementById('step-interactive');
        this.blocksContainer = document.getElementById('blocks-interactive');
        this.markersContainer = document.getElementById('markers-interactive');
        this.feedbackEl = document.getElementById('feedback-interactive');
        this.progressBar = document.getElementById('progress-interactive');
        this.completeMsg = document.getElementById('complete-interactive');

        this.init();
    }

    init() {
        this.btnNew.addEventListener('click', () => this.newArray());
        this.btnReset.addEventListener('click', () => this.reset());
        this.algoSelect.addEventListener('change', () => { this.algo = this.algoSelect.value; });
    }

    newArray() {
        const size = parseInt(this.sizeSelect.value);
        this.algo = this.algoSelect.value;
        this.array = randomArray(size);
        this.originalArray = [...this.array];
        this.currentIter = 0;
        this.totalSteps = 0;
        this.isActive = true;
        this.completeMsg.classList.add('hidden');
        this.feedbackEl.classList.add('hidden');
        this.progressBar.style.width = '0%';
        this.markersContainer.innerHTML = '';

        if (this.algo === 'selection') {
            this.startSelectionInteractive();
        } else {
            this.startInsertionInteractive();
        }
    }

    reset() {
        if (this.originalArray.length === 0) return;
        this.array = [...this.originalArray];
        this.currentIter = 0;
        this.totalSteps = 0;
        this.isActive = true;
        this.completeMsg.classList.add('hidden');
        this.feedbackEl.classList.add('hidden');
        this.progressBar.style.width = '0%';
        this.markersContainer.innerHTML = '';

        if (this.algo === 'selection') {
            this.startSelectionInteractive();
        } else {
            this.startInsertionInteractive();
        }
    }

    showFeedback(type, message) {
        this.feedbackEl.className = `feedback ${type}`;
        this.feedbackEl.textContent = message;
        this.feedbackEl.classList.remove('hidden');
        if (type === 'error') {
            setTimeout(() => this.feedbackEl.classList.add('hidden'), 2500);
        }
    }

    setInstruction(text, type = '') {
        this.instructionText.innerHTML = text;
        this.instructionBox.className = 'instruction-box' + (type ? ` ${type}-instruction` : '');
    }

    updateProgress() {
        const n = this.array.length;
        const pct = Math.min(100, (this.currentIter / (n - 1)) * 100);
        this.progressBar.style.width = `${pct}%`;
    }

    // ---- SELECTION SORT INTERACTIVE ----
    startSelectionInteractive() {
        const i = this.currentIter;
        const n = this.array.length;

        if (i >= n - 1) {
            this.completeSort();
            return;
        }

        this.iterDisplay.textContent = `${i + 1} / ${n - 1}`;
        this.stepDisplay.textContent = `${this.totalSteps}`;

        // Find actual minimum
        let minVal = this.array[i], minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (this.array[j] < minVal) { minVal = this.array[j]; minIdx = j; }
        }
        this._selectionMinIdx = minIdx;

        // Render with clickable unsorted blocks
        const sorted = Array.from({ length: i }, (_, k) => k);
        const clickable = Array.from({ length: n - i }, (_, k) => k + i);
        this.renderer.render(this.array, { sorted, clickable, targetPos: i });

        this.setInstruction(
            `<strong>Selection Sort — Iterasi ${i + 1}:</strong> Temukan blok bernilai <strong>paling kecil</strong> di area yang belum terurut (posisi ${i}–${n - 1}) dan <strong>klik</strong> blok tersebut.`
        );

        // Attach click handlers
        this.blocksContainer.querySelectorAll('.block.clickable').forEach(block => {
            block.addEventListener('click', (e) => this.handleSelectionClick(parseInt(block.dataset.index)), { once: true });
        });
    }

    handleSelectionClick(clickedIdx) {
        if (!this.isActive) return;
        const i = this.currentIter;

        if (clickedIdx === this._selectionMinIdx) {
            // Correct!
            this.totalSteps++;
            this.renderer.glowBlock(clickedIdx);
            this.showFeedback('success', `✅ Benar! ${this.array[clickedIdx]} adalah nilai terkecil.`);

            if (clickedIdx !== i) {
                // Swap
                [this.array[i], this.array[clickedIdx]] = [this.array[clickedIdx], this.array[i]];
            }

            this.currentIter++;
            this.updateProgress();

            setTimeout(() => {
                this.feedbackEl.classList.add('hidden');
                this.startSelectionInteractive();
            }, 800);
        } else {
            // Wrong
            this.renderer.shakeBlock(clickedIdx);
            const hint = `❌ ${this.array[clickedIdx]} bukan yang terkecil. Coba cari lagi! Petunjuk: perhatikan semua blok biru dengan teliti.`;
            this.showFeedback('error', hint);

            // Re-attach click handlers
            setTimeout(() => {
                this.blocksContainer.querySelectorAll('.block.clickable').forEach(block => {
                    const clone = block.cloneNode(true);
                    block.parentNode.replaceChild(clone, block);
                    clone.addEventListener('click', () => this.handleSelectionClick(parseInt(clone.dataset.index)), { once: true });
                });
            }, 600);
        }
    }

    // ---- INSERTION SORT INTERACTIVE ----
    startInsertionInteractive() {
        const i = this.currentIter + 1; // insertionSort starts from index 1
        const n = this.array.length;

        if (i >= n) {
            this.completeSort();
            return;
        }

        this.iterDisplay.textContent = `${this.currentIter + 1} / ${n - 1}`;
        this.stepDisplay.textContent = `${this.totalSteps}`;

        const keyValue = this.array[i];
        this._insertionKey = keyValue;
        this._insertionKeyIdx = i;

        // Determine correct insertion position
        let correctPos = 0;
        for (let p = 0; p < i; p++) {
            if (this.array[p] <= keyValue) correctPos = p + 1;
        }
        this._insertionCorrectPos = correctPos;

        // Render: sorted portion + key element
        const sorted = Array.from({ length: i }, (_, k) => k);
        const dimmed = Array.from({ length: n - i - 1 }, (_, k) => k + i + 1);
        this.renderer.render(this.array, { sorted, key: i, dimmed });

        this.setInstruction(
            `<strong>Insertion Sort — Iterasi ${this.currentIter + 1}:</strong> Angka <strong>${keyValue}</strong> (blok melayang) perlu disisipkan di posisi yang tepat di antara blok terurut [${this.array.slice(0, i).join(', ')}]. <strong>Klik tanda ↓</strong> di posisi yang benar.`
        );

        // Create insertion markers
        this.markersContainer.innerHTML = '';
        for (let p = 0; p <= i; p++) {
            const marker = document.createElement('button');
            marker.className = 'insert-marker';
            marker.textContent = '↓';
            marker.title = p === 0 ? 'Sisipkan di awal' : `Sisipkan setelah ${this.array[p - 1]}`;
            marker.dataset.position = p;

            // Add spacing to align with blocks
            if (p < i) {
                marker.style.marginRight = `${this.renderer.blockWidth - 22}px`;
            }

            marker.addEventListener('click', () => this.handleInsertionClick(p), { once: true });
            this.markersContainer.appendChild(marker);
        }
    }

    handleInsertionClick(position) {
        if (!this.isActive) return;
        const correctPos = this._insertionCorrectPos;

        if (position === correctPos) {
            // Correct!
            this.totalSteps++;
            // Mark correct marker
            this.markersContainer.querySelectorAll('.insert-marker').forEach(m => {
                if (parseInt(m.dataset.position) === position) m.classList.add('correct-marker');
            });
            this.showFeedback('success', `✅ Benar! Angka ${this._insertionKey} disisipkan di posisi ${position}.`);

            // Perform insertion
            const key = this.array.splice(this._insertionKeyIdx, 1)[0];
            this.array.splice(position, 0, key);

            this.currentIter++;
            this.updateProgress();

            setTimeout(() => {
                this.feedbackEl.classList.add('hidden');
                this.markersContainer.innerHTML = '';
                this.startInsertionInteractive();
            }, 800);
        } else {
            // Wrong
            this.markersContainer.querySelectorAll('.insert-marker').forEach(m => {
                if (parseInt(m.dataset.position) === position) m.classList.add('wrong-marker');
            });

            let hint;
            if (position < correctPos) {
                hint = `❌ Posisi terlalu kiri. Angka ${this._insertionKey} lebih besar dari elemen di posisi ${position > 0 ? position - 1 : 0}. Coba posisi lebih ke kanan.`;
            } else {
                hint = `❌ Posisi terlalu kanan. Angka ${this._insertionKey} lebih kecil dari elemen sebelum posisi ini. Coba posisi lebih ke kiri.`;
            }
            this.showFeedback('error', hint);

            // Re-enable markers after brief delay
            setTimeout(() => {
                this.markersContainer.querySelectorAll('.insert-marker').forEach(m => {
                    m.classList.remove('wrong-marker');
                    const clone = m.cloneNode(true);
                    m.parentNode.replaceChild(clone, m);
                    clone.addEventListener('click', () => this.handleInsertionClick(parseInt(clone.dataset.position)), { once: true });
                });
            }, 700);
        }
    }

    completeSort() {
        this.isActive = false;
        this.renderer.render(this.array, { sorted: Array.from({ length: this.array.length }, (_, k) => k) });
        this.markersContainer.innerHTML = '';
        this.progressBar.style.width = '100%';
        this.completeMsg.classList.remove('hidden');
        this.setInstruction(`🎉 <strong>Luar biasa!</strong> Kamu berhasil mengurutkan array menggunakan ${this.algo === 'selection' ? 'Selection Sort' : 'Insertion Sort'} dalam ${this.totalSteps} langkah!`, 'success');
    }
}

// ============================================================
// MODE 2: TRACING TERPANDU
// ============================================================
class TracingMode {
    constructor() {
        this.steps = [];
        this.currentStep = 0;
        this.isPlaying = false;
        this.playTimer = null;
        this.renderer = new BlockRenderer(document.getElementById('blocks-tracing'));
        this.quizShownAt = new Set();
        this.quizInterval = 5; // Show quiz every N compare steps
        this.compareCount = 0;

        // DOM refs
        this.algoSelect = document.getElementById('algo-tracing');
        this.sizeSelect = document.getElementById('size-tracing');
        this.speedSlider = document.getElementById('speed-tracing');
        this.speedLabel = document.getElementById('speed-label-tracing');
        this.btnNew = document.getElementById('btn-new-tracing');
        this.btnReset = document.getElementById('btn-reset-tracing');
        this.btnPrev = document.getElementById('btn-prev-tracing');
        this.btnPlay = document.getElementById('btn-play-tracing');
        this.btnPause = document.getElementById('btn-pause-tracing');
        this.btnNext = document.getElementById('btn-next-tracing');
        this.stepCounter = document.getElementById('step-counter-tracing');
        this.compDisplay = document.getElementById('comp-tracing');
        this.swapDisplay = document.getElementById('swap-tracing');
        this.narrativeText = document.getElementById('narrative-text-tracing');
        this.progressBar = document.getElementById('progress-tracing');

        this.init();
    }

    init() {
        this.btnNew.addEventListener('click', () => this.newArray());
        this.btnReset.addEventListener('click', () => this.resetToStart());
        this.btnPrev.addEventListener('click', () => this.prevStep());
        this.btnPlay.addEventListener('click', () => this.play());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnNext.addEventListener('click', () => this.nextStep());
        this.speedSlider.addEventListener('input', () => {
            this.speedLabel.textContent = `${this.speedSlider.value}×`;
        });
    }

    newArray() {
        this.pause();
        const size = parseInt(this.sizeSelect.value);
        const algo = this.algoSelect.value;
        const arr = randomArray(size);

        this.steps = algo === 'selection'
            ? generateSelectionSortSteps(arr)
            : generateInsertionSortSteps(arr);

        this.currentStep = 0;
        this.compareCount = 0;
        this.quizShownAt.clear();
        this.renderCurrentStep();
    }

    resetToStart() {
        this.pause();
        this.currentStep = 0;
        this.compareCount = 0;
        this.quizShownAt.clear();
        if (this.steps.length > 0) this.renderCurrentStep();
    }

    renderCurrentStep() {
        if (this.steps.length === 0) return;
        const step = this.steps[this.currentStep];

        // Render blocks with highlights
        const highlights = {
            sorted: step.sorted || [],
            comparing: step.comparing || [],
            swapping: step.swapping || [],
            minimum: step.minimum != null ? step.minimum : -1,
        };
        if (step.key != null && step.key >= 0) highlights.key = step.key;
        if (step.insertAt != null && step.insertAt >= 0) highlights.targetPos = step.insertAt;
        if (step.shifting && step.shifting.length > 0) {
            highlights.swapping = step.shifting;
        }

        this.renderer.render(step.array, highlights);

        // Update narrative
        this.narrativeText.innerHTML = step.desc;

        // Update counters
        this.stepCounter.textContent = `${this.currentStep} / ${this.steps.length - 1}`;
        this.compDisplay.textContent = step.comp || 0;
        this.swapDisplay.textContent = step.swap || 0;

        // Update progress
        const pct = this.steps.length > 1 ? (this.currentStep / (this.steps.length - 1)) * 100 : 0;
        this.progressBar.style.width = `${pct}%`;
    }

    async nextStep() {
        if (this.currentStep >= this.steps.length - 1) {
            this.pause();
            return;
        }

        this.currentStep++;
        this.renderCurrentStep();

        const step = this.steps[this.currentStep];
        // Count compares for quiz
        if (step.type === 'compare' || step.type === 'compare_shift' || step.type === 'compare_stop') {
            this.compareCount++;
        }

        // Check if quiz should appear
        if (this.compareCount > 0 && this.compareCount % this.quizInterval === 0 && !this.quizShownAt.has(this.compareCount)) {
            this.quizShownAt.add(this.compareCount);
            const wasPlaying = this.isPlaying;
            this.pause();
            await this.showQuiz();
            if (wasPlaying) this.play();
        }
    }

    prevStep() {
        if (this.currentStep <= 0) return;
        this.currentStep--;
        // Recount compares up to current step
        this.compareCount = 0;
        for (let i = 0; i <= this.currentStep; i++) {
            const s = this.steps[i];
            if (s.type === 'compare' || s.type === 'compare_shift' || s.type === 'compare_stop') {
                this.compareCount++;
            }
        }
        this.renderCurrentStep();
    }

    play() {
        if (this.steps.length === 0 || this.currentStep >= this.steps.length - 1) return;
        this.isPlaying = true;
        this.btnPlay.classList.add('hidden');
        this.btnPause.classList.remove('hidden');

        const tick = async () => {
            if (!this.isPlaying || this.currentStep >= this.steps.length - 1) {
                this.pause();
                return;
            }
            await this.nextStep();
            if (this.isPlaying) {
                const delay = getSpeedDelay(parseInt(this.speedSlider.value));
                this.playTimer = setTimeout(tick, delay);
            }
        };
        const delay = getSpeedDelay(parseInt(this.speedSlider.value));
        this.playTimer = setTimeout(tick, delay);
    }

    pause() {
        this.isPlaying = false;
        if (this.playTimer) { clearTimeout(this.playTimer); this.playTimer = null; }
        this.btnPlay.classList.remove('hidden');
        this.btnPause.classList.add('hidden');
    }

    showQuiz() {
        return new Promise(resolve => {
            // Find the next compare step to base the quiz on
            let nextCompareStep = null;
            for (let i = this.currentStep + 1; i < this.steps.length; i++) {
                const s = this.steps[i];
                if (s.type === 'compare' || s.type === 'compare_shift' || s.type === 'compare_stop') {
                    nextCompareStep = s;
                    break;
                }
            }
            if (!nextCompareStep) { resolve(); return; }

            // Extract the two values being compared in the next step
            const arr = nextCompareStep.array;
            const compIndices = nextCompareStep.comparing || [];
            const algo = this.algoSelect.value;

            let question, correctOption, options;

            if (algo === 'selection' && compIndices.length === 2) {
                const val1 = arr[compIndices[0]];
                const val2 = arr[compIndices[1]];
                question = `Menurut pola Selection Sort yang sedang berjalan, dua angka mana yang akan dibandingkan pada langkah selanjutnya?`;
                correctOption = `${val1} dan ${val2}`;

                // Generate distractors
                const distractors = new Set();
                distractors.add(correctOption);
                while (distractors.size < 4 && distractors.size < arr.length) {
                    const a = arr[Math.floor(Math.random() * arr.length)];
                    const b = arr[Math.floor(Math.random() * arr.length)];
                    if (a !== b) distractors.add(`${a} dan ${b}`);
                }
                options = Array.from(distractors);
            } else if (compIndices.length >= 1) {
                const keyVal = nextCompareStep.keyValue;
                const cmpVal = arr[compIndices[0]];
                question = `Menurut pola Insertion Sort yang sedang berjalan, kunci ${keyVal} akan dibandingkan dengan angka berapa pada langkah selanjutnya?`;
                correctOption = `${cmpVal}`;

                const distractors = new Set();
                distractors.add(correctOption);
                arr.forEach(v => { if (distractors.size < 4) distractors.add(`${v}`); });
                options = Array.from(distractors);
            } else {
                resolve();
                return;
            }

            // Shuffle options
            options.sort(() => Math.random() - 0.5);
            const correctIdx = options.indexOf(correctOption);

            quizModal.show(question, options, correctIdx, () => resolve());
        });
    }
}

// ============================================================
// MODE 3: BALAPAN ALGORITMA (RACE)
// ============================================================
class RaceMode {
    constructor() {
        this.inputArray = [];
        this.isRunning = false;
        this.insertionDone = false;
        this.selectionDone = false;
        this.insertionRenderer = new BlockRenderer(document.getElementById('blocks-race-insertion'), { blockWidth: 44, maxBarExtra: 60, minBarHeight: 35 });
        this.selectionRenderer = new BlockRenderer(document.getElementById('blocks-race-selection'), { blockWidth: 44, maxBarExtra: 60, minBarHeight: 35 });

        this.insertionSteps = [];
        this.selectionSteps = [];
        this.insertionIdx = 0;
        this.selectionIdx = 0;
        this.insertionTimer = null;
        this.selectionTimer = null;
        this.insertionStartTime = 0;
        this.selectionStartTime = 0;
        this.insertionEndTime = 0;
        this.selectionEndTime = 0;

        // DOM refs
        this.inputField = document.getElementById('input-race');
        this.sizeSelect = document.getElementById('size-race');
        this.speedSlider = document.getElementById('speed-race');
        this.speedLabel = document.getElementById('speed-label-race');
        this.btnRandom = document.getElementById('btn-random-race');
        this.btnStart = document.getElementById('btn-start-race');
        this.btnReset = document.getElementById('btn-reset-race');
        this.compInsertion = document.getElementById('comp-race-insertion');
        this.swapInsertion = document.getElementById('swap-race-insertion');
        this.statusInsertion = document.getElementById('status-race-insertion');
        this.compSelection = document.getElementById('comp-race-selection');
        this.swapSelection = document.getElementById('swap-race-selection');
        this.statusSelection = document.getElementById('status-race-selection');
        this.dashboard = document.getElementById('dashboard-race');

        this.init();
    }

    init() {
        this.btnRandom.addEventListener('click', () => this.generateRandom());
        this.btnStart.addEventListener('click', () => this.startRace());
        this.btnReset.addEventListener('click', () => this.resetRace());
        this.speedSlider.addEventListener('input', () => {
            this.speedLabel.textContent = `${this.speedSlider.value}×`;
        });

        // Preset buttons
        document.querySelectorAll('.btn-chip[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-chip').forEach(b => b.classList.remove('active-chip'));
                btn.classList.add('active-chip');
                this.generatePreset(btn.dataset.preset);
            });
        });
    }

    generateRandom() {
        const size = parseInt(this.sizeSelect.value);
        this.inputArray = randomArray(size);
        this.inputField.value = this.inputArray.join(', ');
        this.previewArrays();
    }

    generatePreset(type) {
        const size = parseInt(this.sizeSelect.value);
        let arr;
        switch (type) {
            case 'random':
                arr = randomArray(size);
                break;
            case 'nearly': {
                arr = Array.from({ length: size }, (_, i) => (i + 1) * 5);
                // Swap 1-2 adjacent pairs
                const swaps = Math.max(1, Math.floor(size / 5));
                for (let s = 0; s < swaps; s++) {
                    const idx = Math.floor(Math.random() * (size - 1));
                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                }
                break;
            }
            case 'reversed':
                arr = Array.from({ length: size }, (_, i) => (size - i) * 5);
                break;
            case 'few-unique': {
                const vals = [10, 20, 30];
                arr = Array.from({ length: size }, () => vals[Math.floor(Math.random() * vals.length)]);
                break;
            }
            case 'sensor': {
                // Simulate HC-SR04 distance sensor data (2-400 cm range, mostly clustered)
                const base = Math.floor(Math.random() * 100) + 20;
                arr = Array.from({ length: size }, () => {
                    const noise = Math.floor(Math.random() * 40) - 20;
                    return Math.max(2, Math.min(400, base + noise));
                });
                break;
            }
            default:
                arr = randomArray(size);
        }
        this.inputArray = arr;
        this.inputField.value = arr.join(', ');
        this.previewArrays();
    }

    parseInput() {
        const text = this.inputField.value.trim();
        if (!text) return null;
        const nums = text.split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        return nums.length >= 2 ? nums : null;
    }

    previewArrays() {
        if (this.inputArray.length === 0) return;
        this.insertionRenderer.render(this.inputArray, {});
        this.selectionRenderer.render(this.inputArray, {});
        this.resetStats();
    }

    resetStats() {
        this.compInsertion.textContent = '0';
        this.swapInsertion.textContent = '0';
        this.compSelection.textContent = '0';
        this.swapSelection.textContent = '0';
        this.statusInsertion.textContent = 'Menunggu';
        this.statusInsertion.className = 'status-badge waiting';
        this.statusSelection.textContent = 'Menunggu';
        this.statusSelection.className = 'status-badge waiting';
        this.dashboard.classList.add('hidden');
    }

    startRace() {
        if (this.isRunning) return;

        // Parse input
        const parsed = this.parseInput();
        if (parsed) this.inputArray = parsed;
        if (this.inputArray.length < 2) {
            this.generateRandom();
        }

        this.isRunning = true;
        this.insertionDone = false;
        this.selectionDone = false;
        this.dashboard.classList.add('hidden');
        this.btnStart.disabled = true;

        // Generate steps
        this.insertionSteps = generateInsertionSortSteps([...this.inputArray]);
        this.selectionSteps = generateSelectionSortSteps([...this.inputArray]);
        this.insertionIdx = 0;
        this.selectionIdx = 0;

        const now = performance.now();
        this.insertionStartTime = now;
        this.selectionStartTime = now;

        this.statusInsertion.textContent = 'Berjalan';
        this.statusInsertion.className = 'status-badge running';
        this.statusSelection.textContent = 'Berjalan';
        this.statusSelection.className = 'status-badge running';

        this.runLane('insertion');
        this.runLane('selection');
    }

    runLane(type) {
        const steps = type === 'insertion' ? this.insertionSteps : this.selectionSteps;
        const renderer = type === 'insertion' ? this.insertionRenderer : this.selectionRenderer;
        const compEl = type === 'insertion' ? this.compInsertion : this.compSelection;
        const swapEl = type === 'insertion' ? this.swapInsertion : this.swapSelection;
        const statusEl = type === 'insertion' ? this.statusInsertion : this.statusSelection;

        let idx = 0;

        const tick = () => {
            if (idx >= steps.length) {
                // Done
                if (type === 'insertion') {
                    this.insertionDone = true;
                    this.insertionEndTime = performance.now();
                } else {
                    this.selectionDone = true;
                    this.selectionEndTime = performance.now();
                }
                statusEl.textContent = 'Selesai';
                statusEl.className = 'status-badge done';
                this.checkRaceComplete();
                return;
            }

            const step = steps[idx];
            const highlights = {
                sorted: step.sorted || [],
                comparing: step.comparing || [],
                swapping: step.swapping || [],
            };
            if (step.minimum != null && step.minimum >= 0) highlights.minimum = step.minimum;
            if (step.key != null && step.key >= 0) highlights.key = step.key;
            if (step.insertAt != null && step.insertAt >= 0) highlights.targetPos = step.insertAt;
            if (step.shifting && step.shifting.length > 0) highlights.swapping = step.shifting;

            renderer.render(step.array, highlights);
            compEl.textContent = step.comp || 0;
            swapEl.textContent = step.swap || 0;

            idx++;
            const delay = getSpeedDelay(parseInt(this.speedSlider.value));
            const timerRef = setTimeout(tick, delay);

            if (type === 'insertion') this.insertionTimer = timerRef;
            else this.selectionTimer = timerRef;
        };

        tick();
    }

    checkRaceComplete() {
        if (!this.insertionDone || !this.selectionDone) return;
        this.isRunning = false;
        this.btnStart.disabled = false;

        const iSteps = this.insertionSteps;
        const sSteps = this.selectionSteps;
        const iLast = iSteps[iSteps.length - 1];
        const sLast = sSteps[sSteps.length - 1];

        const iComp = iLast.comp;
        const sComp = sLast.comp;
        const iSwap = iLast.swap;
        const sSwap = sLast.swap;

        // Determine finish times
        const iTime = this.insertionEndTime - this.insertionStartTime;
        const sTime = this.selectionEndTime - this.selectionStartTime;

        // Highlight winner
        if (iTime < sTime) {
            this.statusInsertion.textContent = '🏆 Menang!';
            this.statusInsertion.className = 'status-badge winner';
        } else if (sTime < iTime) {
            this.statusSelection.textContent = '🏆 Menang!';
            this.statusSelection.className = 'status-badge winner';
        } else {
            this.statusInsertion.textContent = '🤝 Seri';
            this.statusInsertion.className = 'status-badge done';
            this.statusSelection.textContent = '🤝 Seri';
            this.statusSelection.className = 'status-badge done';
        }

        // Show dashboard
        this.dashboard.classList.remove('hidden');
        document.getElementById('dash-comp-insertion').textContent = iComp;
        document.getElementById('dash-comp-selection').textContent = sComp;
        document.getElementById('dash-swap-insertion').textContent = iSwap;
        document.getElementById('dash-swap-selection').textContent = sSwap;

        // Comparison bars
        const maxComp = Math.max(iComp, sComp, 1);
        document.getElementById('bar-comp-insertion').style.width = `${(iComp / maxComp) * 100}%`;
        document.getElementById('bar-comp-insertion').querySelector('.bar-label').textContent = iComp;
        document.getElementById('bar-comp-selection').style.width = `${(sComp / maxComp) * 100}%`;
        document.getElementById('bar-comp-selection').querySelector('.bar-label').textContent = sComp;

        const maxSwap = Math.max(iSwap, sSwap, 1);
        document.getElementById('bar-swap-insertion').style.width = `${(iSwap / maxSwap) * 100}%`;
        document.getElementById('bar-swap-insertion').querySelector('.bar-label').textContent = iSwap;
        document.getElementById('bar-swap-selection').style.width = `${(sSwap / maxSwap) * 100}%`;
        document.getElementById('bar-swap-selection').querySelector('.bar-label').textContent = sSwap;

        // Data condition analysis
        const arr = this.inputArray;
        let condition = '';
        // Check if nearly sorted
        let inversions = 0;
        for (let i = 0; i < arr.length - 1; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] > arr[j]) inversions++;
            }
        }
        const maxInversions = (arr.length * (arr.length - 1)) / 2;
        const invRatio = inversions / maxInversions;

        if (invRatio < 0.1) condition = '📊 Data hampir terurut (few inversions). ';
        else if (invRatio > 0.9) condition = '🔄 Data hampir terbalik (banyak inversi). ';
        else condition = '🎲 Data acak. ';

        const uniqueVals = new Set(arr).size;
        if (uniqueVals <= 3) condition += '🔢 Hanya sedikit nilai unik. ';

        condition += `Jumlah elemen: ${arr.length}. Jumlah inversi: ${inversions} dari maksimum ${maxInversions}.`;

        document.getElementById('dash-condition').textContent = condition;
    }

    resetRace() {
        this.isRunning = false;
        this.btnStart.disabled = false;
        if (this.insertionTimer) clearTimeout(this.insertionTimer);
        if (this.selectionTimer) clearTimeout(this.selectionTimer);
        this.resetStats();

        if (this.inputArray.length > 0) {
            this.previewArrays();
        } else {
            document.getElementById('blocks-race-insertion').innerHTML = '';
            document.getElementById('blocks-race-selection').innerHTML = '';
        }
    }
}

// ============================================================
// QUIZ MODAL
// ============================================================
class QuizModal {
    constructor() {
        this.overlay = document.getElementById('quiz-modal');
        this.questionEl = document.getElementById('quiz-question');
        this.optionsEl = document.getElementById('quiz-options');
        this.feedbackEl = document.getElementById('quiz-feedback');
        this.continueBtn = document.getElementById('quiz-continue');
        this.callback = null;
    }

    show(question, options, correctIdx, callback) {
        this.callback = callback;
        this.questionEl.textContent = question;
        this.optionsEl.innerHTML = '';
        this.feedbackEl.classList.add('hidden');
        this.continueBtn.classList.add('hidden');

        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.textContent = opt;
            btn.addEventListener('click', () => this.handleAnswer(idx, correctIdx, options));
            this.optionsEl.appendChild(btn);
        });

        this.overlay.classList.remove('hidden');
    }

    handleAnswer(selectedIdx, correctIdx, options) {
        const buttons = this.optionsEl.querySelectorAll('.quiz-opt');
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === correctIdx) btn.classList.add('correct');
            if (idx === selectedIdx && idx !== correctIdx) btn.classList.add('wrong');
        });

        this.feedbackEl.classList.remove('hidden');
        if (selectedIdx === correctIdx) {
            this.feedbackEl.className = 'quiz-fb correct-fb';
            this.feedbackEl.textContent = '✅ Jawaban benar! Kamu mulai memahami polanya!';
        } else {
            this.feedbackEl.className = 'quiz-fb wrong-fb';
            this.feedbackEl.textContent = `❌ Jawaban yang tepat adalah: "${options[correctIdx]}". Perhatikan pola iterasinya ya!`;
        }

        this.continueBtn.classList.remove('hidden');
        this.continueBtn.onclick = () => this.hide();
    }

    hide() {
        this.overlay.classList.add('hidden');
        if (this.callback) {
            this.callback();
            this.callback = null;
        }
    }
}

// ============================================================
// APP — Main controller
// ============================================================
let quizModal;

class App {
    constructor() {
        this.currentMode = 'interactive';
        this.interactiveMode = null;
        this.tracingMode = null;
        this.raceMode = null;
    }

    init() {
        quizModal = new QuizModal();
        this.interactiveMode = new InteractiveMode();
        this.tracingMode = new TracingMode();
        this.raceMode = new RaceMode();

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update panels
        document.querySelectorAll('.mode-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `mode-${mode}`);
        });

        // Pause tracing when switching away
        if (mode !== 'tracing' && this.tracingMode) {
            this.tracingMode.pause();
        }
    }
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
