const url = "http://localhost/";
class KioskAssistant {
    static fieldMappings = {
        nombre: "nombre_completo",
        telefono: "numero_telefono",
        direccion: "direccion",
        "estado civil": "estado_civil",
        "correo electrónico": "correo_electronico",
        "fecha de nacimiento": "fecha_nacimiento",
        genero: "genero",
        // Añade otros campos que necesites
    };
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.selectedVoice = 'Paulina (es-MX)';
        this.step = 0;
        this.lastUpdateAttempt = null;
        this.pendingUpdate = null;
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

            const result = await response.json();
            console.log('Respuesta de actualización:', result);

            // Si la respuesta tiene un status o success, úsalo
            if (result.status || result.success) {
                return result;
            }

            // Si no hay indicador de éxito/fallo pero hay datos, asumimos éxito
            if (result) {
                return {
                    success: true,
                    message: 'Dato actualizado correctamente'
                };
            }

            return null;
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
        this.changeVoice("Paulina");
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

        // Clases base para los mensajes
        const baseClasses = "w-full max-w-[80%] rounded-lg p-4 mb-4 shadow-lg text-lg";

        if (sender === 'user') {
            messageDiv.className = `${baseClasses} ml-auto bg-green-600 text-white`;
        } else {
            messageDiv.className = `${baseClasses} mr-auto bg-gray-700 text-white`;
        }

        // Función auxiliar para crear listas a partir del texto
        const createListFromText = (text) => {
            const listContainer = document.createElement('div');
            listContainer.className = "space-y-2";

            // Divide el texto en líneas y procesa cada una
            const lines = text.split('\n').filter(line => line.trim());

            lines.forEach(line => {
                const listItem = document.createElement('div');

                // Verifica si la línea comienza con un número o un guion
                if (line.match(/^\d+\./) || line.match(/^-/)) {
                    listItem.className = "flex items-center space-x-2 py-1 hover:bg-gray-600 rounded-md px-2 transition-colors duration-200";

                    // Si es una opción numerada, aplica estilos especiales
                    if (line.match(/^\d+\./)) {
                        const [number, ...rest] = line.split('.');
                        const numberSpan = document.createElement('span');
                        numberSpan.className = "flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold text-sm";
                        numberSpan.textContent = number;

                        const textSpan = document.createElement('span');
                        textSpan.className = "flex-grow";
                        textSpan.textContent = rest.join('.').trim();

                        listItem.appendChild(numberSpan);
                        listItem.appendChild(textSpan);
                    } else {
                        // Si es una opción con guion, usa un punto como marcador
                        const bullet = document.createElement('span');
                        bullet.className = "flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2";

                        const textSpan = document.createElement('span');
                        textSpan.className = "flex-grow";
                        textSpan.textContent = line.replace('-', '').trim();

                        listItem.appendChild(bullet);
                        listItem.appendChild(textSpan);
                    }
                } else {
                    // Si es texto normal, solo añade el contenido
                    listItem.className = "text-white";
                    listItem.textContent = line;
                }

                listContainer.appendChild(listItem);
            });

            return listContainer;
        };

