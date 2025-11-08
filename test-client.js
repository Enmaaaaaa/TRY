// Ejemplo de cliente para probar el API
const fs = require('fs');
const path = require('path');

// Función para convertir imagen a base64
function imageToBase64(imagePath) {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64String = imageBuffer.toString('base64');
        const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
        console.error('Error al leer imagen:', error);
        return null;
    }
}

// Función para hacer predicción
async function makePrediction(imagePath, serverUrl = 'http://localhost:3000') {
    try {
        const base64Image = imageToBase64(imagePath);
        if (!base64Image) {
            throw new Error('No se pudo convertir la imagen');
        }

        const response = await fetch(`${serverUrl}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Predicción exitosa:');
            console.log(`   Diagnóstico: ${result.diagnosis}`);
            console.log(`   Confianza: ${result.confidence}%`);
            console.log(`   Timestamp: ${result.timestamp}`);
        } else {
            console.error('❌ Error en predicción:', result);
        }

        return result;
    } catch (error) {
        console.error('Error al hacer predicción:', error);
        return null;
    }
}

// Función para verificar estado del servidor
async function checkServerStatus(serverUrl = 'http://localhost:3000') {
    try {
        const response = await fetch(`${serverUrl}/health`);
        const status = await response.json();
        
        console.log('🔍 Estado del servidor:');
        console.log(`   Status: ${status.status}`);
        console.log(`   Modelo cargado: ${status.modelLoaded}`);
        console.log(`   Timestamp: ${status.timestamp}`);
        
        return status;
    } catch (error) {
        console.error('Error al verificar estado:', error);
        return null;
    }
}

// Ejemplo de uso
async function ejemplo() {
    console.log('🧪 Probando API de diagnóstico...\n');
    
    // Verificar estado del servidor
    await checkServerStatus();
    console.log();
    
    // Hacer predicción (reemplaza con la ruta de tu imagen)
    // await makePrediction('./test-image.jpg');
    
    console.log('\n📝 Para usar este cliente:');
    console.log('1. Asegúrate de que el servidor esté corriendo (npm start)');
    console.log('2. Coloca una imagen de prueba en el directorio');
    console.log('3. Llama a makePrediction("./tu-imagen.jpg")');
}

// Ejecutar ejemplo si se corre directamente
if (require.main === module) {
    ejemplo();
}

module.exports = {
    makePrediction,
    checkServerStatus,
    imageToBase64
};