let model;
let isModelLoaded = false;

const l2Regularizer = (lambda) => {
    return tf.regularizers.l2(lambda);
};

// Nombres de las clases para las predicciones del modelo
const classNames = ['Benigno', 'Maligno'];

// Cargar el modelo de TensorFlow
async function loadModel() {
    try {
        updateStatus('Cargando Modelo...', 'loading');
        
        // Para propósitos de demostración, simularemos la carga del modelo
        // En una implementación real, cargarías tu modelo actual:
        model = await tf.loadGraphModel('model.json');
        
        // Simular tiempo de carga
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Crear un modelo ficticio para demostración
        //model = await createDummyModel();
        
        isModelLoaded = true;
        updateStatus('Modelo Listo', 'ready');
        enableButtons();
        console.log("¡Modelo cargado exitosamente!");
    } catch (error) {
        console.error("Error al cargar el modelo:", error);
        updateStatus('Error al Cargar Modelo', 'error');
        document.getElementById('predictionResult').textContent = 'Error al cargar el modelo. Por favor, recarga la página.';
    }
}

function updateStatus(message, type) {
    const statusEl = document.getElementById('modelStatus');
    statusEl.className = `status-indicator status-${type}`;
    statusEl.innerHTML = type === 'loading' ? 
        `<span class="loading"></span> ${message}` : 
        message;
    
    if (type === 'ready') {
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.style.display = 'none', 300);
        }, 2000);
    }
}

function enableButtons() {
    document.getElementById('uploadBtn').disabled = false;
}

function triggerFileInput() {
    document.getElementById('imageInput').click();
}

// Manejar subida de imagen
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = function() {
        displayImage(img);
        processImage(img);
    }
    img.src = URL.createObjectURL(file);
}

function displayImage(img) {
    const previewImg = document.getElementById('previewImage');
    const placeholder = document.getElementById('placeholderText');
    const container = document.getElementById('imageContainer');

    placeholder.classList.add('hidden');
    previewImg.src = img.src;
    previewImg.classList.remove('hidden');
    container.classList.add('has-image');
}

// Procesar la imagen y hacer una predicción
async function processImage(image) {
    if (!isModelLoaded) {
        document.getElementById('predictionResult').textContent = 'El modelo aún se está cargando. Por favor, espera...';
        return;
    }

    try {
        // Mostrar estado de carga
        document.getElementById('predictionResult').innerHTML = 
            '<span class="loading"></span> Analizando imagen...';

        // Preprocesar la imagen
        const imgTensor = tf.browser.fromPixels(image)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims(0);

        // Hacer predicción
        const prediction = await model.predict(imgTensor);
        const predictionData = await prediction.data();
        
        // Limpiar tensores
        imgTensor.dispose();
        prediction.dispose();

        // Mostrar resultados
        displayPrediction(predictionData[1]);

    } catch (error) {
        console.error("Error al hacer la predicción:", error);
        document.getElementById('predictionResult').textContent = 
            'Error al analizar la imagen. Por favor, intenta de nuevo.';
    }
}

// Mostrar el resultado de la predicción
function displayPrediction(confidence) {
    const resultEl = document.getElementById('predictionResult');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceFill = document.getElementById('confidenceFill');

    // Para clasificación binaria: >0.5 = Maligno, <=0.5 = Benigno
    const isMalignant = confidence > 0.5;
    const displayConfidence = isMalignant ? confidence : 1 - confidence;
    const prediction = isMalignant ? 'Maligno' : 'Benigno';
    
    // Actualizar texto del resultado y estilo
    resultEl.className = `prediction-result result-${prediction.toLowerCase()}`;
    resultEl.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 10px;">
            ${prediction === 'Maligno' ? '⚠️' : '✅'} ${prediction}
        </div>
        <div style="font-size: 1rem; opacity: 0.8;">
            Confianza: ${(displayConfidence * 100).toFixed(1)}%
        </div>
    `;

    // Actualizar barra de confianza
    confidenceBar.classList.remove('hidden');
    confidenceFill.style.width = `${displayConfidence * 100}%`;
    confidenceFill.style.background = isMalignant ? 
        'linear-gradient(45deg, #ff6b6b, #ee5a52)' : 
        'linear-gradient(45deg, #a3d977, #68d391)';
}

// Inicializar la aplicación
window.onload = function() {
    loadModel();
};