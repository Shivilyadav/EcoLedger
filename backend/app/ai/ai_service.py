import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np
from PIL import Image
import io

class PlasticAI:
    def __init__(self):
        self.classes = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP']
        # In a real app, you would load a pre-trained model
        # For this prototype, we'll initialize a simple CNN with random weights or a mock inference
        self.model = self._build_model()

    def _build_model(self):
        model = models.Sequential([
            layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
            layers.MaxPooling2D((2, 2)),
            layers.Conv2D(64, (3, 3), activation='relu'),
            layers.MaxPooling2D((2, 2)),
            layers.Conv2D(64, (3, 3), activation='relu'),
            layers.Flatten(),
            layers.Dense(64, activation='relu'),
            layers.Dense(len(self.classes), activation='softmax')
        ])
        model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        return model

    def verify_plastic(self, image_bytes):
        # Preprocess image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image = image.resize((128, 128))
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Mock inference for prototype if model is not trained
        # prediction = self.model.predict(img_array)
        # class_idx = np.argmax(prediction[0])
        
        # Real-world prototype: Randomly select for demo if not trained, but show logic
        class_idx = np.random.randint(0, len(self.classes))
        confidence = float(np.random.uniform(0.85, 0.99))
        fraud_score = float(np.random.uniform(0.01, 0.10))
        
        return {
            "plastic_type": self.classes[class_idx],
            "estimated_weight": f"{np.random.uniform(0.5, 5.0):.2f} kg",
            "confidence": confidence,
            "fraud_probability": fraud_score
        }

ai_engine = PlasticAI()
