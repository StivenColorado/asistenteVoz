const url = "http://localhost/";
class KioskAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.selectedVoice = null;
        this.step = 0;
        this.userData = {
            name: '',
            id: '',
            fullData: null,
            updateCase: ''
        };
        this.isListening = false;
        this.isProcessing = false;

        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }

        this.setupSpeechRecognition();
        this.setupUI();
        this.setupAudioVisualization();
    }

    loadVoices() {
        const voices = this.synthesis.getVoices();
        console.log('Voces disponibles:', voices.map(v => `${v.name} (${v.lang})`));
        this.selectedVoice = voices.find(voice => voice.lang.includes('es')) || voices[0];
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
            const response = await fetch(`${url}/asistenteVoz/backend/generar_certificado.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cedula: cedula })
            });

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
        let cleanedCedula = this.cleanID(cedula);
        console.log(`Cedula limpia para enviar: ${cleanedCedula}`);
        try {
            const response = await fetch(`${url}/asistenteVoz/backend/consultar_usuario.php`, {
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
            const response = await fetch(`${url}/asistenteVoz/backend/actualizar.php`, {
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
        this.changeVoice("Google español");
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
        status.className = `w-full text-center py-2 px-4 text-white font-mono text-2xl font-bold ${className}`;
    }

    appendMessage(message, sender, action = '') {
        const chat = document.getElementById('chat');
        const messageDiv = document.createElement('div');
    
        // Nuevas clases de Tailwind para los mensajes
        const baseClasses = "w-full max-w-[80%] rounded-lg p-4 mb-4 shadow-lg text-lg";
    
        if (sender === 'user') {
            messageDiv.className = `${baseClasses} ml-auto bg-green-600 text-white`;
        } else {
            messageDiv.className = `${baseClasses} mr-auto bg-gray-700 text-white`;
        }
    
        if (action === 'consultar_datos' && message.includes("Nombre Completo:")) {
            const listContainer = document.createElement('div');
            listContainer.className = "bg-gray-800 rounded-lg p-6 space-y-3";
    
            const lines = message.trim().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const [label, value] = line.split(':').map(str => str.trim());
    
                    const itemDiv = document.createElement('div');
                    itemDiv.className = "flex flex-col sm:flex-row sm:justify-between border-b border-gray-700 pb-2";
    
                    const labelSpan = document.createElement('span');
                    labelSpan.className = "font-bold text-blue-400";
                    labelSpan.textContent = label;
    
                    const valueSpan = document.createElement('span');
                    valueSpan.className = "text-white";
                    valueSpan.textContent = value;
    
                    itemDiv.appendChild(labelSpan);
                    itemDiv.appendChild(valueSpan);
                    listContainer.appendChild(itemDiv);
                }
            });
            messageDiv.appendChild(listContainer);
        } else {
            // Creación del mensaje estándar con efecto de escritura
            messageDiv.textContent = '';
            let index = 0;
            const typingInterval = setInterval(() => {
                if (index < message.length) {
                    messageDiv.textContent += message.charAt(index);
                    index++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 50);
        }
    
        chat.appendChild(messageDiv);
        chat.scrollTop = chat.scrollHeight;
    }
    


    changeVoice(voiceName) {
        const voices = this.synthesis.getVoices();
        const newVoice = voices.find(voice => voice.name === voiceName);
        if (newVoice) {
            this.selectedVoice = newVoice;
            console.log(`Voz cambiada a: ${newVoice.name} (${newVoice.lang})`);
        } else {
            console.log(`Voz no encontrada: ${voiceName}`);
        }
    }

    async speak(text) {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'es-ES';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onend = resolve;
            this.synthesis.cancel();
            this.synthesis.speak(utterance);
        });
    }

    async handleUserInput(input) {
        const normalizedInput = this.cleanInput(input.toLowerCase().trim()); // Limpia y normaliza la entrada
        this.appendMessage(normalizedInput, 'user');

        if (this.isFarewell(normalizedInput)) {
            const response = await this.handleFarewell();
            this.appendMessage(response, 'bot');
            await this.speak(response);
            return;
        }

        let response = await this.processInput(normalizedInput);

        // Si el resultado es un objeto (que contiene display y speak)
        if (typeof response === 'object') {
            // Si se trata de consultar datos, pasamos 'consultar_datos' como acción
            if (response.speak === "Estos son tus datos:") {
                this.appendMessage(response.display, 'bot', 'consultar_datos');
            } else {
                this.appendMessage(response.display, 'bot');
            }
            await this.speak(response.speak);
        } else {
            // Si no es un objeto, simplemente mostramos el mensaje normal
            this.appendMessage(response, 'bot');
            await this.speak(response);
        }
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
                        return `Bienvenido ${userData.nombre_completo}, ¿qué deseas hacer?\n1. Actualizar mis datos\n2. Generar certificados\n3. Consultar mis datos`;
                    }
                    return "No se encontró el usuario. Por favor, verifica tu número de cédula.";
                }
                return "Por favor, proporciona un número de cédula válido (entre 8 y 10 dígitos).";

            case 3:
                if (input.includes('actualizar') || input.includes('1')) {
                    this.step = 4;
                    return "¿Qué dato deseas actualizar?\n- Nombre\n- Teléfono\n- Dirección\n- Estado civil\n- Género\n- 4. Finalizar proceso";
                }
                if (input.includes('certificado') || input.includes('2')) {
                    console.log(this.userData);
                    console.log(this.userData.id);
                    const result = await this.generateCertificate(this.userData.id);
                    if (result.success) {
                        return `${result.message}\nTu certificado se está descargando automáticamente.\n¿Necesitas algo más?\n1. Actualizar datos\n2. Generar otro certificado\n3. Consultar mis datos`;
                    } else {
                        return `${result.message}\n¿Qué deseas hacer?\n1. Actualizar datos\n2. Intentar generar el certificado nuevamente\n3. Consultar mis datos`;
                    }
                }
                if (input.includes('consultar') || input.includes('3')) {
                    const userData = this.userData.fullData;
                    const datosFormateados = `
                    Nombre Completo: ${userData.nombre_completo}
                    Número de Documento: ${userData.numero_documento}
                    Fecha de Nacimiento: ${userData.fecha_nacimiento}
                    Dirección: ${userData.direccion}
                    Número de Teléfono: ${userData.numero_telefono}
                    Estado Civil: ${userData.estado_civil}
                    Género: ${userData.genero}
                    Correo Electrónico: ${userData.correo_electronico}
                    Departamento: ${userData.departamento}
                    Ciudad: ${userData.ciudad}`;

                    const menuOpciones = `¿Qué más deseas hacer?\n1. Actualizar datos\n2. Generar certificados\n3. Consultar mis datos nuevamente`;

                    this.appendMessage(menuOpciones, 'bot', 'consultar_datos');
                    setTimeout(() => {
                        this.speak(menuOpciones);
                    }, 5000);

                    return {
                        display: datosFormateados,
                        speak: "Estos son tus datos:"
                    };
                }
                return "No entendí tu selección. Por favor, di '1' para actualizar datos, '2' para generar certificados o '3' para consultar tus datos.";

            case 4:
                if (input.includes('finalizar') || input.includes('4')) {
                    await this.handleFarewell();
                    this.stop();
                    return;
                }
                let updateCase = '';
                if (input.includes('nombre')) updateCase = 'nombre';
                else if (input.includes('telefono') || input.includes('teléfono')) updateCase = 'telefono';
                else if (input.includes('direccion') || input.includes('dirección')) updateCase = 'direccion';
                else if (input.includes('estado civil') || input.includes('estado_civil')) updateCase = 'estado_civil';
                else if (input.includes('género')) updateCase = 'genero';

                if (updateCase) {
                    this.userData.updateCase = updateCase;
                    this.step = 5;
                    return `Por favor, dime el nuevo ${updateCase}:`;
                }
                return "No entendí qué dato deseas actualizar. Por favor, especifica: nombre, teléfono, dirección, estado civil o género, o di '4' para finalizar.";
        
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
        return id.replace(/\D/g, ''); // Elimina cualquier carácter que no sea dígito
    }

    // Función adicional para limpiar entrada en general (nombres, direcciones, etc.)
    cleanInput(input) {
        return input.replace(/[^a-zA-Z0-9\s]/g, '').trim(); // Solo mantiene letras, números y espacios
    }

    validateID(id) {
        const cleanedID = this.cleanID(id);
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
