const express = require('express');
const cors = require('cors');
const tf = require('@tensorflow/tfjs-node');
const Jimp = require('jimp');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración de multer para manejar archivos
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Variables globales
let model;
let isModelLoaded = false;
const classNames = ['Benigno', 'Maligno'];

// Función para cargar el modelo
async function loadModel() {
    try {
        console.log('Cargando modelo TensorFlow...');
        
        // Cargar el modelo desde los archivos locales
        const modelPath = path.join(__dirname, 'model.json');
        model = await tf.loadGraphModel(`file://${modelPath}`);
        
        isModelLoaded = true;
        console.log('✅ Modelo cargado exitosamente!');
        
        // Mostrar información del modelo
        console.log('Información del modelo:');
        console.log('- Inputs:', model.inputs.map(input => ({
            name: input.name,
            shape: input.shape
        })));
        console.log('- Outputs:', model.outputs.map(output => ({
            name: output.name,
            shape: output.shape
        })));
        
    } catch (error) {
        console.error('❌ Error al cargar el modelo:', error);
        isModelLoaded = false;
    }
}

// Función para preprocesar la imagen
async function preprocessImage(imageBuffer) {
    try {
        // Usar Jimp para procesar la imagen
        const image = await Jimp.read(imageBuffer);
        
        // Redimensionar a 224x224 y convertir a RGB
        image.resize(224, 224);
        
        // Extraer datos de píxeles
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const data = image.bitmap.data; // RGBA data
        
        // Convertir RGBA a RGB (eliminar canal alpha)
        const rgbData = new Float32Array(width * height * 3);
        let rgbIndex = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            rgbData[rgbIndex++] = data[i] / 255.0;     // R
            rgbData[rgbIndex++] = data[i + 1] / 255.0; // G
            rgbData[rgbIndex++] = data[i + 2] / 255.0; // B
            // Ignorar canal alpha (data[i + 3])
        }

        // Crear tensor con los datos normalizados
        const imageTensor = tf.tensor3d(rgbData, [224, 224, 3])
            .expandDims(0); // Añadir dimensión de batch

        return imageTensor;
    } catch (error) {
        console.error('Error al preprocesar imagen:', error);
        throw new Error('Error al procesar la imagen');
    }
}

// Función para hacer predicción
async function makePrediction(imageTensor) {
    try {
        if (!isModelLoaded) {
            throw new Error('El modelo no está cargado');
        }

        // Hacer predicción
        const prediction = await model.predict(imageTensor);
        const predictionData = await prediction.data();
        
        // Limpiar tensores
        imageTensor.dispose();
        prediction.dispose();

        // Interpretar resultados
        const confidence = predictionData[0]; // Asumiendo que el modelo devuelve un valor entre 0 y 1
        const isMalignant = confidence > 0.5;
        const diagnosis = isMalignant ? 'Maligno' : 'Benigno';
        const finalConfidence = isMalignant ? confidence : 1 - confidence;

        return {
            diagnosis,
            confidence: Math.round(finalConfidence * 100 * 100) / 100, // Redondear a 2 decimales
            rawPrediction: confidence
        };

    } catch (error) {
        console.error('Error en predicción:', error);
        throw new Error('Error al realizar la predicción');
    }
}

// Ruta para verificar el estado del servicio
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        modelLoaded: isModelLoaded,
        timestamp: new Date().toISOString()
    });
});

// Ruta para verificar el estado del modelo
app.get('/model/status', (req, res) => {
    res.json({
        loaded: isModelLoaded,
        classNames: classNames,
        timestamp: new Date().toISOString()
    });
});

// Ruta principal para diagnóstico - recibe imagen en base64
app.post('/predict', async (req, res) => {
    try {
        if (!isModelLoaded) {
            return res.status(503).json({
                error: 'Modelo no disponible',
                message: 'El modelo aún se está cargando o falló al cargar'
            });
        }

        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                error: 'Imagen requerida',
                message: 'Debe proporcionar una imagen en formato base64'
            });
        }

        // Decodificar imagen base64
        let imageBuffer;
        try {
            // Remover el prefijo data:image/...;base64, si existe
            const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({
                error: 'Formato de imagen inválido',
                message: 'La imagen debe estar en formato base64 válido'
            });
        }

        // Preprocesar imagen
        const imageTensor = await preprocessImage(imageBuffer);

        // Hacer predicción
        const result = await makePrediction(imageTensor);

        // Responder con el resultado
        res.json({
            success: true,
            diagnosis: result.diagnosis,
            confidence: result.confidence,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en /predict:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Ruta alternativa para recibir archivo multipart
app.post('/predict/upload', upload.single('image'), async (req, res) => {
    try {
        if (!isModelLoaded) {
            return res.status(503).json({
                error: 'Modelo no disponible',
                message: 'El modelo aún se está cargando o falló al cargar'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Archivo requerido',
                message: 'Debe proporcionar un archivo de imagen'
            });
        }

        // Preprocesar imagen
        const imageTensor = await preprocessImage(req.file.buffer);

        // Hacer predicción
        const result = await makePrediction(imageTensor);

        // Responder con el resultado
        res.json({
            success: true,
            diagnosis: result.diagnosis,
            confidence: result.confidence,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en /predict/upload:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        message: 'La ruta solicitada no existe'
    });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error inesperado'
    });
});

// Inicializar servidor
async function startServer() {
    try {
        // Cargar modelo primero
        await loadModel();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📊 Estado del modelo: ${isModelLoaded ? 'Cargado' : 'Error'}`);
            console.log(`🔗 Endpoints disponibles:`);
            console.log(`   GET  /health - Estado del servicio`);
            console.log(`   GET  /model/status - Estado del modelo`);
            console.log(`   POST /predict - Predicción con imagen base64`);
            console.log(`   POST /predict/upload - Predicción con archivo`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    if (model) {
        model.dispose();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    if (model) {
        model.dispose();
    }
    process.exit(0);
});

// Iniciar aplicación
startServer();