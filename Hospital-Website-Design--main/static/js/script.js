// === script.js for Hospital Chatbot with Appointment Booking ===

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
} else {
    console.warn("SpeechRecognition API not supported in this browser.");
}

let isRecognizing = false;
let bookingStep = 0;
let bookingDetails = {};

document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chat-box");
    const micButton = document.getElementById("mic-btn");
    const sendButton = document.getElementById("send-button");
    const inputField = document.getElementById("user-input");

    // Welcome message
    if (chatBox) {
        const welcomeMessage = "Welcome to MedCare! I will help you book your appointment.";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${welcomeMessage}</div>`;
        speakBotMessage(welcomeMessage);
    }

    if (micButton && recognition) {
        micButton.addEventListener("click", () => {
            try {
                recognition.start();
                isRecognizing = true;
            } catch (e) {
                console.error("Speech recognition error:", e);
                alert("🎤 Microphone not accessible. Please allow mic access in your browser settings.");
            }
        });
    }

    if (recognition) {
        recognition.onstart = () => {
            isRecognizing = true;
            console.log("🎤 Voice recognition started");
        };

        recognition.onresult = (event) => {
            const voiceText = event.results[0][0].transcript;
            inputField.value = voiceText;
            sendMessage();
        };

        recognition.onend = () => {
            isRecognizing = false;
            console.log("🎤 Voice recognition ended");
        };

        recognition.onerror = (event) => {
            console.error("🎤 Recognition error:", event.error);
            alert("Microphone access error: " + event.error);
            isRecognizing = false;
        };
    }
});
function speakBotMessage(message) {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = 'en-US';
    synth.speak(utter);
}

function isSlotFull(doctor, date, time) {
    let storedData = JSON.parse(localStorage.getItem("appointmentData")) || [];
    let count = storedData.filter(app =>
        app.Doctor === doctor && app.Date === date && app.Time === time
    ).length;
    return count >= 10;
}

async function sendMessage() {
    const input = document.getElementById("user-input");
    const userMessage = input.value.trim();
    if (!userMessage) return;

    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<div><strong>You:</strong> ${userMessage}</div>`;
    input.value = "";

    // Update/reschedule start
    if (["update", "change", "reschedule"].some(w => userMessage.toLowerCase().includes(w))) {
        const reply = "Please enter your Appointment ID to update your appointment.";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        bookingStep = -2;
        return;
    }

    // Handle appointment ID input
    if (bookingStep === -2) {
        const appointmentID = `appointment_${userMessage}`;
        const appointment = JSON.parse(localStorage.getItem(appointmentID));
        if (appointment) {
            bookingDetails = appointment;
            const reply = "Got it! Please enter the new date (YYYY-MM-DD).";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            bookingStep = -3;
        } else {
            const reply = `❌ No appointment found with ID: ${userMessage}`;
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            bookingStep = 0;
        }
        return;
    }

    if (bookingStep === -3) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(userMessage)) {
            const reply = "❌ Invalid date format. Use YYYY-MM-DD.";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            return;
        }
        bookingDetails.date = userMessage;
        const reply = "Please enter the new time (HH:MM AM/PM).";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        bookingStep = -4;
        return;
    }

    if (bookingStep === -4) {
        if (!/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(userMessage)) {
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ❌ Invalid time format. Use HH:MM AM/PM.</div>`;
            return;
        }
        bookingDetails.time = userMessage;
        localStorage.setItem(`appointment_${bookingDetails.id}`, JSON.stringify(bookingDetails));
        saveToExcel(bookingDetails);
        const reply = `
            ✅ Your appointment has been updated!<br>
            <b>Name:</b> ${bookingDetails.name}<br>
            <b>New Date:</b> ${bookingDetails.date}<br>
            <b>New Time:</b> ${bookingDetails.time}<br>
            <b>Doctor:</b> ${bookingDetails.doctor}<br>
            <b>Email:</b> ${bookingDetails.email}<br>
            <b>Appointment ID:</b> ${bookingDetails.id}</div>
        `;
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        bookingStep = 0;
        return;
    }
    if (userMessage.toLowerCase().includes("generate") && userMessage.toLowerCase().includes("qr code")) {
        if (bookingDetails && bookingDetails.id) {
            generateQRCode(bookingDetails);
            const reply = `✅ Here is your QR Code for Appointment ID: ${bookingDetails.id}`;
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
        } else {
            const reply = `❌ I need a valid appointment to generate a QR code.`;
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
        }
        return;
    }

    // Start new booking
    if (userMessage.toLowerCase().includes("book") && userMessage.toLowerCase().includes("appointment")) {
        const reply = "Sure! What's your full name?";
        bookingStep = 1;
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        return;
    }

    if (bookingStep === 1) {
        bookingDetails.name = userMessage;
        bookingStep++;
        const reply = "Please enter the appointment date (YYYY-MM-DD).";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        return;
    } else if (bookingStep === 2) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(userMessage)) {
            const reply = "❌ Invalid date format. Use YYYY-MM-DD.";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            return;
        }
        bookingDetails.date = userMessage;
        bookingStep++;
        const reply = "Please enter the time slot (HH:MM AM/PM).";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        return;
    } else if (bookingStep === 3) {
        if (!/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(userMessage)) {
            const reply = "❌ Invalid time format! Please enter in HH:MM AM/PM format.";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            return;
        }
        bookingDetails.time = userMessage;
        bookingStep++;
        const reply = "Please enter the doctor's name.";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        return;
    } else if (bookingStep === 4) {
        bookingDetails.doctor = userMessage;
        bookingStep++;
        const reply = "Please enter your email address.";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
    } else if (bookingStep === 5) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userMessage)) {
            const reply = "❌ Invalid email format! Please enter a valid email.";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            return;
        }

        bookingDetails.email = userMessage;
        // Check if slot is full
        if (isSlotFull(bookingDetails.doctor, bookingDetails.date, bookingDetails.time)) {
            const reply = "❌ Sorry, that slot is already full. Please choose another time or doctor.";
            chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
            speakBotMessage(reply);
            bookingStep = 0;
            return;
        }
        bookingStep = 0;
        const appointmentID = Math.floor(Math.random() * 10000);
        bookingDetails.id = appointmentID;

        localStorage.setItem(`appointment_${appointmentID}`, JSON.stringify(bookingDetails));
        saveToExcel(bookingDetails);

        const reply= ` ✅ Your appointment has been booked!<br>
            <b>Name:</b> ${bookingDetails.name}<br>
            <b>Date:</b> ${bookingDetails.date}<br>
            <b>Time Slot:</b> ${bookingDetails.time}<br>
            <b>Doctor:</b> ${bookingDetails.doctor}<br>
            <b>Email:</b> ${bookingDetails.email}<br>
            <b>Appointment ID:</b> ${appointmentID}</div>
        `;
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
        return;
    }

    // Fallback to GPT
    try {
        const response = await fetch("/api/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage })
        });
        const data = await response.json();
        const reply = data.reply || data.error;
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
    } catch (error) {
        const reply = "❌ Unable to connect to server.";
        chatBox.innerHTML += `<div><strong>Doctor Klaus:</strong> ${reply}</div>`;
        speakBotMessage(reply);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

function saveToExcel(appointment) {
    let storedData = JSON.parse(localStorage.getItem("appointmentData")) || [];
    const existingIndex = storedData.findIndex(item => item.ID === appointment.id);

    const newEntry = {
        ID: appointment.id,
        Name: appointment.name,
        Date: appointment.date,
        Time: appointment.time,
        Doctor: appointment.doctor,
        Email: appointment.email
    };

    if (existingIndex !== -1) {
        storedData[existingIndex] = newEntry;
    } else {
        storedData.push(newEntry);
    }

    localStorage.setItem("appointmentData", JSON.stringify(storedData));

    const ws = XLSX.utils.json_to_sheet(storedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appointments");
    XLSX.writeFile(wb, "Appointments.xlsx");
}
function generateQRCode(appointment) {
    const qrCodeContainer = document.getElementById("qr-code");
    qrCodeContainer.innerHTML = "";

    if (!appointment || !appointment.id) {
        qrCodeContainer.innerHTML = "<p>❌ No valid appointment found.</p>";
        qrCodeContainer.style.display = "block";
        return;
    }

    const qrData = `Appointment ID: ${appointment.id}\nName: ${appointment.name}\nDate: ${appointment.date}\nTime: ${appointment.time}\nDoctor: ${appointment.doctor}\nEmail: ${appointment.email}`;

    new QRCode(qrCodeContainer, {
        text: qrData,
        width: 200,
        height: 200
    });

    qrCodeContainer.style.display = "block";
}