        // Maneja diferentes tipos de contenido
        if (action === 'consultar_datos' && message.includes("Nombre Completo:")) {
            // Mantiene el formato existente para los datos del usuario
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
        } else if (message.includes('\n') && (message.includes('1.') || message.includes('-'))) {
            // Si el mensaje contiene saltos de línea y números o guiones, créalo como lista
            messageDiv.appendChild(createListFromText(message));
        } else {
            // Mensaje normal con efecto de escritura
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

            utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'Paulina (es-MX)';
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
        const normalizedInput = this.normalizeText(input.toLowerCase().trim());

        if (this.isGreeting(normalizedInput)) {
            return this.handleGreeting();
        }

        switch (this.step) {
            case 0:
                this.step++;
                return "Por favor, dime tu número de cédula.";
            //TODO:arreglar
            case 1:
                const cleanedInput = this.cleanID(input);
                if (this.validateID(cleanedInput)) {
                    const userData = await this.consultarUsuario(cleanedInput);
                    console.log(userData);

                    if (userData.mensaje !== 'Cliente no encontrado.') {

                        this.userData.fullData = userData;
                        this.userData.id = userData.numero_documento;
                        this.step = 3;
                        return {
                            display: "¿Qué deseas hacer?\n1. Actualizar mis datos\n2. Generar certificados\n3. Consultar mis datos",
                            speak: `Bienvenido ${userData.nombre_completo}, ¿qué deseas hacer? Puedes actualizar tus datos, generar certificados o consultar tus datos.`
                        };
                    } else {
                        // Si el usuario no existe en la DB, mostrar mensaje y detener flujo
                        this.step = 0; // Reiniciar el paso para solicitar cédula nuevamente
                        return {
                            display: "No se encontró el usuario. Por favor, verifica tu número de cédula o intenta registrarte.",
                            speak: "No se encontró el usuario. Por favor, verifica tu número de cédula o intenta registrarte."
                        };
                    }
                }
                return "Por favor, proporciona un número de cédula válido (entre 8 y 10 dígitos).";


            case 3:
                return await this.handleMainMenuChoice(normalizedInput);

            case 4:
                if (this.isFinalizarComando(normalizedInput)) {
                    return await this.handleFarewell();
                }

                const updateCase = this.determineUpdateCase(normalizedInput);
                if (updateCase) {
                    this.userData.updateCase = updateCase;
                    console.log(this.userData);
                    console.log(updateCase);

                    this.step = 5;
                    const actualField = KioskAssistant.fieldMappings[updateCase];
                    const currentValue = this.userData.fullData[actualField] || 'No disponible';
                    console.log(`despues de la constante currentValue ${currentValue}`);

                    return {
                        display: `Tu ${this.getFieldDisplayName(updateCase)} actual es: ${currentValue}\nPor favor, dime el nuevo ${this.getFieldDisplayName(updateCase)}:`,
                        speak: `Tu ${this.getFieldDisplayName(updateCase)} actual es ${currentValue}. Por favor, dime el nuevo ${this.getFieldDisplayName(updateCase)}`
                    };
                }

                return this.showUpdateMenu();

            case 5:
                if (!this.userData.updateCase) {
                    this.step = 4;
                    return "Ha ocurrido un error. Por favor, selecciona nuevamente qué dato deseas actualizar.";
                }

                const currentField = KioskAssistant.fieldMappings[this.userData.updateCase];
                const currentValue = this.userData.fullData[currentField];
                if (currentValue === undefined) {
                    return "No se pudo encontrar el dato actual. Por favor, selecciona nuevamente qué dato deseas actualizar.";
                }
                try {
                    const updateResult = await this.actualizarDato(
                        currentField,
                        normalizedInput,
                        this.userData.id
                    );
                    if (updateResult) {
                        // Actualizar el userData.fullData con el nuevo valor
                        this.userData.fullData[currentField] = normalizedInput;
                        this.step = 4;
                        return {
                            display: "Dato actualizado correctamente.\n" + this.showUpdateMenu().display,
                            speak: "El dato ha sido actualizado correctamente. ¿Deseas actualizar otro dato?"
                        };
                    } else {
                        return "No se pudo actualizar el dato. Por favor, intenta nuevamente.";
                    }
                } catch (error) {
                    console.error('Error en la actualización:', error);
                    return "Hubo un error al procesar la actualización. Por favor, intenta nuevamente.";
                }
            default:
                return "Lo siento, no pude procesar tu solicitud. ¿Podrías intentarlo de nuevo?";
        }
    }
    async handleMainMenuChoice(input) {
        if (input.includes('actualizar') || input.includes('1')) {
            this.step = 4;
            return "¿Qué dato deseas actualizar?\n- Nombre\n- Numero celular\n- Dirección\n- Estado civil\n- Género\n- Finalizar proceso";
        }

        if (input.includes('certificado') || input.includes('2')) {
            const result = await this.generateCertificate(this.userData.id);
            if (result.success) {
                return `${result.message}\nTu certificado se está descargando automáticamente.\n¿Necesitas algo más?\n1. Actualizar datos\n2. Generar otro certificado\n3. Consultar mis datos`;
            }
            return `${result.message}\n¿Qué deseas hacer?\n1. Actualizar datos\n2. Intentar generar el certificado nuevamente\n3. Consultar mis datos`;
        }

        if (input.includes('consultar') || input.includes('3')) {
            return this.formatUserData();
        }

        return "Por favor, selecciona una opción válida: 1 para actualizar datos, 2 para certificados, o 3 para consultar datos.";
    }

