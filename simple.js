
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

    const debouncedCreateClassicRolaz = debounce(createClassicRolaz, 200);

    // --- Inicializace ---
    let classicImages = { img1: null, img2: null };
    const controls = initCommonControls();
    controls.forEach(control => control.addEventListener('input', debouncedCreateClassicRolaz));

    handleImageUpload(document.getElementById('image-upload-1'), (img) => { classicImages.img1 = img; createClassicRolaz(); });
    handleImageUpload(document.getElementById('image-upload-2'), (img) => { classicImages.img2 = img; createClassicRolaz(); });

    // --- Hlavní funkce pro vytvoření roláže ---
    function createClassicRolaz() {
        if (!classicImages.img1 || !classicImages.img2) return;
        
        const images = [classicImages.img1, classicImages.img2];
        // Změníme velikost druhého obrázku, aby odpovídala prvnímu
        const resizedSecondImage = resizeImage(images[1], images[0].width, images[0].height);
        
        drawClassic(images[0], resizedSecondImage);
    }

    // --- Funkce pro vykreslení na plátno ---
    function drawClassic(image1, image2) {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image1.width;
        canvas.height = image1.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const strips = parseInt(document.getElementById('strips-slider').value, 10);
        const pattern = document.getElementById('width-pattern').value;
        const orientation = document.getElementById('orientation').value;
        
        const totalSize = (orientation === 'vertical') ? canvas.width : canvas.height;
        const stripData = calculateStripData(strips, pattern, totalSize);

        for (let i = 0; i < strips; i++) {
            // Střídáme obrázky: sudé proužky z obr. 1, liché z obr. 2
            const isSecondImage = i % 2 !== 0;
            const sourceImage = isSecondImage ? image2 : image1;
            
            // Pro druhý obrázek bereme proužky od konce (přeházení)
            const sourceStripeIndex = isSecondImage ? (strips - 1 - i) : i;
            
            const sourceStrip = stripData[sourceStripeIndex];
            const destStrip = stripData[i];

            ctx.save();
            ctx.beginPath();

            // Vytvoříme ořezovou masku pro aktuální proužek
            if (orientation === 'vertical') {
                ctx.rect(destStrip.pos, 0, destStrip.size, canvas.height);
            } else {
                ctx.rect(0, destStrip.pos, canvas.width, destStrip.size);
            }
            ctx.clip();

            // Vykreslíme část zdrojového obrázku do ořezové masky
            if (orientation === 'vertical') {
                ctx.drawImage(sourceImage, 
                    sourceStrip.pos, 0, sourceStrip.size, canvas.height, 
                    destStrip.pos, 0, destStrip.size, canvas.height);
            } else {
                // OPRAVA: Správné parametry pro horizontální vykreslení
                ctx.drawImage(sourceImage, 
                    0, sourceStrip.pos, canvas.width, sourceStrip.size, 
                    0, destStrip.pos, canvas.width, destStrip.size);
            }
            
            ctx.restore();
        }
        document.getElementById('export-btn').disabled = false;
    }

    // =================================================================
    // --- SPOLEČNÉ POMOCNÉ FUNKCE ---
    // =================================================================
    function initCommonControls() {
        const stripsSlider = document.getElementById('strips-slider');
        const stripsValue = document.getElementById('strips-value');
        const widthPatternSelect = document.getElementById('width-pattern');
        const orientationSelect = document.getElementById('orientation');
        const exportBtn = document.getElementById('export-btn');
        
        if(stripsSlider) stripsSlider.addEventListener('input', (e) => { stripsValue.textContent = e.target.value; });
        if(exportBtn) exportBtn.addEventListener('click', exportImage);
        
        return [stripsSlider, widthPatternSelect, orientationSelect].filter(el => el !== null);
    }

    function handleImageUpload(inputElement, callback) {
        if (!inputElement) return;
        inputElement.addEventListener('change', (e) => {
            const file = e.target.files[0]; // OPRAVA: Chybějící definice 'file'
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => callback(img);
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function resizeImage(image, width, height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        
        // Vrátíme nový Image objekt, aby se správně načetl
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
        // Zajistíme, aby poslední proužek vyplnil zbytek
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
});
