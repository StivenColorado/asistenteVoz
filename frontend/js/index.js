class KioskAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.step = 0;
        this.userData = {
            name: '',
            id: '',
            fullData: null,
            updateCase: ''
        };
        this.isListening = false;
        this.isProcessing = false;
        this.setupSpeechRecognition();
        this.setupUI();
        this.setupAudioVisualization();
    }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Tu navegador no soporta reconocimiento de voz');
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'es-ES';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateStatus('Escuchando...', 'listening');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateStatus('Procesando...', '');

            if (this.autoRestart && !this.isProcessing) {
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
        };

        this.recognition.onresult = async (event) => {
            const userInput = event.results[0][0].transcript;
            this.isProcessing = true;

            try {
                await this.handleUserInput(userInput);
            } finally {
                this.isProcessing = false;
                if (this.autoRestart) {
                    setTimeout(() => {
                        this.startListening();
                    }, 1000);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Error de reconocimiento:', event.error);
            this.isListening = false;
            if (event.error === 'not-allowed') {
                alert('Acceso al micrófono denegado. Verifica los permisos.');
            } else if (this.autoRestart) {
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
        };
    }

    async generateCertificate(cedula) {
        try {
            const response = await fetch('http://localhost/asistenteVoz/backend/generar_certificado.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cedula: cedula })
            });

            // Since the PHP script forces a download, we'll check if the response is successful
            if (response.ok) {
                return {
                    success: true,
                    message: 'Certificado generado exitosamente.'
                };
            } else {
                const errorData = await response.json();
                return {
                    success: false,
                    message: errorData.error || 'Error al generar el certificado.'
                };
            }
        } catch (error) {
            console.error('Error al generar certificado:', error);
            return {
                success: false,
                message: 'Error al conectar con el servidor.'
            };
        }
    }

    async consultarUsuario(cedula) {
        let cleanedCedula = cedula.trim();

        console.log(`cedula recibida ${cleanedCedula}`);
        try {
            const response = await fetch('http://localhost/asistenteVoz/backend/consultar_usuario.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cedula: cleanedCedula })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al consultar usuario:', error);
            return null;
        }
    }

    async actualizarDato(caso, dato, cedula) {
        try {
            const response = await fetch('http://localhost/asistenteVoz/backend/actualizar.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    caso: caso,
                    dato: dato,
                    cedula: cedula
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al actualizar dato:', error);
            return null;
        }
    }

    setupUI() {
        document.getElementById('startBtn').onclick = () => this.start();
        document.getElementById('stopBtn').onclick = () => this.stop();
    }

    setupAudioVisualization() {
        const barsContainer = document.getElementById('audio-bars');
        for (let i = 0; i < 50; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            barsContainer.appendChild(bar);
        }

        this.visualizationInterval = setInterval(() => {
            if (this.isListening) {
                const bars = barsContainer.getElementsByClassName('audio-bar');
                for (let bar of bars) {
                    const height = Math.random() * 40 + 10;
                    bar.style.height = `${height}px`;
                }
            } else {
                const bars = barsContainer.getElementsByClassName('audio-bar');
                for (let bar of bars) {
                    bar.style.height = '2px';
                }
            }
        }, 100);
    }

    start() {
        this.autoRestart = true;
        this.startListening();
        this.welcomeMessage();
    }

    stop() {
        this.autoRestart = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        this.updateStatus('Asistente detenido', '');
        this.step = 0;
        this.userData = {
            name: '',
            id: '',
            fullData: null,
            updateCase: ''
        };
    }

    startListening() {
        if (this.recognition && !this.isListening && !this.isProcessing) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error al iniciar el reconocimiento:', error);
                setTimeout(() => this.startListening(), 1000);
            }
        }
    }

    updateStatus(message, className = '') {
        const status = document.getElementById('status');
        status.textContent = message;

        // Agregar estilos predeterminados
        status.className = `w-full text-center py-2 px-4 text-white font-mono text-2xl font-bold ${className}`;
    }

    appendMessage(message, sender) {
        const chat = document.getElementById('chat');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender;
        messageDiv.classList.add("text-white", "text-2xl");

        // Crea un efecto de escritura
        messageDiv.textContent = ''; // Comienza vacío
        chat.appendChild(messageDiv);

        let index = 0;
        const typingInterval = setInterval(() => {
            if (index < message.length) {
                messageDiv.textContent += message.charAt(index);
                index++;
            } else {
                clearInterval(typingInterval); // Detiene el intervalo cuando termina
                chat.scrollTop = chat.scrollHeight; // Desplaza hacia abajo
            }
        }, 50); // Cambia este valor para ajustar la velocidad de escritura
    }

    async speak(text) {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.onend = resolve;
            this.synthesis.speak(utterance);
        });
    }

    async handleUserInput(input) {
        const normalizedInput = input.toLowerCase().trim(); // Normaliza la entrada
        this.appendMessage(normalizedInput, 'user'); // Guarda la entrada normalizada

        if (this.isFarewell(normalizedInput)) {
            const response = await this.handleFarewell();
            this.appendMessage(response, 'bot');
            await this.speak(response);
            return;
        }

        let response = await this.processInput(normalizedInput); // Procesa la entrada normalizada
        this.appendMessage(response, 'bot');
        await this.speak(response);
    }

    async processInput(input) {
        if (this.isGreeting(input)) {
            return this.handleGreeting();
        }

        switch (this.step) {
            case 0:
                this.step++;
                return "Por favor, dime tu número de cédula.";

            case 1:
                const cleanedInput = this.cleanID(input);
                if (this.validateID(cleanedInput)) {
                    console.log(`input recibido al recibir cedula ${cleanedInput}`);

                    const userData = await this.consultarUsuario(cleanedInput);
                    console.log(userData);

                    if (userData) {
                        this.userData.fullData = userData;
                        this.userData.id = userData.numero_documento;
                        this.step = 3;
                        return `Bienvenido ${userData.nombre_completo}, ¿qué deseas hacer?\n1. Actualizar mis datos\n2. Generar certificados`;
                    }
                    return "No se encontró el usuario. Por favor, verifica tu número de cédula.";
                }
                return "Por favor, proporciona un número de cédula válido (entre 8 y 10 dígitos).";

            case 3:
                if (input.includes('actualizar') || input.includes('1')) {
                    this.step = 4;
                    return "¿Qué dato deseas actualizar?\n- Nombre\n- Teléfono\n- Correo\n- Dirección\n- Estado civil\n- Género\n- Tipo de cuenta\n- Número de cuenta";
                }
                if (input.includes('certificado') || input.includes('2')) {
                    console.log(this.userData);
                    console.log(this.userData.numero_documento);
                    const result = await this.generateCertificate(this.userData.numero_documento);
                    if (result.success) {
                        return `${result.message}\nTu certificado se está descargando automáticamente.\n¿Necesitas algo más?\n1. Actualizar datos\n2. Generar otro certificado`;
                    } else {
                        return `${result.message}\n¿Qué deseas hacer?\n1. Actualizar datos\n2. Intentar generar el certificado nuevamente`;
                    }
                }
                return "No entendí tu selección. Por favor, di '1' para actualizar datos o '2' para generar certificados.";

            case 4:
                let updateCase = '';
                if (input.includes('nombre')) updateCase = 'nombre';
                else if (input.includes('telefono') || input.includes('teléfono')) updateCase = 'telefono';
                else if (input.includes('correo')) updateCase = 'correo';
                else if (input.includes('direccion') || input.includes('dirección')) updateCase = 'direccion';
                else if (input.includes('estado civil') || input.includes('estado_civil')) updateCase = 'estado_civil';
                else if (input.includes('género')) updateCase = 'genero';
                else if (input.includes('tipo de cuenta')) updateCase = 'tipo_cuenta';
                else if (input.includes('número de cuenta')) updateCase = 'numero_cuenta';

                if (updateCase) {
                    this.userData.updateCase = updateCase;
                    this.step = 5;
                    return `Por favor, dime el nuevo ${updateCase}:`;
                }
                return "No entendí qué dato deseas actualizar. Por favor, especifica: nombre, teléfono, correo, dirección, estado civil, género, tipo de cuenta o número de cuenta.";

            case 5:
                const resultado = await this.actualizarDato(
                    this.userData.updateCase,
                    input,
                    this.userData.id
                );
                this.step = 3;

                if (resultado && resultado.mensaje.includes("correctamente")) {
                    return `Dato actualizado correctamente. ¿Qué más deseas hacer?\n1. Actualizar otros datos\n2. Generar certificados`;
                }
                return "Hubo un error al actualizar el dato. ¿Qué deseas hacer?\n1. Intentar de nuevo\n2. Generar certificados";

            default:
                return "No entendí tu solicitud. ¿Podrías repetirla?";
        }
    }

    isGreeting(input) {
        const greetings = ['hola', 'buenos días', 'buenas tardes', 'buenas noches'];
        return greetings.some(greeting => input.includes(greeting));
    }

    isFarewell(input) {
        const farewells = ['adiós', 'chao', 'hasta luego', 'nos vemos', 'gracias'];
        return farewells.some(farewell => input.includes(farewell));
    }

    handleGreeting() {
        if (this.userData.fullData) {
            return `¡Hola de nuevo ${this.userData.fullData.nombre_completo}! ¿En qué puedo ayudarte?`;
        }
        return "¡Hola! Soy tu asistente virtual. Por favor, dime tu número de cédula.";
    }

    async handleFarewell() {
        const name = this.userData.fullData ? `, ${this.userData.fullData.nombre_completo}` : '';
        setTimeout(() => this.stop(), 2000);
        return `¡Hasta luego${name}! Que tengas un excelente día.`;
    }

    cleanID(id) {
        // Elimina espacios, puntos, comas y cualquier otro carácter que no sea número
        return id.replace(/[^\d]/g, '');
    }

    validateID(id) {
        // Primero limpiamos la cédula
        const cleanedID = this.cleanID(id);
        // Verificamos que tenga entre 8 y 10 dígitos
        return /^\d{8,12}$/.test(cleanedID);
    }

    welcomeMessage() {
        const initialMessage = "¡Bienvenido al asistente virtual! ¿En qué puedo ayudarte hoy?";
        this.appendMessage(initialMessage, 'bot');
        this.speak(initialMessage);
    }
}

window.onload = () => {
    window.kioskAssistant = new KioskAssistant();
};
