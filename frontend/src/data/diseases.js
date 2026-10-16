// Disease data shared across components
export const diseases = [
  {
    id: "coronary-artery-disease",
    name: "Coronary Artery Disease",
    shortName: "CAD",
    image: "/images/coronary.png",
    description:
      "Coronary Artery Disease occurs when major blood vessels supplying the heart become damaged or blocked due to plaque buildup. This condition can lead to chest pain (angina), heart attack, or other complications. The buildup of plaque narrows the arteries, reducing blood flow to the heart muscle.",
    causes: ["High cholesterol", "Smoking", "High blood pressure", "Diabetes", "Obesity", "Lack of physical activity"],
    params: ["Age", "Cholesterol levels", "Blood pressure", "ECG", "BMI", "Smoking status"],
    symptoms: ["Chest pain (angina)", "Shortness of breath", "Heart attack", "Fatigue", "Weakness"],
    prevention: [
      "Maintain a healthy diet low in saturated fats",
      "Regular exercise",
      "Quit smoking",
      "Control blood pressure and cholesterol",
      "Manage diabetes",
    ],
    treatment: ["Lifestyle changes", "Medications", "Angioplasty", "Coronary artery bypass surgery"],
  },
  {
    id: "heart-failure",
    name: "Heart Failure",
    shortName: "Heart Failure",
    image: "/images/heart_failure.png",
    description:
      "Heart failure occurs when the heart cannot pump blood effectively, leading to fatigue and fluid buildup. This condition means the heart is unable to meet the body's demand for blood and oxygen. It's a chronic condition that can worsen over time, but with proper treatment, symptoms can be managed.",
    causes: ["Diabetes", "Obesity", "High blood pressure", "Coronary artery disease", "Heart attack", "Valve problems"],
    params: ["Age", "Ejection fraction", "Serum creatinine", "BP", "Sodium levels", "Blood pressure"],
    symptoms: ["Shortness of breath", "Fatigue", "Swelling in legs and ankles", "Rapid heartbeat", "Persistent cough"],
    prevention: [
      "Control high blood pressure",
      "Manage diabetes",
      "Maintain healthy weight",
      "Limit alcohol intake",
      "Regular exercise",
    ],
    treatment: ["Medications", "Lifestyle changes", "Medical devices", "Heart transplant in severe cases"],
  },
  {
    id: "heart-attack",
    name: "Heart Attack",
    shortName: "Heart Attack",
    image: "/images/heart_attack.png",
    description:
      "A heart attack (myocardial infarction) happens when blood flow to a part of the heart is blocked, usually by a clot in the coronary arteries. This blockage prevents oxygen-rich blood from reaching the heart muscle, causing damage or death of heart tissue. Immediate medical attention is crucial.",
    causes: ["Blocked arteries", "Smoking", "Stress", "High blood pressure", "High cholesterol", "Diabetes"],
    params: ["ECG results", "Cholesterol levels", "Blood sugar", "Troponin levels", "CK-MB", "Blood pressure"],
    symptoms: ["Chest pain or discomfort", "Shortness of breath", "Nausea", "Cold sweat", "Lightheadedness", "Pain in arm or jaw"],
    prevention: [
      "Don't smoke",
      "Control blood pressure and cholesterol",
      "Exercise regularly",
      "Maintain healthy weight",
      "Manage stress",
    ],
    treatment: ["Immediate medical care", "Medications to dissolve clots", "Angioplasty", "Stent placement", "Bypass surgery"],
  },
  {
    id: "stroke",
    name: "Stroke",
    shortName: "Stroke",
    image: "/images/stroke.png",
    description:
      "A stroke occurs when blood supply to part of the brain is interrupted or reduced, depriving brain tissue of oxygen and nutrients. Brain cells begin to die within minutes. Stroke is a medical emergency that requires immediate treatment to minimize brain damage and potential complications.",
    causes: ["Blood clots", "High BP", "Unhealthy lifestyle", "Heart disease", "Diabetes", "High cholesterol", "Smoking"],
    params: ["BP", "Glucose levels", "Age", "Smoking status", "BMI", "Cholesterol levels"],
    symptoms: [
      "Sudden numbness or weakness in face, arm, or leg",
      "Confusion or trouble speaking",
      "Vision problems",
      "Difficulty walking",
      "Severe headache",
    ],
    prevention: [
      "Control high blood pressure",
      "Manage diabetes",
      "Quit smoking",
      "Maintain healthy weight",
      "Exercise regularly",
      "Limit alcohol consumption",
    ],
    treatment: ["Emergency medical care", "Clot-busting medications", "Surgical procedures", "Rehabilitation therapy"],
  },
  {
    id: "hypertension",
    name: "Hypertensive Heart Disease",
    shortName: "Hypertension",
    image: "/images/hypertension.png",
    description:
      "Hypertensive Heart Disease develops due to long-term high blood pressure, causing the heart to work harder and weaken over time. The increased pressure can lead to thickening of the heart muscle, narrowing of arteries, and increased risk of other cardiovascular conditions. Early detection and management are essential.",
    causes: ["Prolonged high BP", "Obesity", "Smoking", "Lack of exercise", "High salt intake", "Stress", "Genetics"],
    params: ["BP", "BMI", "Family history", "Age", "Cholesterol levels", "Blood glucose"],
    symptoms: [
      "Often no symptoms (silent condition)",
      "Headaches",
      "Shortness of breath",
      "Chest pain",
      "Dizziness",
      "Vision problems",
    ],
    prevention: [
      "Monitor blood pressure regularly",
      "Reduce salt intake",
      "Maintain healthy weight",
      "Exercise regularly",
      "Limit alcohol",
      "Manage stress",
    ],
    treatment: ["Blood pressure medications", "Lifestyle modifications", "Dietary changes", "Regular monitoring"],
  },
];

// Helper function to get disease by ID
export const getDiseaseById = (id) => {
  return diseases.find((disease) => disease.id === id);
};

// Helper function to get disease by name
export const getDiseaseByName = (name) => {
  return diseases.find((disease) => disease.name === name || disease.shortName === name);
};

