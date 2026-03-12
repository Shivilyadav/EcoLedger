import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

const {
  SMTP_HOST,
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM = SMTP_USER || "no-reply@example.com",
  EMAIL_SERVICE_API_KEY
} = process.env;

function buildTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP config missing. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD.");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
  });
}

function checkApiKey(req, res, next) {
  if (!EMAIL_SERVICE_API_KEY) return next();
  const provided = req.header("x-api-key");
  if (provided !== EMAIL_SERVICE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.post("/send-otp", checkApiKey, async (req, res) => {
  const { to, otp, ttlMinutes = 5 } = req.body || {};
  if (!to || !otp) return res.status(400).json({ error: "Missing to or otp" });

  try {
    const transporter = buildTransport();
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: "Your EcoLedger OTP",
      text: `Your one-time code is ${otp}. It expires in ${ttlMinutes} minutes.`
    });
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/send-notification", checkApiKey, async (req, res) => {
  const { to, subject, text } = req.body || {};
  if (!to || !subject || !text) return res.status(400).json({ error: "Missing to, subject, or text" });
  try {
    const transporter = buildTransport();
    await transporter.sendMail({ from: SMTP_FROM, to, subject, text });
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

const port = process.env.EMAIL_SERVICE_PORT || 4010;
app.listen(port, () => {
  console.log(`Email service listening on port ${port}`);
});
