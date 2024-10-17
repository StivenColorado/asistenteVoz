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

    async consultarUsuario(cedula) {
        let cleanedCedula = cedula.trim()
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
        status.className = className;
    }

    appendMessage(message, sender) {
        const chat = document.getElementById('chat');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender;
        messageDiv.textContent = message;
        chat.appendChild(messageDiv);
        chat.scrollTop = chat.scrollHeight;
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
                    return "¿Qué dato deseas actualizar?\n- Nombre\n- Teléfono\n- Correo\n- Fecha de nacimiento";
                }
                if (input.includes('certificado') || input.includes('2')) {
                    return `Generando certificado para ${this.userData.fullData.nombre_completo}...\nTu certificado estará listo en unos momentos.\n¿Necesitas algo más?`;
                }
                return "No entendí tu selección. Por favor, di '1' para actualizar datos o '2' para generar certificados.";

            case 4:
                let updateCase = '';
                if (input.includes('nombre')) updateCase = 'nombre';
                else if (input.includes('telefono') || input.includes('teléfono')) updateCase = 'telefono';
                else if (input.includes('correo')) updateCase = 'correo';
                else if (input.includes('fecha')) updateCase = 'fecha_nacimiento';

                if (updateCase) {
                    this.userData.updateCase = updateCase;
                    this.step = 5;

                    // Manejo especial para actualización de correo
                    if (updateCase === 'correo') {
                        return `Para actualizar tu correo electrónico, te sugiero que lo tengas escrito a mano si no lo recuerdas completamente. Por favor, deletrea tu correo electrónico letra por letra, incluyendo símbolos como arroba (@) y punto (.). ¿Estás listo para deletrear tu correo?`;
                    }

                    // Para fecha de nacimiento
                    if (updateCase === 'fecha_nacimiento') {
                        return `Por favor, dime el día de nacimiento:`;
                    }

                    // Para otros casos (nombre o teléfono)
                    return `Por favor, dime el nuevo ${updateCase}:`;
                }
                return "No entendí qué dato deseas actualizar. Por favor, especifica: nombre, teléfono, correo o fecha de nacimiento.";

            case 5:
                // Si estamos actualizando el correo
                if (this.userData.updateCase === 'correo') {
                    const resultado = await this.actualizarDato(
                        this.userData.updateCase,
                        input,
                        this.userData.id
                    );
                    this.step = 3;

                    if (resultado && resultado.mensaje.includes("correctamente")) {
                        return `Correo electrónico actualizado correctamente. ¿Qué más deseas hacer?\n1. Actualizar otros datos\n2. Generar certificados`;
                    }
                    return "Hubo un error al actualizar el correo. ¿Qué deseas hacer?\n1. Intentar de nuevo\n2. Generar certificados";
                }

                // Si estamos actualizando la fecha de nacimiento
                if (this.userData.updateCase === 'fecha_nacimiento') {
                    if (!this.userData.birthdayDay) {
                        this.userData.birthdayDay = input;
                        return `Gracias. Ahora, por favor, dime el mes de nacimiento (en números):`;
                    }

                    if (!this.userData.birthdayMonth) {
                        this.userData.birthdayMonth = input;
                        return `Perfecto. Finalmente, por favor, dime el año de nacimiento:`;
                    }

                    if (this.userData.birthdayMonth && !this.userData.birthdayYear) {
                        this.userData.birthdayYear = input;
                        const formattedDate = `${this.userData.birthdayYear}-${this.userData.birthdayMonth}-${this.userData.birthdayDay}`;
                        const resultado = await this.actualizarDato(
                            this.userData.updateCase,
                            formattedDate,
                            this.userData.id
                        );
                        this.step = 3;

                        // Reiniciamos los datos de cumpleaños
                        this.userData.birthdayDay = null;
                        this.userData.birthdayMonth = null;
                        this.userData.birthdayYear = null;

                        if (resultado && resultado.mensaje.includes("correctamente")) {
                            return `Fecha de nacimiento actualizada correctamente. ¿Qué más deseas hacer?\n1. Actualizar otros datos\n2. Generar certificados`;
                        }
                        return "Hubo un error al actualizar la fecha. ¿Qué deseas hacer?\n1. Intentar de nuevo\n2. Generar certificados";
                    }
                }

                // Para otros casos (nombre o teléfono)
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
        return /^\d{8,10}$/.test(cleanedID);
    }

    welcomeMessage() {
        const initialMessage = "¡Bienvenido al asistente virtual! En que puedo ayudarte hoy?";
        this.appendMessage(initialMessage, 'bot');
        this.speak(initialMessage);
    }
}

window.onload = () => {
    window.kioskAssistant = new KioskAssistant();
};