import os
import re
import json
import logging
from app.config import settings

logger = logging.getLogger("medsphere.nlp.clinical_nlp")

# Common medical entities list for fallback matching
DISEASE_KEYWORDS = [
    "obesity", "prediabetes", "type 2 diabetes", "diabetes", "hypertension", 
    "hyperlipidemia", "chronic kidney disease", "ckd", "coronary artery disease", 
    "cad", "asthma", "copd", "anemia", "depression", "heart failure", "atrial fibrillation"
]

MEDICATION_KEYWORDS = [
    "metformin", "losartan", "rosuvastatin", "lisinopril", "atorvastatin", 
    "amlodipine", "albuterol", "insulin", "gabapentin", "hydrochlorothiazide", 
    "simvastatin", "empagliflozin", "sitagliptin", "glipizide", "carvedilol"
]

LAB_KEYWORDS = [
    "hba1c", "ldl", "hdl", "triglycerides", "creatinine", "egfr", "tsh", 
    "hemoglobin", "wbc", "platelets", "blood pressure", "systolic bp", "diastolic bp"
]

def extract_entities_fallback(text: str) -> dict:
    """
    Fallback clinical entity parser using regex and keywords.
    Guarantees extraction of standard test metrics and medications.
    """
    text_lower = text.lower()
    entities = {
        "diseases": [],
        "medications": [],
        "labs": [],
        "doctors": []
    }
    
    # 1. Extract Diseases
    found_diseases = set()
    for disease in DISEASE_KEYWORDS:
        # Match word boundaries
        if re.search(r'\b' + re.escape(disease) + r'\b', text_lower):
            # Format nicely
            name = disease.title().replace("Ckd", "CKD").replace("Cad", "CAD")
            found_diseases.add(name)
    
    # Also look for any capitalized words preceding "has" or "diagnosed with"
    # (just in case, but keyword search covers the main ones)
    for d in found_diseases:
        entities["diseases"].append({
            "name": d,
            "severity": "Moderate" if "severe" not in text_lower else "Severe"
        })
        
    # 2. Extract Medications (including dose)
    # Match patterns like: "Losartan 50mg", "Metformin 1000 mg", "Rosuvastatin 10mg"
    med_pattern = re.compile(
        r'\b(' + '|'.join(re.escape(m) for m in MEDICATION_KEYWORDS) + r')\b(?:\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|units|iu)))?',
        re.IGNORECASE
    )
    
    found_meds = {}
    for match in med_pattern.finditer(text):
        med_name = match.group(1).title()
        med_dose = match.group(2) if match.group(2) else "Unknown"
        # Avoid duplicate medications by choosing one with dose if available
        if med_name not in found_meds or found_meds[med_name] == "Unknown":
            found_meds[med_name] = med_dose
            
    for name, dose in found_meds.items():
        entities["medications"].append({
            "name": name,
            "dose": dose
        })
        
    # 3. Extract Labs (test name, value, unit)
    # Match patterns like: "HbA1c is 9.7%", "LDL: 120", "Creatinine: 1.2 mg/dL"
    # Matches: HbA1c is 9.7%, HbA1c of 9.7%, HbA1c: 9.7%
    lab_pattern = re.compile(
        r'\b(' + '|'.join(re.escape(l) for l in LAB_KEYWORDS) + r')\b\s*(?:is|of|level|value|result)?\s*(?::|=|\bis\b)?\s*(\d+(?:\.\d+)?)\s*(%|mg/dl|g/dl|mmol/l|meq/l|uu/ml|uIu/ml)?',
        re.IGNORECASE
    )
    
    for match in lab_pattern.finditer(text):
        test_name = match.group(1)
        # Normalize lab test name casing
        if test_name.lower() == "hba1c":
            test_name = "HbA1c"
        elif test_name.lower() == "ldl":
            test_name = "LDL"
        elif test_name.lower() == "hdl":
            test_name = "HDL"
        elif test_name.lower() == "egfr":
            test_name = "eGFR"
        else:
            test_name = test_name.title()
            
        val_str = match.group(2)
        unit_str = match.group(3) if match.group(3) else "%" if test_name == "HbA1c" else "mg/dL"
        
        entities["labs"].append({
            "test_name": test_name,
            "value": val_str,
            "unit": unit_str
        })
        
    # 4. Extract Doctors
    # Match patterns like "Dr. Wilson", "Dr. Sarah Taylor", "Doctor Smith"
    doc_pattern = re.compile(r'\b(?:Dr\.|Dr|Doctor)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)')
    for match in doc_pattern.finditer(text):
        entities["doctors"].append(f"Dr. {match.group(1)}")
        
    # De-duplicate doctors list
    entities["doctors"] = list(set(entities["doctors"]))
    
    return entities

def extract_clinical_entities(raw_text: str) -> dict:
    """
    Extracts clinical entities (diseases, medications, labs, doctors) from clinical notes.
    Attempts LLM processing via OpenAI and falls back to regex-based extraction.
    """
    if not raw_text:
        return {"diseases": [], "medications": [], "labs": [], "doctors": []}
        
    # Attempt LLM extraction if API key seems valid and not placeholder
    if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-or-placeholder"):
        try:
            import openai
            # Configure OpenAI / OpenRouter client
            client = openai.OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            
            prompt = f"""You are an expert Clinical NLP system. Extract clinical entities from the patient note below.
Return a valid JSON object with the following schema:
{{
  "diseases": [
    {{"name": "Disease Name", "severity": "Mild/Moderate/Severe"}}
  ],
  "medications": [
    {{"name": "Medication Name", "dose": "Dose e.g. 50mg or Unknown"}}
  ],
  "labs": [
    {{"test_name": "Test Name e.g. HbA1c", "value": "Numeric value e.g. 9.7", "unit": "Unit e.g. % or mg/dL"}}
  ],
  "doctors": ["Dr. Name"]
}}

Note:
{raw_text}

JSON response:"""

            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            res_content = response.choices[0].message.content
            entities = json.loads(res_content)
            logger.info("Successfully extracted clinical entities via OpenAI.")
            
            # Basic validation of expected keys
            for key in ["diseases", "medications", "labs", "doctors"]:
                if key not in entities:
                    entities[key] = []
            return entities
            
        except Exception as e:
            logger.warning(f"OpenAI entity extraction failed ({e}). Falling back to regex parser.")
            
    # Fallback to local heuristic regex extractor
    return extract_entities_fallback(raw_text)
