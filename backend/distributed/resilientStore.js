import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function upcomingSlots(times) {
  const out = {};
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out[d.toISOString().slice(0, 10)] = times;
  }
  return out;
}

const DEFAULT_DOCTORS = [
  {
    _id: "66c000000000000000000101",
    email: "dr1@gmail.com",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. Rahul Sharma",
    specialization: "Cardiologist",
    experience: "10 years",
    qualifications: "MBBS, MD (Cardiology)",
    location: "Varanasi Heart Institute",
    about: "Experienced heart specialist in preventive cardiology, ECG, and hypertension management.",
    fee: 500,
    availability: "Available",
    schedule: upcomingSlots(["10:00 AM", "10:30 AM", "11:00 AM", "04:00 PM"]),
    success: "98%",
    patients: "5000+",
    rating: 4.8,
  },
  {
    _id: "66c000000000000000000102",
    email: "sarah.j@medicare.test",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. Sarah Johnson",
    specialization: "Cardiologist",
    experience: "9 years",
    qualifications: "MBBS, MD (Cardiology)",
    location: "Heart Institute, Varanasi",
    about: "Heart health, Echo, ECG and preventive cardiology specialist.",
    fee: 750,
    availability: "Available",
    schedule: upcomingSlots(["10:00 AM", "12:00 PM", "04:00 PM"]),
    success: "97%",
    patients: "4k+",
    rating: 4.7,
  },
  {
    _id: "66c000000000000000000103",
    email: "emily.r@medicare.test",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. Emily Rodriguez",
    specialization: "Pediatrician",
    experience: "8 years",
    qualifications: "MBBS, MD (Pediatrics)",
    location: "Child Care Clinic",
    about: "Child specialist for growth, immunization vaccines, and pediatric care.",
    fee: 600,
    availability: "Available",
    schedule: upcomingSlots(["09:30 AM", "11:30 AM", "12:00 PM"]),
    success: "96%",
    patients: "3k+",
    rating: 4.8,
  },
  {
    _id: "66c000000000000000000104",
    email: "david.kim@medicare.test",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. David Kim",
    specialization: "Oncologist",
    experience: "7 years",
    qualifications: "MBBS, DM (Oncology)",
    location: "CancerCare Institute",
    about: "Specialist in early screening, targeted therapy & comprehensive oncology care.",
    fee: 800,
    availability: "Available",
    schedule: upcomingSlots(["10:00 AM", "11:00 AM", "03:00 PM"]),
    success: "92%",
    patients: "2k+",
    rating: 4.6,
  },
  {
    _id: "66c000000000000000000105",
    email: "kabir.m@medicare.test",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. Kabir Malhotra",
    specialization: "Nephrologist",
    experience: "7 years",
    qualifications: "MBBS, DM (Nephrology)",
    location: "Kidney Care Center",
    about: "Kidney function, electrolyte balance, and dialysis care specialist.",
    fee: 700,
    availability: "Available",
    schedule: upcomingSlots(["11:00 AM", "02:00 PM", "04:30 PM"]),
    success: "94%",
    patients: "1.8k+",
    rating: 4.6,
  },
  {
    _id: "66c000000000000000000106",
    email: "rohan.m@medicare.test",
    passwordHash: bcrypt.hashSync("123456", 8),
    name: "Dr. Rohan Mehta",
    specialization: "ENT Specialist",
    experience: "5 years",
    qualifications: "MBBS, MS (ENT)",
    location: "City ENT Clinic",
    about: "Sinus, ear infection, vertigo, tonsils & throat specialist.",
    fee: 600,
    availability: "Available",
    schedule: upcomingSlots(["11:00 AM", "03:00 PM", "05:00 PM"]),
    success: "98%",
    patients: "2.6k+",
    rating: 4.5,
  },
];

const DEFAULT_SERVICES = [
  {
    _id: "66c000000000000000000201",
    name: "Full Body Health Checkup",
    about: "Complete 60+ parameter body diagnostic package including CBC, Lipid Profile, Liver & Kidney Function, Thyroid, X-Ray, and Physician Consultation.",
    shortDescription: "Blood test + X-Ray + Doctor consultation",
    price: 999,
    available: true,
    instructions: ["Come empty stomach (10-12 hrs fasting)", "Carry previous medical reports"],
    slots: upcomingSlots(["08:30 AM", "10:00 AM", "10:30 AM", "02:00 PM"]),
    dates: Object.keys(upcomingSlots(["08:30 AM"])),
  },
  {
    _id: "66c000000000000000000202",
    name: "X-Ray Scan",
    about: "High-definition digital X-Ray imaging with same-day radiologist report.",
    shortDescription: "Fast digital X-Ray reporting",
    price: 499,
    available: true,
    instructions: ["Remove metal jewelry or belts before scan", "Inform technician if pregnant"],
    slots: upcomingSlots(["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"]),
    dates: Object.keys(upcomingSlots(["10:00 AM"])),
  },
  {
    _id: "66c000000000000000000203",
    name: "Blood Pressure & ECG Check",
    about: "Accurate digital blood pressure monitoring and 12-lead resting ECG screening.",
    shortDescription: "Accurate digital BP & heart rhythm check",
    price: 199,
    available: true,
    instructions: ["Sit and rest calmly for 5 minutes prior", "Avoid caffeine 1 hour before test"],
    slots: upcomingSlots(["09:30 AM", "11:00 AM", "01:00 PM", "04:30 PM"]),
    dates: Object.keys(upcomingSlots(["09:30 AM"])),
  },
  {
    _id: "66c000000000000000000204",
    name: "Blood Sugar & HbA1c Test",
    about: "Fasting blood glucose, post-prandial sugar, and 3-month HbA1c diabetes panel.",
    shortDescription: "Fasting & HbA1c diabetes sugar testing",
    price: 249,
    available: true,
    instructions: ["Fasting 8-10 hours if fasting glucose is advised", "Drink plain water only"],
    slots: upcomingSlots(["08:00 AM", "09:00 AM", "10:30 AM", "02:00 PM"]),
    dates: Object.keys(upcomingSlots(["08:00 AM"])),
  },
];

class ResilientFallbackStore {
  constructor() {
    this.doctors = DEFAULT_DOCTORS.map((d) => ({ ...d, createdAt: new Date().toISOString() }));
    this.services = DEFAULT_SERVICES.map((s) => ({ ...s, createdAt: new Date().toISOString() }));
    this.appointments = [];
    this.serviceAppointments = [];
  }

  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export const resilientStore = new ResilientFallbackStore();
