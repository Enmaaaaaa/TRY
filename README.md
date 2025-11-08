# API de Diagnóstico Médico

API REST para diagnóstico médico utilizando TensorFlow.js que clasifica imágenes como benignas o malignas.

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ 
- npm o yarn

### Instalación
```bash
npm install
```

### Iniciar servidor
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servidor se ejecutará en `http://localhost:3000` por defecto.

## 📡 Endpoints

### GET /health
Verifica el estado del servicio.

**Respuesta:**
```json
{
  "status": "ok",
  "modelLoaded": true,
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

### GET /model/status
Verifica el estado específico del modelo.

**Respuesta:**
```json
{
  "loaded": true,
  "classNames": ["Benigno", "Maligno"],
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

### POST /predict
Realiza predicción con imagen en base64.

**Cuerpo de la petición:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "diagnosis": "Benigno",
  "confidence": 87.5,
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

**Respuesta de error:**
```json
{
  "error": "Imagen requerida",
  "message": "Debe proporcionar una imagen en formato base64"
}
```

### POST /predict/upload
Realiza predicción con archivo multipart.

**Parámetros:**
- `image`: Archivo de imagen (form-data)

**Respuesta:** Igual que `/predict`

## 🧪 Pruebas

### Con curl (base64)
```bash
# Primero convertir imagen a base64
base64 -i imagen.jpg > imagen_base64.txt

# Hacer petición
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,'$(cat imagen_base64.txt)'"}'
```

### Con curl (archivo)
```bash
curl -X POST http://localhost:3000/predict/upload \
  -F "image=@./imagen.jpg"
```

### Con el cliente de prueba
```bash
node test-client.js
```

## 📊 Códigos de Estado

- `200`: Predicción exitosa
- `400`: Error en la petición (imagen faltante/inválida)
- `503`: Modelo no disponible
- `500`: Error interno del servidor

## 🔧 Configuración

### Variables de entorno
- `PORT`: Puerto del servidor (default: 3000)

### Límites
- Tamaño máximo de imagen: 10MB
- Formato de imagen: JPG, PNG
- Resolución procesada: 224x224 píxeles

## 📁 Estructura de archivos

```
TRY/
├── server.js           # Servidor principal
├── test-client.js      # Cliente de prueba
├── package.json        # Dependencias
├── model.json          # Modelo TensorFlow
├── group1-shard*.bin   # Pesos del modelo
└── README.md          # Esta documentación
```

## 🛠️ Desarrollo

### Dependencias principales
- `express`: Framework web
- `@tensorflow/tfjs-node`: TensorFlow para Node.js
- `sharp`: Procesamiento de imágenes
- `multer`: Manejo de archivos multipart
- `cors`: Cross-origin resource sharing

### Flujo de procesamiento
1. Recepción de imagen (base64 o archivo)
2. Redimensionamiento a 224x224 píxeles
3. Normalización de valores (0-255 → 0-1)
4. Predicción con modelo TensorFlow
5. Interpretación de resultados
6. Respuesta JSON

## 🚨 Manejo de errores

El API maneja los siguientes tipos de errores:
- Imagen faltante o formato inválido
- Error en procesamiento de imagen
- Modelo no cargado
- Errores de predicción
- Errores internos del servidor

## 📝 Ejemplo de integración

```javascript
// Ejemplo en JavaScript
async function diagnosticar(imagenBase64) {
  try {
    const response = await fetch('http://localhost:3000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imagenBase64
      })
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      console.log(`Diagnóstico: ${resultado.diagnosis}`);
      console.log(`Confianza: ${resultado.confidence}%`);
    } else {
      console.error('Error:', resultado.error);
    }
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}
```