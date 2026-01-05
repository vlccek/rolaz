document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // --- SPOLEČNÉ POMOCNÉ FUNKCE ---
    // =================================================================

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function initCommonControls() {
        const stripsSlider = document.getElementById('strips-slider');
        const stripsValue = document.getElementById('strips-value');
        const widthPatternSelect = document.getElementById('width-pattern');
        const orientationSelect = document.getElementById('orientation');
        const exportBtn = document.getElementById('export-btn');
        if(stripsSlider) stripsSlider.addEventListener('input', (e) => { 
            if(stripsValue) stripsValue.textContent = e.target.value; 
        });
        if(exportBtn) exportBtn.addEventListener('click', exportImage);
        return [stripsSlider, widthPatternSelect, orientationSelect].filter(el => el !== null);
    }

    function resizeImage(image, width, height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        const resizedImage = new Image();
        resizedImage.src = tempCanvas.toDataURL();
        return resizedImage;
    }

    function calculateStripData(strips, pattern, totalSize) {
        let weights = [];
        if (pattern === 'uniform') {
            for (let i = 0; i < strips; i++) weights.push(1);
        } else {
            const center = (strips - 1) / 2;
            for (let i = 0; i < strips; i++) {
                const dist = Math.abs(i - center);
                let weight = (pattern === 'center-in') ? (center - dist) : dist;
                weights.push(Math.pow(weight, 2) + 0.1);
            }
        }
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);
        const stripData = [];
        let currentPos = 0;
        for (let i = 0; i < strips; i++) {
            const size = normalizedWeights[i] * totalSize;
            stripData.push({ pos: currentPos, size: size });
            currentPos += size;
        }
        if (stripData.length > 0) {
            stripData[stripData.length - 1].size = totalSize - stripData[stripData.length - 1].pos;
        }
        return stripData;
    }

    function exportImage() {
        const canvas = document.getElementById('canvas');
        const imageUrl = canvas.toDataURL('image/jpeg', 0.85);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'rolaz.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =================================================================
    // --- INICIALIZACE STRÁNKY ---
    // =================================================================

    if (document.getElementById('editor-advanced')) {
        initAdvancedPage();
    }

    // =================================================================
    // --- LOGIKA PRO POKROČILOU STRÁNKU ---
    // =================================================================

        function initAdvancedPage() {
            let advancedImages = [], resizedImages = [], stripPairs = [];
            let stripMode = 'alternating';
            
            // --- IMAGE CACHE & UNDO HISTORY ---
            const imageCache = {}; // Central store: { "id": ImageObject }
            const historyStack = [];
            let isUndoing = false;
            const undoBtn = document.getElementById('undo-btn');                const clearHistoryBtn = document.getElementById('clear-history-btn');
                const historyLogContainer = document.getElementById('history-log-container');
                const historyList = document.getElementById('history-list');
        
                        let lastSavedState = null;
        
                        
        
                        function captureState() {
        
                             return {
        
                                settings: {
        
                                    strips: document.getElementById('strips-slider').value,
        
                                    pattern: document.getElementById('width-pattern').value,
        
                                    orientation: document.getElementById('orientation').value,
        
                                    stripMode: document.getElementById('strip-mode').value,
        
                                    boundaryStart: document.getElementById('pair-boundary-start-slider').value,
        
                                    boundaryEnd: document.getElementById('pair-boundary-end-slider').value
        
                                },
        
                                stripPairs: JSON.parse(JSON.stringify(stripPairs)),
        
                                imageIds: advancedImages.map(img => img.id)
        
                            };
        
                        }
        
                        
        
                        // Inicializace stavu ihned
        
                        lastSavedState = captureState();
        
                
        
                        function saveHistory(actionName = "Změna nastavení") {
        
                            if (isUndoing) return;
        
                            
        
                            // Pokud ještě nemáme inicializovaný stav, zachytíme ho teď
        
                            if (!lastSavedState) lastSavedState = captureState();
        
                
        
                            historyStack.push({
        
                                state: lastSavedState,
        
                                action: actionName,
        
                                timestamp: Date.now()
        
                            });
        
                            
        
                            if (historyStack.length > 50) historyStack.shift();
        
                            
        
                            lastSavedState = captureState();
        
                            
        
                            updateHistoryUI();
        
                        }
                

                
                function performUndo() {
                

                
                    if (historyStack.length === 0) return;
                

                
                    
                

                
                    isUndoing = true;
                

                
                    const historyItem = historyStack.pop();
                

                
                    const previousState = historyItem.state;
                

                
                    
                

                
                    // 1. Obnova obrázků z ID (pomocí cache)
                

                
                    if (previousState.imageIds) {
                

                
                        const restoredImages = [];
                

                
                        previousState.imageIds.forEach(id => {
                

                
                            if (imageCache[id]) {
                

                
                                restoredImages.push(imageCache[id]);
                

                
                            }
                

                
                        });
                

                
                        advancedImages = restoredImages;
                

                
                        
                

                
                        // Přepočítat resizedImages
                

                
                        if (advancedImages.length > 0) {
                

                
                            const firstImage = advancedImages[0];
                

                
                            resizedImages = advancedImages.map((img, i) => i === 0 ? img : resizeImage(img, firstImage.width, firstImage.height));
                

                
                        } else {
                

                
                            resizedImages = [];
                

                
                        }
                

                
                        
                

                
                        // Obnovit náhledy
                

                
                        previewsContainer.innerHTML = '';
                

                
                        advancedImages.forEach((img, i) => createPreview(img.src, i));
                

                
                    }
                

                
                    
                

                
                    // Restore Settings
                

                
                    const setVal = (id, val) => {
                

                
                        const el = document.getElementById(id);
                

                
                        if (el) el.value = val;
                

                
                    };
                

                
        
                

                
                    setVal('strips-slider', previousState.settings.strips);
                

                
                    setVal('width-pattern', previousState.settings.pattern);
                

                
                    setVal('orientation', previousState.settings.orientation);
                

                
                    setVal('pair-boundary-start-slider', previousState.settings.boundaryStart);
                

                
                    setVal('pair-boundary-end-slider', previousState.settings.boundaryEnd);
                

                
                    
                

                
                    // Restore Mode
                

                
                    const modeSelect = document.getElementById('strip-mode');
                

                
                    if (modeSelect) {
                

                
                        modeSelect.value = previousState.settings.stripMode;
                

                
                        stripMode = previousState.settings.stripMode;
                

                
                        
                

                
                        // Nutné explicitně přepnout viditelnost kontejnerů
                

                
                        if (stripEditorContainer) stripEditorContainer.classList.toggle('hidden', stripMode !== 'paired');
                

                
                        if (pairBoundaryContainer) pairBoundaryContainer.classList.toggle('hidden', stripMode !== 'paired');
                

                
                    }
                

                
        
                

                
                    // Restore Strip Pairs
                

                
                    stripPairs = JSON.parse(JSON.stringify(previousState.stripPairs)); // Deep copy restoration to be safe
                

                
        
                

                
                    // Update UI values
                

                
                    const stripsVal = document.getElementById('strips-value');
                

                
                    if(stripsVal) stripsVal.textContent = previousState.settings.strips;
                

                
                    
                

                
                    if(document.getElementById('pair-boundary-start-value')) 
                

                
                        document.getElementById('pair-boundary-start-value').textContent = previousState.settings.boundaryStart;
                

                
                    if(document.getElementById('pair-boundary-end-value')) 
                

                
                        document.getElementById('pair-boundary-end-value').textContent = previousState.settings.boundaryEnd;
                

                
        
                

                
                    // Update internal state to match the restored state
                

                
                    lastSavedState = captureState(); 
                

                
                    
                

                
                    updateStripPairEditorUI();
                

                
                    createAdvancedRolaz();
                

                
                    updateHistoryUI();
                

                
                    
                

                
                    isUndoing = false;
                

                
                }
                

                
        function clearHistory() {
                
            historyStack.length = 0;
                
            updateHistoryUI();
                
        }
                

                
        function updateHistoryUI() {
                
            if (undoBtn) undoBtn.disabled = historyStack.length === 0;
                
            if (clearHistoryBtn) clearHistoryBtn.disabled = historyStack.length === 0;
                
            
                
            if (historyList && historyLogContainer) {
                
                historyList.innerHTML = '';
                
                if (historyStack.length === 0) {
                
                    historyLogContainer.classList.add('hidden');
                
                } else {
                
                    historyLogContainer.classList.remove('hidden');
                
                    // Show last 5 items reversed
                
                    [...historyStack].reverse().slice(0, 5).forEach((item, index) => {
                
                        const li = document.createElement('li');
                
                        li.className = 'px-3 py-1 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex justify-between';
                
                        const timeStr = new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'});
                
                        li.innerHTML = `<span>${item.action}</span> <span class="text-gray-400 text-[10px] ml-2">${timeStr}</span>`;
                
                        historyList.appendChild(li);
                
                    });
                
                }
                
            }
                
        }        
                if (undoBtn) undoBtn.addEventListener('click', performUndo);
                if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
        
                const stripModeSelect = document.getElementById('strip-mode');
                const stripEditorContainer = document.getElementById('strip-editor-container');
                const previewsContainer = document.getElementById('image-previews-container');
                const PREVIEW_COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];
                const schematicCanvas = document.getElementById('schematic-preview-canvas');
                const schematicCtx = schematicCanvas.getContext('2d');
                const pairBoundaryContainer = document.getElementById('pair-boundary-container');
                const pairBoundaryStartSlider = document.getElementById('pair-boundary-start-slider');
                const pairBoundaryStartValue = document.getElementById('pair-boundary-start-value');
                const pairBoundaryEndSlider = document.getElementById('pair-boundary-end-slider');
                const pairBoundaryEndValue = document.getElementById('pair-boundary-end-value');
        
                function createAdvancedRolaz() {
                    if (advancedImages.some(img => img === null) || advancedImages.length === 0) return;
                    const options = { usePairs: stripMode === 'paired', pairs: stripPairs };
                    drawAdvanced(advancedImages, resizedImages, options);
                    drawSchematicPreview(options);
                }
        
                const debouncedCreateAdvancedRolaz = debounce(createAdvancedRolaz, 200);
        
                const saveProjectBtn = document.getElementById('save-project-btn');
                if (saveProjectBtn) {
                    saveProjectBtn.addEventListener('click', () => {
                        if (advancedImages.length === 0) {
                            alert('Projekt je prázdný. Nahrajte prosím obrázky.');
                            return;
                        }
        
                        const state = {
                            version: "1.0",
                            timestamp: new Date().toISOString(),
                            settings: {
                                strips: document.getElementById('strips-slider').value,
                                pattern: document.getElementById('width-pattern').value,
                                orientation: document.getElementById('orientation').value,
                                stripMode: document.getElementById('strip-mode').value,
                                boundaryStart: document.getElementById('pair-boundary-start-slider').value,
                                boundaryEnd: document.getElementById('pair-boundary-end-slider').value
                            },
                            stripPairs: stripPairs,
                            images: advancedImages.map(img => img.src)
                        };
        
                        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'rozpracovana_rolaz.json';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                    });
                }
                
                const controls = initCommonControls();
                const controlNames = {
                    'strips-slider': 'Změna počtu proužků',
                    'width-pattern': 'Změna rozložení',
                    'orientation': 'Změna orientace',
                    'pair-boundary-start-slider': 'Změna počáteční hranice',
                    'pair-boundary-end-slider': 'Změna koncové hranice'
                };
        
                controls.forEach(control => {
                    if(control) {
                        control.addEventListener('input', debouncedCreateAdvancedRolaz);
                        control.addEventListener('change', () => {
                            const name = controlNames[control.id] || 'Změna nastavení';
                            saveHistory(name);
                        });
                    }
                });
        
                if(stripModeSelect) {
                    stripModeSelect.addEventListener('change', (e) => {
                        saveHistory("Změna režimu proužků");
                        stripMode = e.target.value;
                        stripEditorContainer.classList.toggle('hidden', stripMode !== 'paired');
                        pairBoundaryContainer.classList.toggle('hidden', stripMode !== 'paired');
                        debouncedCreateAdvancedRolaz();
                    });
                }
        
                if(pairBoundaryStartSlider) {
                    pairBoundaryStartSlider.addEventListener('input', (e) => {
                        if(pairBoundaryStartValue) pairBoundaryStartValue.textContent = e.target.value;
                        debouncedCreateAdvancedRolaz();
                    });
                    // Change listener is already added via controls.forEach (it's returned by initCommonControls? No, initCommonControls only returns strips, pattern, orientation. We need to add manual listeners for boundaries if they are not in that list)
                }
                // Boundaries are NOT in initCommonControls return list, let's add them manually for history
                if(pairBoundaryStartSlider) pairBoundaryStartSlider.addEventListener('change', () => saveHistory("Změna počáteční hranice"));
                
                if(pairBoundaryEndSlider) {
                    pairBoundaryEndSlider.addEventListener('input', (e) => {
                        if(pairBoundaryEndValue) pairBoundaryEndValue.textContent = e.target.value;
                        debouncedCreateAdvancedRolaz();
                    });
                    pairBoundaryEndSlider.addEventListener('change', () => saveHistory("Změna koncové hranice"));
                }
        initAdvancedUploader();
        initProjectLoader();
        initStripEditor();

        function initProjectLoader() {
            const importBtn = document.getElementById('import-project-btn');
            const importInput = document.getElementById('import-project-input');

            if (importBtn) importBtn.addEventListener('click', () => importInput.click());
            if (importInput) importInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    processProjectFile(e.target.files[0]);
                }
                e.target.value = ''; // Reset input
            });
        }

        function processProjectFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const state = JSON.parse(e.target.result);
                    
                    // Reset stavu před načtením
                    saveHistory("Načtení projektu"); // Uložíme stav před načtením

                    // 1. Obnova nastavení
                    if (state.settings) {
                        const settings = state.settings;
                        const setVal = (id, val) => {
                            const el = document.getElementById(id);
                            if (el) {
                                el.value = val;
                                el.dispatchEvent(new Event('input'));
                                el.dispatchEvent(new Event('change'));
                            }
                        };
                        setVal('strips-slider', settings.strips);
                        setVal('width-pattern', settings.pattern);
                        setVal('orientation', settings.orientation);
                        setVal('pair-boundary-start-slider', settings.boundaryStart);
                        setVal('pair-boundary-end-slider', settings.boundaryEnd);

                        if (settings.stripMode) {
                            const modeSelect = document.getElementById('strip-mode');
                            if (modeSelect) {
                                modeSelect.value = settings.stripMode;
                                stripMode = settings.stripMode;
                                stripEditorContainer.classList.toggle('hidden', stripMode !== 'paired');
                                pairBoundaryContainer.classList.toggle('hidden', stripMode !== 'paired');
                            }
                        }
                    }

                    // 2. Obnova definice párů
                    if (state.stripPairs && Array.isArray(state.stripPairs)) {
                        stripPairs = state.stripPairs;
                    }

                    // 3. Obnova obrázků (a naplnění CACHE)
                    if (state.images && Array.isArray(state.images)) {
                        const imageStatus = document.getElementById('image-status');
                        if(imageStatus) imageStatus.textContent = "Načítám uložené obrázky...";

                        const imageLoadPromises = state.images.map(src => new Promise((resolve, reject) => {
                            const img = new Image();
                            img.onload = () => resolve(img);
                            img.onerror = reject;
                            img.src = src;
                        }));

                        Promise.all(imageLoadPromises).then(loadedImages => {
                            // Assign IDs and Cache
                            advancedImages = loadedImages.map((img, i) => {
                                const id = `img_${Date.now()}_${i}`;
                                img.id = id;
                                imageCache[id] = img;
                                return img;
                            });
                            
                            if (advancedImages.length > 0) {
                                const firstImage = advancedImages[0];
                                resizedImages = advancedImages.map((img, i) => i === 0 ? img : resizeImage(img, firstImage.width, firstImage.height));
                            }

                            previewsContainer.innerHTML = '';
                            advancedImages.forEach((img, i) => createPreview(img.src, i));
                            
                            if(imageStatus) imageStatus.textContent = `Projekt načten (${loadedImages.length} obrázků).`;
                            
                            updateStripPairEditorUI(); 
                            createAdvancedRolaz();
                            lastSavedState = captureState(); // Update stable state after load
                            
                        }).catch(err => {
                            console.error("Chyba při obnově obrázků:", err);
                            alert("Nepodařilo se obnovit obrázky z projektu.");
                        });
                    }

                } catch (err) {
                    console.error(err);
                    alert('Chyba při čtení souboru projektu. Soubor může být poškozen.');
                }
            };
            reader.readAsText(file);
        }

        function initAdvancedUploader() {
            const multiUploadBtn = document.getElementById('multi-upload-btn');
            const multiUploadInput = document.getElementById('multi-upload-input');
            if(multiUploadBtn) multiUploadBtn.addEventListener('click', () => multiUploadInput.click());
            if(multiUploadInput) multiUploadInput.addEventListener('change', (e) => { if (e.target.files) processFiles(e.target.files); });
        }

        function processFiles(files) {
            saveHistory("Nahrání nových obrázků"); // Uložíme stav před nahráním
            
            const imageStatus = document.getElementById('image-status');
            previewsContainer.innerHTML = '';
            const ALLOWED_COUNTS = [2, 4, 6, 8, 10];
            if (!ALLOWED_COUNTS.includes(files.length)) {
                alert(`Chyba: Musíte vybrat jeden z povolených počtů obrázků (2, 4, 6, 8, nebo 10). Vybrali jste ${files.length}.`);
                document.getElementById('multi-upload-input').value = '';
                return;
            }
            imageStatus.textContent = `Nahrávám ${files.length} obrázků...`;
            document.getElementById('export-btn').disabled = true;
            const imageLoadPromises = Array.from(files).map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = e.target.result; };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }));
            Promise.all(imageLoadPromises).then(loadedImages => {
                // Assign IDs and Cache
                advancedImages = loadedImages.map((img, i) => {
                    const id = `img_${Date.now()}_${i}`;
                    img.id = id;
                    imageCache[id] = img;
                    return img;
                });

                const firstImage = advancedImages[0];
                resizedImages = advancedImages.map((img, i) => i === 0 ? img : resizeImage(img, firstImage.width, firstImage.height));
                imageStatus.textContent = `Úspěšně nahráno ${loadedImages.length} obrázků.`;
                loadedImages.forEach((img, i) => createPreview(img.src, i));
                
                updateStripPairEditorUI();
                createAdvancedRolaz();
                lastSavedState = captureState(); // Update stable state after upload
            }).catch(err => {
                console.error("Chyba při nahrávání:", err);
                imageStatus.textContent = 'Při nahrávání došlo k chybě.';
            });
        }

        function createPreview(imageSrc, index) {
            const previewsContainer = document.getElementById('image-previews-container');
            const PREVIEW_COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];
            const wrapper = document.createElement('div');
            wrapper.className = 'relative aspect-square border rounded-lg overflow-hidden shadow-sm bg-gray-100';
            wrapper.innerHTML = `<img src="${imageSrc}" class="w-full h-full object-cover">
                               <div class="absolute top-1 right-1 w-4 h-4 rounded-full border-2 border-white shadow" style="background-color: ${PREVIEW_COLORS[index % PREVIEW_COLORS.length]}"></div>
                               <div class="absolute bottom-0 left-0 bg-black bg-opacity-60 text-white text-xs font-bold px-1.5 py-0.5 rounded-tr-lg">${index + 1}</div>`;
            previewsContainer.appendChild(wrapper);
        }

        function initStripEditor() {
            const addStripPairBtn = document.getElementById('add-strip-pair-btn');
            if(addStripPairBtn) addStripPairBtn.addEventListener('click', () => {
                saveHistory("Přidán nový typ proužku");
                stripPairs.push({ top: 0, bottom: 0 });
                updateStripPairEditorUI();
            });
            updateStripPairEditorUI();
        }

        function updateStripPairEditorUI() {
            const stripPairsEditor = document.getElementById('strip-pairs-editor');
            stripPairsEditor.innerHTML = '';
            if (stripPairs.length === 0) stripPairs.push({ top: 0, bottom: 0 });
            const optionsHTML = advancedImages.map((img, i) => `<option value="${i}">Obrázek ${i + 1}</option>`).join('');
            stripPairs.forEach((pair, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex items-center space-x-2 p-2 rounded-md bg-white border';
                wrapper.innerHTML = `<span class="font-bold text-gray-600">${index + 1}.</span>
                                   <select data-half="top" class="w-full py-1 px-2 border border-gray-300 rounded-md text-sm">${optionsHTML}</select>
                                   <select data-half="bottom" class="w-full py-1 px-2 border border-gray-300 rounded-md text-sm">${optionsHTML}</select>
                                   <button class="text-red-500 hover:text-red-700 p-1 font-mono font-bold" title="Odebrat typ proužku">&times;</button>`;
                stripPairsEditor.appendChild(wrapper);
                wrapper.querySelector('select[data-half="top"]').value = pair.top;
                wrapper.querySelector('select[data-half="bottom"]').value = pair.bottom;
                wrapper.querySelector('button').addEventListener('click', () => { 
                    saveHistory("Odebrán typ proužku");
                    stripPairs.splice(index, 1); 
                    updateStripPairEditorUI(); 
                });
            });
            
            stripPairsEditor.querySelectorAll('select').forEach(select => {
                select.addEventListener('change', () => {
                    saveHistory("Změna nastavení páru");
                    updateStripPairsState();
                });
            });
            
            if (advancedImages.length > 0) {
                 createAdvancedRolaz();
            }
        }

        function updateStripPairsState() {
            const newStripPairs = [];
            document.querySelectorAll('#strip-pairs-editor > div').forEach(wrapper => {
                newStripPairs.push({ top: parseInt(wrapper.querySelector('select[data-half="top"]').value, 10), bottom: parseInt(wrapper.querySelector('select[data-half="bottom"]').value, 10) });
            });
            stripPairs = newStripPairs;
            if (advancedImages.length > 0) {
                createAdvancedRolaz();
            }
        }

        function drawAdvanced(images, resizedImages, options) {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const firstImage = images[0];
            canvas.width = firstImage.width; canvas.height = firstImage.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const strips = parseInt(document.getElementById('strips-slider').value, 10);
            const pattern = document.getElementById('width-pattern').value;
            const orientation = document.getElementById('orientation').value;
            const boundaryStart = parseInt(document.getElementById('pair-boundary-start-slider').value, 10) / 100;
            const boundaryEnd = parseInt(document.getElementById('pair-boundary-end-slider').value, 10) / 100;
            const totalSize = (orientation === 'vertical') ? canvas.width : canvas.height;
            const stripData = calculateStripData(strips, pattern, totalSize);
            const numImages = images.length;

            for (let i = 0; i < strips; i++) {
                if (options.usePairs && options.pairs.length > 0) {
                    const pairDef = options.pairs[i % options.pairs.length];
                    const topImage = (pairDef.top > 0 && resizedImages[pairDef.top]) ? resizedImages[pairDef.top] : images[pairDef.top];
                    const bottomImage = (pairDef.bottom > 0 && resizedImages[pairDef.bottom]) ? resizedImages[pairDef.bottom] : images[pairDef.bottom];
                    if (!topImage || !bottomImage) continue;
                    const strip = stripData[i];

                    // Draw top/left part
                    ctx.save();
                    ctx.beginPath();
                    if (orientation === 'vertical') {
                        ctx.moveTo(strip.pos, 0);
                        ctx.lineTo(strip.pos + strip.size, 0);
                        ctx.lineTo(strip.pos + strip.size, canvas.height * boundaryEnd);
                        ctx.lineTo(strip.pos, canvas.height * boundaryStart);
                    } else {
                        ctx.moveTo(0, strip.pos);
                        ctx.lineTo(canvas.width * boundaryStart, strip.pos);
                        ctx.lineTo(canvas.width * boundaryEnd, strip.pos + strip.size);
                        ctx.lineTo(0, strip.pos + strip.size);
                    }
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(topImage, 0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // Draw bottom/right part
                    ctx.save();
                    ctx.beginPath();
                    if (orientation === 'vertical') {
                        ctx.moveTo(strip.pos, canvas.height * boundaryStart);
                        ctx.lineTo(strip.pos + strip.size, canvas.height * boundaryEnd);
                        ctx.lineTo(strip.pos + strip.size, canvas.height);
                        ctx.lineTo(strip.pos, canvas.height);
                    } else {
                        ctx.moveTo(canvas.width * boundaryStart, strip.pos);
                        ctx.lineTo(canvas.width * boundaryEnd, strip.pos + strip.size);
                        ctx.lineTo(canvas.width, strip.pos + strip.size);
                        ctx.lineTo(canvas.width, strip.pos);
                    }
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(bottomImage, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                } else {
                    const imageIndex = i % numImages;
                    const sourceImage = (imageIndex > 0 && resizedImages[imageIndex]) ? resizedImages[imageIndex] : images[imageIndex];
                    if (!sourceImage) continue;
                    const destStrip = stripData[i];
                    ctx.save();
                    ctx.beginPath();
                    if (orientation === 'vertical') ctx.rect(destStrip.pos, 0, destStrip.size, canvas.height);
                    else ctx.rect(0, destStrip.pos, canvas.width, destStrip.size);
                    ctx.clip();
                    if (orientation === 'vertical') {
                        ctx.drawImage(sourceImage, destStrip.pos, 0, destStrip.size, canvas.height, destStrip.pos, 0, destStrip.size, canvas.height);
                    } else {
                        ctx.drawImage(sourceImage, 0, destStrip.pos, canvas.width, destStrip.size, 0, destStrip.pos, canvas.width, destStrip.size);
                    }
                    ctx.restore();
                }
            }
            document.getElementById('export-btn').disabled = false;
        }

        function drawSchematicPreview(options) {
            const PREVIEW_COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];
            const w = schematicCanvas.width;
            const h = schematicCanvas.height;
            schematicCtx.clearRect(0, 0, w, h);

            const strips = parseInt(document.getElementById('strips-slider').value, 10);
            const pattern = document.getElementById('width-pattern').value;
            const orientation = document.getElementById('orientation').value;
            const boundaryStart = parseInt(document.getElementById('pair-boundary-start-slider').value, 10) / 100;
            const boundaryEnd = parseInt(document.getElementById('pair-boundary-end-slider').value, 10) / 100;
            const totalSize = (orientation === 'vertical') ? w : h;
            const stripData = calculateStripData(strips, pattern, totalSize);
            const numImages = advancedImages.length;

            for (let i = 0; i < strips; i++) {
                const strip = stripData[i];
                if (options.usePairs && options.pairs.length > 0) {
                    const pairDef = options.pairs[i % options.pairs.length];
                    const topColor = PREVIEW_COLORS[pairDef.top % PREVIEW_COLORS.length];
                    const bottomColor = PREVIEW_COLORS[pairDef.bottom % PREVIEW_COLORS.length];

                    // Draw top/left part
                    schematicCtx.fillStyle = topColor;
                    schematicCtx.beginPath();
                    if (orientation === 'vertical') {
                        schematicCtx.moveTo(strip.pos, 0);
                        schematicCtx.lineTo(strip.pos + strip.size, 0);
                        schematicCtx.lineTo(strip.pos + strip.size, h * boundaryEnd);
                        schematicCtx.lineTo(strip.pos, h * boundaryStart);
                    } else {
                        schematicCtx.moveTo(0, strip.pos);
                        schematicCtx.lineTo(w * boundaryStart, strip.pos);
                        schematicCtx.lineTo(w * boundaryEnd, strip.pos + strip.size);
                        schematicCtx.lineTo(0, strip.pos + strip.size);
                    }
                    schematicCtx.closePath();
                    schematicCtx.fill();

                    // Draw bottom/right part
                    schematicCtx.fillStyle = bottomColor;
                    schematicCtx.beginPath();
                    if (orientation === 'vertical') {
                        schematicCtx.moveTo(strip.pos, h * boundaryStart);
                        schematicCtx.lineTo(strip.pos + strip.size, h * boundaryEnd);
                        schematicCtx.lineTo(strip.pos + strip.size, h);
                        schematicCtx.lineTo(strip.pos, h);
                    } else {
                        schematicCtx.moveTo(w * boundaryStart, strip.pos);
                        schematicCtx.lineTo(w * boundaryEnd, strip.pos + strip.size);
                        schematicCtx.lineTo(w, strip.pos + strip.size);
                        schematicCtx.lineTo(w, strip.pos);
                    }
                    schematicCtx.closePath();
                    schematicCtx.fill();
                } else {
                    const imageIndex = i % numImages;
                    schematicCtx.fillStyle = PREVIEW_COLORS[imageIndex % PREVIEW_COLORS.length];
                    if (orientation === 'vertical') {
                        schematicCtx.fillRect(strip.pos, 0, strip.size, h);
                    } else {
                        schematicCtx.fillRect(0, strip.pos, w, h);
                    }
                }
            }
        }
    }
});