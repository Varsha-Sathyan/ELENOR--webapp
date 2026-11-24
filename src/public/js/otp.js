// =====================================
// ELENOR OTP VERIFICATION
// =====================================


// OTP INPUTS

const otpInputs = document.querySelectorAll(".otp-input");

const otpForm = document.getElementById("otpForm");

const otpValue = document.getElementById("otpValue");

const otpError = document.getElementById("otpError");


// =====================================
// OTP INPUT HANDLING
// =====================================

otpInputs.forEach((input, index) => {

    // INPUT

    input.addEventListener("input", function () {

        // NUMBERS ONLY

        this.value = this.value.replace(/\D/g, "");

        // MOVE TO NEXT INPUT

        if (this.value && index < otpInputs.length - 1) {

            otpInputs[index + 1].focus();

        }

        // CLEAR ERROR

        otpError.textContent = "";

    });


    // BACKSPACE

    input.addEventListener("keydown", function (event) {

        if (
            event.key === "Backspace" &&
            !this.value &&
            index > 0
        ) {

            otpInputs[index - 1].focus();

        }

    });


    // PASTE OTP

    input.addEventListener("paste", function (event) {

        event.preventDefault();

        const pastedData = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 4);

        pastedData.split("").forEach((digit, i) => {

            if (otpInputs[i]) {

                otpInputs[i].value = digit;

            }

        });

        const nextIndex = Math.min(
            pastedData.length,
            otpInputs.length - 1
        );

        otpInputs[nextIndex].focus();

    });

});


// =====================================
// FORM SUBMISSION
// =====================================

otpForm.addEventListener("submit", function (event) {

    const otp = Array.from(otpInputs)

        .map(input => input.value)

        .join("");

    // CHECK OTP LENGTH

    if (otp.length !== 4) {

        event.preventDefault();

        otpError.textContent =
            "Please enter the complete 4-digit OTP.";

        return;

    }

    // SET HIDDEN OTP VALUE

    otpValue.value = otp;

});


// =====================================
// RESEND COUNTDOWN
// =====================================

const timerElement = document.getElementById("timer");

const resendButton = document.getElementById("resendButton");

const countdownElement = document.getElementById("countdown");

const deadline = Date.now() + (Number(otpForm.dataset.resendSeconds) || 0) * 1000;
function updateTimer() {
 const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
 timerElement.textContent = String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
 countdownElement.style.display = remaining ? 'inline-block' : 'none';
 resendButton.disabled = remaining > 0;
 resendButton.style.display = remaining ? 'none' : 'inline-block';
 otpForm.querySelector('button[type="submit"]').disabled = remaining === 0;
}
updateTimer(); setInterval(updateTimer, 1000);