    formatUserData() {
        const userData = this.userData.fullData;
        const datosFormateados = `
        Nombre Completo: ${userData.nombre_completo}
        Número de Documento: ${userData.numero_documento}
        Fecha de Nacimiento: ${userData.fecha_nacimiento}
        Dirección: ${userData.direccion}
        Número de celular: ${userData.numero_telefono}
        Estado Civil: ${userData.estado_civil}
        Género: ${userData.genero}
        Correo Electrónico: ${userData.correo_electronico}
        Departamento: ${userData.departamento}
        Ciudad: ${userData.ciudad}`;

        const menuOpciones = "¿Qué más deseas hacer?\n1. Actualizar datos\n2. Generar certificados\n3. Consultar mis datos nuevamente";

        return {
            display: datosFormateados,
            speak: "Estos son tus datos. " + menuOpciones
        };
    }
    showUpdateMenu() {
        const userData = this.userData.fullData;
        console.log(userData);

        const menuOptions = "¿Qué dato deseas actualizar?\n\n" +
            "1. Nombre\n" +
            "2. Celular\n" +
            "3. Dirección\n" +
            "4. Estado Civil\n" +
            "5. Género\n" +
            "6. Finalizar proceso\n\n" +
            "Datos actuales:\n" +
            `Nombre: ${userData.nombre_completo}\n` +
            `Celular: ${userData.numero_telefono || 'No disponible'}\n` +
            `Dirección: ${userData.direccion || 'No disponible'}\n` +
            `Estado Civil: ${userData.estado_civil || 'No disponible'}\n` +
            `Género: ${userData.genero || 'No disponible'}`;

        return {
            display: menuOptions,
            speak: "¿Qué dato deseas actualizar? Te muestro tus datos actuales en pantalla."
        };
    }
    determineUpdateCase(input) {
        const normalizedInput = this.normalizeText(input.toLowerCase());

        const updateMap = {
            'nombre_completo': ['nombre', '1', 'primero', 'uno'],
            'numero_telefono': ['celular', 'número de celular', 'número de celular', '2', 'segundo', 'dos'],
            'direccion': ['direccion', 'dirección', '3', 'tercero', 'tres'],
            'estado_civil': ['estado civil', 'estadocivil', 'estado', '4', 'cuarto', 'cuatro'],
            'genero': ['genero', 'género', '5', 'quinto', 'cinco']
        };

        for (const [key, variants] of Object.entries(updateMap)) {
            if (variants.some(variant => normalizedInput.includes(variant))) {
                return key;
            }
        }
        return null;
    }


    normalizeText(text) {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }
    determineUpdateCase(input) {
        const updateMap = {
            nombre: ['nombre', '1', 'primero', 'uno'],
            telefono: ['telefono', 'teléfono', 'celular', '2', 'segundo', 'dos'],
            direccion: ['direccion', 'direccíon', 'direccín', 'direccin', '3', 'tercero', 'tres'],
            estado_civil: ['estado civil', 'estadocivil', 'estado', '4', 'cuarto', 'cuatro'],
            genero: ['genero', 'género', '5', 'quinto', 'cinco']
        };

        for (const [key, variants] of Object.entries(updateMap)) {
            if (variants.some(variant => input.includes(variant))) {
                return key;
            }
        }
        return null;
    }
    // Función para verificar si es comando de finalización
    isFinalizarComando(input) {
        const finalizarVariants = ['finalizar', 'terminar', 'salir', '6', 'sexto', 'seis', 'fin', 'gracias', 'chao', 'adios'];
        const normalizedInput = this.normalizeText(input.toLowerCase());
        return finalizarVariants.some(variant => normalizedInput.includes(variant));
    }
    // Función para obtener el nombre de visualización del campo
    getFieldDisplayName(updateCase) {
        const displayNames = {
            'nombre_completo': 'nombre',
            'numero_telefono': 'número de celular',
            'direccion': 'dirección',
            'estado_civil': 'estado civil',
            'genero': 'género'
        };
        return displayNames[updateCase] || updateCase;
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
